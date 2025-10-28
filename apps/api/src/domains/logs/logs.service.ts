import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../../utils/logger';
import prisma from '../../config/database';
import { ParsedLogEntry, LogFilterOptions, LogStatistics } from './logs.types';
import { parseAccessLogLine, parseErrorLogLine, parseModSecLogLine } from './services/log-parser.service';

const NGINX_ACCESS_LOG = '/var/log/nginx/access.log';
const NGINX_ERROR_LOG = '/var/log/nginx/error.log';
const MODSEC_AUDIT_LOG = '/var/log/modsec_audit.log';
const NGINX_LOG_DIR = '/var/log/nginx';

// Security constants
const MAX_LINES_PER_FILE = 1000;
const MAX_CONCURRENT_FILES = 5;
const ALLOWED_LOG_DIR = path.resolve(NGINX_LOG_DIR);

/**
 * Validate and sanitize domain name to prevent path traversal
 */
function sanitizeDomain(domain: string): string | null {
  if (!domain || typeof domain !== 'string') {
    return null;
  }

  // Remove any path traversal attempts
  const cleaned = domain.trim().replace(/[^a-zA-Z0-9.-]/g, '');
  
  // Validate domain format
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!domainRegex.test(cleaned) || cleaned.length > 253) {
    return null;
  }

  return cleaned;
}

/**
 * Validate file path is within allowed directory
 */
function isPathSafe(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  return resolvedPath.startsWith(ALLOWED_LOG_DIR);
}

/**
 * Safely escape string for shell command (defense in depth)
 */
function escapeShellArg(arg: string): string {
  return arg.replace(/[^\w.-]/g, '\\$&');
}

/**
 * Read last N lines from a file efficiently with security checks
 */
async function readLastLines(filePath: string, numLines: number): Promise<string[]> {
  try {
    // Security: Validate path
    if (!isPathSafe(filePath)) {
      logger.warn(`Attempted to access file outside allowed directory: ${filePath}`);
      return [];
    }

    // Limit number of lines
    const safeNumLines = Math.min(Math.max(numLines, 1), MAX_LINES_PER_FILE);

    await fs.access(filePath);

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Use absolute path and escape it
    const safePath = escapeShellArg(filePath);
    
    // Set timeout and maxBuffer limits
    const { stdout } = await execAsync(
      `tail -n ${safeNumLines} ${safePath} 2>/dev/null || echo ""`,
      { 
        timeout: 5000, // 5 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB max
      }
    );
    
    return stdout.trim().split('\n').filter((line: string) => line.trim().length > 0);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.debug(`Log file not found: ${filePath}`);
    } else if (error.killed) {
      logger.warn(`Reading log file timed out: ${filePath}`);
    } else {
      logger.error(`Error reading log file ${filePath}:`, error);
    }
    return [];
  }
}

/**
 * Search logs by uniqueId using grep with security measures
 */
async function searchLogsByUniqueId(uniqueId: string, limit: number = 100): Promise<ParsedLogEntry[]> {
  try {
    // Validate uniqueId format (typically alphanumeric)
    if (!/^[a-zA-Z0-9-_]+$/.test(uniqueId) || uniqueId.length > 64) {
      logger.warn(`Invalid uniqueId format: ${uniqueId}`);
      return [];
    }

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const results: ParsedLogEntry[] = [];
    const maxBuffer = 10 * 1024 * 1024; // 10MB buffer
    const timeout = 10000; // 10 seconds
    
    // Escape uniqueId for shell
    const safeUniqueId = escapeShellArg(uniqueId);
    const searchPattern = `unique_id "${safeUniqueId}"`;
    
    // Search in main nginx error log
    if (isPathSafe(NGINX_ERROR_LOG)) {
      try {
        const { stdout } = await execAsync(
          `grep -F '${searchPattern}' ${escapeShellArg(NGINX_ERROR_LOG)} 2>/dev/null | head -n ${limit} || echo ""`,
          { maxBuffer, timeout }
        );
        
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          lines.forEach((line: string, index: number) => {
            const parsed = parseModSecLogLine(line, index);
            if (parsed) {
              results.push(parsed);
            }
          });
        }
      } catch (error: any) {
        if (!error.killed) {
          logger.debug('Could not search main error log:', error.message);
        }
      }
    }
    
    // Search in domain-specific error logs (with concurrency limit)
    try {
      const domainLogs = await getDomainLogFiles();
      
      // Process in batches to avoid resource exhaustion
      for (let i = 0; i < domainLogs.length; i += MAX_CONCURRENT_FILES) {
        const batch = domainLogs.slice(i, i + MAX_CONCURRENT_FILES);
        
        await Promise.all(batch.map(async (domainLog) => {
          const logsToSearch = [
            { path: domainLog.errorLog, domain: domainLog.domain },
            { path: domainLog.sslErrorLog, domain: domainLog.domain }
          ].filter(log => log.path && isPathSafe(log.path));

          for (const { path: logPath, domain } of logsToSearch) {
            try {
              const { stdout } = await execAsync(
                `grep -F '${searchPattern}' ${escapeShellArg(logPath)} 2>/dev/null | head -n ${limit} || echo ""`,
                { maxBuffer, timeout }
              );
              
              if (stdout.trim()) {
                const lines = stdout.trim().split('\n');
                lines.forEach((line: string, index: number) => {
                  const parsed = parseModSecLogLine(line, index);
                  if (parsed) {
                    parsed.domain = domain;
                    results.push(parsed);
                  }
                });
              }
            } catch (error: any) {
              // Silently skip files that can't be read
              if (!error.killed) {
                logger.debug(`Could not search ${logPath}:`, error.message);
              }
            }
          }
        }));
        
        // Stop if we have enough results
        if (results.length >= limit) {
          break;
        }
      }
    } catch (error) {
      logger.error('Error searching domain logs:', error);
    }
    
    // Sort by timestamp descending and limit
    return results
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch (error) {
    logger.error('Error searching by uniqueId:', error);
    return [];
  }
}

/**
 * Get list of domain-specific log files with security validation
 */
async function getDomainLogFiles(): Promise<{ 
  domain: string; 
  accessLog: string; 
  errorLog: string; 
  sslAccessLog: string; 
  sslErrorLog: string 
}[]> {
  try {
    if (!isPathSafe(NGINX_LOG_DIR)) {
      logger.error('Log directory path validation failed');
      return [];
    }

    const files = await fs.readdir(NGINX_LOG_DIR);
    const domainLogs: { 
      [key: string]: { 
        accessLog?: string; 
        errorLog?: string; 
        sslAccessLog?: string; 
        sslErrorLog?: string 
      } 
    } = {};

    files.forEach(file => {
      // Additional security: skip hidden files and parent directory references
      if (file.startsWith('.') || file.includes('..')) {
        return;
      }

      const fullPath = path.join(NGINX_LOG_DIR, file);
      
      // Validate the constructed path
      if (!isPathSafe(fullPath)) {
        return;
      }

      // SSL access log
      const sslAccessMatch = file.match(/^([a-zA-Z0-9.-]+)[-_]ssl[-_]access\.log$/);
      // SSL error log
      const sslErrorMatch = file.match(/^([a-zA-Z0-9.-]+)[-_]ssl[-_]error\.log$/);
      // Non-SSL access log (must not contain 'ssl')
      const accessMatch = !file.includes('ssl') && file.match(/^([a-zA-Z0-9.-]+)[-_]access\.log$/);
      // Non-SSL error log (must not contain 'ssl')
      const errorMatch = !file.includes('ssl') && file.match(/^([a-zA-Z0-9.-]+)[-_]error\.log$/);

      if (sslAccessMatch) {
        const domain = sanitizeDomain(sslAccessMatch[1]);
        if (domain) {
          if (!domainLogs[domain]) domainLogs[domain] = {};
          domainLogs[domain].sslAccessLog = fullPath;
        }
      } else if (sslErrorMatch) {
        const domain = sanitizeDomain(sslErrorMatch[1]);
        if (domain) {
          if (!domainLogs[domain]) domainLogs[domain] = {};
          domainLogs[domain].sslErrorLog = fullPath;
        }
      } else if (accessMatch) {
        const domain = sanitizeDomain(accessMatch[1]);
        if (domain) {
          if (!domainLogs[domain]) domainLogs[domain] = {};
          domainLogs[domain].accessLog = fullPath;
        }
      } else if (errorMatch) {
        const domain = sanitizeDomain(errorMatch[1]);
        if (domain) {
          if (!domainLogs[domain]) domainLogs[domain] = {};
          domainLogs[domain].errorLog = fullPath;
        }
      }
    });

    return Object.entries(domainLogs).map(([domain, logs]) => ({
      domain,
      accessLog: logs.accessLog || '',
      errorLog: logs.errorLog || '',
      sslAccessLog: logs.sslAccessLog || '',
      sslErrorLog: logs.sslErrorLog || ''
    }));
  } catch (error) {
    logger.error('Error reading domain log files:', error);
    return [];
  }
}

/**
 * Get parsed logs from all sources with optimization and security
 */
export async function getParsedLogs(options: LogFilterOptions = {}): Promise<ParsedLogEntry[]> {
  const { 
    limit = 100, 
    offset = 0,
    level, 
    type, 
    search, 
    domain, 
    ruleId, 
    uniqueId 
  } = options;

  // Validate and limit parameters
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LINES_PER_FILE);
  const safeOffset = Math.max(offset || 0, 0);

  const allLogs: ParsedLogEntry[] = [];

  try {
    // Early return for uniqueId search (most efficient)
    if (uniqueId) {
      const results = await searchLogsByUniqueId(uniqueId, safeLimit);
      return results.slice(safeOffset, safeOffset + safeLimit);
    }

    // Validate domain parameter
    const safeDomain = domain ? sanitizeDomain(domain) : null;
    if (domain && domain !== 'all' && !safeDomain) {
      logger.warn(`Invalid domain parameter: ${domain}`);
      return [];
    }

    // If specific domain is requested
    if (safeDomain && safeDomain !== 'all') {
      const logPaths = {
        httpAccess: [
          path.join(NGINX_LOG_DIR, `${safeDomain}_access.log`),
          path.join(NGINX_LOG_DIR, `${safeDomain}-access.log`)
        ],
        httpError: [
          path.join(NGINX_LOG_DIR, `${safeDomain}_error.log`),
          path.join(NGINX_LOG_DIR, `${safeDomain}-error.log`)
        ],
        httpsAccess: [
          path.join(NGINX_LOG_DIR, `${safeDomain}_ssl_access.log`),
          path.join(NGINX_LOG_DIR, `${safeDomain}-ssl-access.log`)
        ],
        httpsError: [
          path.join(NGINX_LOG_DIR, `${safeDomain}_ssl_error.log`),
          path.join(NGINX_LOG_DIR, `${safeDomain}-ssl-error.log`)
        ]
      };

      const findExistingFile = async (paths: string[]): Promise<string | null> => {
        for (const filePath of paths) {
          if (!isPathSafe(filePath)) continue;
          try {
            await fs.access(filePath);
            return filePath;
          } catch {
            continue;
          }
        }
        return null;
      };

      // Read domain logs based on type filter
      const readPromises: Promise<void>[] = [];

      if (!type || type === 'all' || type === 'access') {
        readPromises.push(
          (async () => {
            const httpAccessLog = await findExistingFile(logPaths.httpAccess);
            if (httpAccessLog) {
              const lines = await readLastLines(httpAccessLog, safeLimit);
              lines.forEach((line, index) => {
                const parsed = parseAccessLogLine(line, index, safeDomain);
                if (parsed) allLogs.push(parsed);
              });
            }

            const httpsAccessLog = await findExistingFile(logPaths.httpsAccess);
            if (httpsAccessLog) {
              const lines = await readLastLines(httpsAccessLog, safeLimit);
              lines.forEach((line, index) => {
                const parsed = parseAccessLogLine(line, index, safeDomain);
                if (parsed) allLogs.push(parsed);
              });
            }
          })()
        );
      }

      if (!type || type === 'all' || type === 'error') {
        readPromises.push(
          (async () => {
            const httpErrorLog = await findExistingFile(logPaths.httpError);
            if (httpErrorLog) {
              const lines = await readLastLines(httpErrorLog, safeLimit);
              lines.forEach((line, index) => {
                const parsed = parseErrorLogLine(line, index);
                if (parsed) {
                  parsed.domain = safeDomain;
                  allLogs.push(parsed);
                }
              });
            }

            const httpsErrorLog = await findExistingFile(logPaths.httpsError);
            if (httpsErrorLog) {
              const lines = await readLastLines(httpsErrorLog, safeLimit);
              lines.forEach((line, index) => {
                const parsed = parseErrorLogLine(line, index);
                if (parsed) {
                  parsed.domain = safeDomain;
                  allLogs.push(parsed);
                }
              });
            }
          })()
        );
      }

      await Promise.all(readPromises);
    } else {
      // Read global and domain logs
      const readPromises: Promise<void>[] = [];

      // Global logs
      if (!type || type === 'all' || type === 'access') {
        if (isPathSafe(NGINX_ACCESS_LOG)) {
          readPromises.push(
            (async () => {
              const lines = await readLastLines(NGINX_ACCESS_LOG, Math.ceil(safeLimit / 3));
              lines.forEach((line, index) => {
                const parsed = parseAccessLogLine(line, index);
                if (parsed) allLogs.push(parsed);
              });
            })()
          );
        }
      }

      if (!type || type === 'all' || type === 'error') {
        if (isPathSafe(NGINX_ERROR_LOG)) {
          readPromises.push(
            (async () => {
              const lines = await readLastLines(NGINX_ERROR_LOG, Math.ceil(safeLimit / 3));
              lines.forEach((line, index) => {
                const parsed = parseErrorLogLine(line, index);
                if (parsed) allLogs.push(parsed);
              });
            })()
          );
        }

        if (isPathSafe(MODSEC_AUDIT_LOG)) {
          readPromises.push(
            (async () => {
              const lines = await readLastLines(MODSEC_AUDIT_LOG, Math.ceil(safeLimit / 3));
              lines.forEach((line, index) => {
                const parsed = parseModSecLogLine(line, index);
                if (parsed) allLogs.push(parsed);
              });
            })()
          );
        }
      }

      // Domain-specific logs (with concurrency control)
      if (!domain || domain === 'all') {
        const domainLogFiles = await getDomainLogFiles();
        const logsPerDomain = Math.max(1, Math.ceil(safeLimit / (domainLogFiles.length * 2 + 1)));

        // Process domains in batches
        for (let i = 0; i < domainLogFiles.length; i += MAX_CONCURRENT_FILES) {
          const batch = domainLogFiles.slice(i, i + MAX_CONCURRENT_FILES);
          
          const batchPromises = batch.map(async ({ domain: domainName, accessLog, errorLog, sslAccessLog, sslErrorLog }) => {
            const domainPromises: Promise<void>[] = [];

            if (accessLog && (!type || type === 'all' || type === 'access')) {
              domainPromises.push(
                (async () => {
                  const lines = await readLastLines(accessLog, logsPerDomain);
                  lines.forEach((line, index) => {
                    const parsed = parseAccessLogLine(line, index, domainName);
                    if (parsed) allLogs.push(parsed);
                  });
                })()
              );
            }

            if (sslAccessLog && (!type || type === 'all' || type === 'access')) {
              domainPromises.push(
                (async () => {
                  const lines = await readLastLines(sslAccessLog, logsPerDomain);
                  lines.forEach((line, index) => {
                    const parsed = parseAccessLogLine(line, index, domainName);
                    if (parsed) allLogs.push(parsed);
                  });
                })()
              );
            }

            if (errorLog && (!type || type === 'all' || type === 'error')) {
              domainPromises.push(
                (async () => {
                  const lines = await readLastLines(errorLog, logsPerDomain);
                  lines.forEach((line, index) => {
                    const parsed = parseErrorLogLine(line, index);
                    if (parsed) {
                      parsed.domain = domainName;
                      allLogs.push(parsed);
                    }
                  });
                })()
              );
            }

            if (sslErrorLog && (!type || type === 'all' || type === 'error')) {
              domainPromises.push(
                (async () => {
                  const lines = await readLastLines(sslErrorLog, logsPerDomain);
                  lines.forEach((line, index) => {
                    const parsed = parseErrorLogLine(line, index);
                    if (parsed) {
                      parsed.domain = domainName;
                      allLogs.push(parsed);
                    }
                  });
                })()
              );
            }

            await Promise.all(domainPromises);
          });

          await Promise.all(batchPromises);
        }
      }

      await Promise.all(readPromises);
    }

    // Sort by timestamp descending (newest first)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filters efficiently
    let filtered = allLogs;

    if (level && level !== 'all') {
      filtered = filtered.filter(log => log.level === level);
    }

    if (type && type !== 'all') {
      filtered = filtered.filter(log => log.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase().substring(0, 200); // Limit search term length
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.source.toLowerCase().includes(searchLower) ||
        (log.ip && log.ip.includes(searchLower)) ||
        (log.path && log.path.toLowerCase().includes(searchLower))
      );
    }

    if (ruleId) {
      const safeRuleId = ruleId.substring(0, 100);
      filtered = filtered.filter(log => log.ruleId && log.ruleId.includes(safeRuleId));
    }

    // Apply offset and limit
    return filtered.slice(safeOffset, safeOffset + safeLimit);
  } catch (error) {
    logger.error('Error getting parsed logs:', error);
    return [];
  }
}

/**
 * Get log statistics
 */
export async function getLogStats(): Promise<LogStatistics> {
  const logs = await getParsedLogs({ limit: 1000 });

  const stats: LogStatistics = {
    total: logs.length,
    byLevel: { info: 0, warning: 0, error: 0 },
    byType: { access: 0, error: 0, system: 0 }
  };

  logs.forEach(log => {
    stats.byLevel[log.level]++;
    stats.byType[log.type]++;
  });

  return stats;
}

/**
 * Get available domains from database (cached for performance)
 */
export async function getAvailableDomainsFromDb() {
  try {
    return await prisma.domain.findMany({
      select: {
        name: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (error) {
    logger.error('Error fetching domains from database:', error);
    return [];
  }
}