import * as fs from 'fs/promises';
import * as path from 'path';
import logger from './logger';

/**
 * Log parser utilities for nginx access.log, error.log, and modsecurity audit log
 */

export interface ParsedLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  type: 'access' | 'error' | 'system';
  source: string;
  message: string;
  domain?: string;
  ip?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  responseTime?: number;
}

const NGINX_ACCESS_LOG = '/var/log/nginx/access.log';
const NGINX_ERROR_LOG = '/var/log/nginx/error.log';
const MODSEC_AUDIT_LOG = '/var/log/modsec_audit.log';
const NGINX_LOG_DIR = '/var/log/nginx';

/**
 * Parse nginx access log line (combined format)
 * Format: $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
 */
function parseAccessLogLine(line: string, index: number, domain?: string): ParsedLogEntry | null {
  try {
    // Regex for nginx combined log format
    const regex = /^(\S+) - \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) \d+ "([^"]*)" "([^"]*)"/;
    const match = line.match(regex);
    
    if (!match) return null;

    const [, ip, timeStr, method, path, statusStr] = match;
    const statusCode = parseInt(statusStr);

    // Parse time
    // Format: 29/Mar/2025:14:35:22 +0000
    const timeParts = timeStr.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([+-]\d+)/);
    let timestamp = new Date().toISOString();
    
    if (timeParts) {
      const [, day, monthStr, year, hour, min, sec] = timeParts;
      const months: { [key: string]: string } = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      const month = months[monthStr] || '01';
      timestamp = `${year}-${month}-${day.padStart(2, '0')}T${hour}:${min}:${sec}Z`;
    }

    // Determine level based on status code
    let level: 'info' | 'warning' | 'error' = 'info';
    if (statusCode >= 500) level = 'error';
    else if (statusCode >= 400) level = 'warning';

    return {
      id: `access_${Date.now()}_${index}`,
      timestamp,
      level,
      type: 'access',
      source: 'nginx',
      message: `${method} ${path} ${statusCode}`,
      domain,
      ip,
      method,
      path,
      statusCode
    };
  } catch (error) {
    logger.warn(`Failed to parse access log line: ${line}`);
    return null;
  }
}

/**
 * Parse nginx error log line
 * Format: 2025/03/29 14:35:18 [error] 12345#12345: *1 connect() failed (111: Connection refused)
 */
function parseErrorLogLine(line: string, index: number): ParsedLogEntry | null {
  try {
    const regex = /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] \d+#\d+: (.+)$/;
    const match = line.match(regex);
    
    if (!match) return null;

    const [, timeStr, levelStr, message] = match;

    // Parse time: 2025/03/29 14:35:18
    const timestamp = timeStr.replace(/\//g, '-').replace(' ', 'T') + 'Z';

    // Map nginx log levels to our levels
    const levelMap: { [key: string]: 'info' | 'warning' | 'error' } = {
      debug: 'info',
      info: 'info',
      notice: 'info',
      warn: 'warning',
      error: 'error',
      crit: 'error',
      alert: 'error',
      emerg: 'error'
    };
    const level = levelMap[levelStr] || 'error';

    // Extract IP if present
    const ipMatch = message.match(/client: ([\d.]+)/);
    const ip = ipMatch ? ipMatch[1] : undefined;

    return {
      id: `error_${Date.now()}_${index}`,
      timestamp,
      level,
      type: 'error',
      source: 'nginx',
      message: message.substring(0, 200), // Truncate long messages
      ip
    };
  } catch (error) {
    logger.warn(`Failed to parse error log line: ${line}`);
    return null;
  }
}

/**
 * Parse ModSecurity audit log line
 * Format varies, look for key patterns
 */
function parseModSecLogLine(line: string, index: number): ParsedLogEntry | null {
  try {
    // ModSecurity logs are complex, extract key info
    if (!line.includes('ModSecurity:')) return null;

    // Extract timestamp if present
    let timestamp = new Date().toISOString();
    const timeMatch = line.match(/\[(\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2})/);
    if (timeMatch) {
      const [, timeStr] = timeMatch;
      // Parse: 29/Mar/2025:14:35:22
      const timeParts = timeStr.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+)/);
      if (timeParts) {
        const [, day, monthStr, year, hour, min, sec] = timeParts;
        const months: { [key: string]: string } = {
          Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
        };
        const month = months[monthStr] || '01';
        timestamp = `${year}-${month}-${day.padStart(2, '0')}T${hour}:${min}:${sec}Z`;
      }
    }

    // Extract message
    const msgMatch = line.match(/\[msg "([^"]+)"\]/);
    const message = msgMatch ? msgMatch[1] : line.substring(0, 200);

    // Extract IP
    const ipMatch = line.match(/\[client ([\d.]+)\]/) || line.match(/\[hostname "([\d.]+)"\]/);
    const ip = ipMatch ? ipMatch[1] : undefined;

    // Extract request info
    const methodMatch = line.match(/"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) ([^"]+)"/);
    const method = methodMatch ? methodMatch[1] : undefined;
    const path = methodMatch ? methodMatch[2] : undefined;

    // Determine level
    let level: 'info' | 'warning' | 'error' = 'warning';
    if (line.includes('Access denied') || line.includes('blocked')) {
      level = 'error';
    }

    return {
      id: `modsec_${Date.now()}_${index}`,
      timestamp,
      level,
      type: 'error',
      source: 'modsecurity',
      message: `ModSecurity: ${message}`,
      ip,
      method,
      path,
      statusCode: line.includes('403') ? 403 : undefined
    };
  } catch (error) {
    logger.warn(`Failed to parse ModSecurity log line: ${line}`);
    return null;
  }
}

/**
 * Read last N lines from a file efficiently
 */
async function readLastLines(filePath: string, numLines: number): Promise<string[]> {
  try {
    await fs.access(filePath);
    
    // Use tail command for efficiency with large files
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync(`tail -n ${numLines} ${filePath} 2>/dev/null || echo ""`);
    return stdout.trim().split('\n').filter((line: string) => line.trim().length > 0);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.warn(`Log file not found: ${filePath}`);
    } else {
      logger.error(`Error reading log file ${filePath}:`, error);
    }
    return [];
  }
}

/**
 * Get list of domain-specific log files
 */
async function getDomainLogFiles(): Promise<{ domain: string; accessLog: string; errorLog: string; sslAccessLog: string; sslErrorLog: string }[]> {
  try {
    const files = await fs.readdir(NGINX_LOG_DIR);
    const domainLogs: { [key: string]: { accessLog?: string; errorLog?: string; sslAccessLog?: string; sslErrorLog?: string } } = {};

    files.forEach(file => {
      // Match patterns for both HTTP and HTTPS logs:
      // - example.com_access.log or example.com-access.log (HTTP)
      // - example.com_error.log or example.com-error.log (HTTP)
      // - example.com_ssl_access.log or example.com-ssl-access.log (HTTPS)
      // - example.com_ssl_error.log or example.com-ssl-error.log (HTTPS)
      
      // SSL access log
      const sslAccessMatch = file.match(/^(.+?)[-_]ssl[-_]access\.log$/);
      // SSL error log
      const sslErrorMatch = file.match(/^(.+?)[-_]ssl[-_]error\.log$/);
      // Non-SSL access log (must not contain 'ssl')
      const accessMatch = !file.includes('ssl') && file.match(/^(.+?)[-_]access\.log$/);
      // Non-SSL error log (must not contain 'ssl')
      const errorMatch = !file.includes('ssl') && file.match(/^(.+?)[-_]error\.log$/);

      if (sslAccessMatch) {
        const domain = sslAccessMatch[1];
        if (!domainLogs[domain]) domainLogs[domain] = {};
        domainLogs[domain].sslAccessLog = path.join(NGINX_LOG_DIR, file);
      } else if (sslErrorMatch) {
        const domain = sslErrorMatch[1];
        if (!domainLogs[domain]) domainLogs[domain] = {};
        domainLogs[domain].sslErrorLog = path.join(NGINX_LOG_DIR, file);
      } else if (accessMatch) {
        const domain = accessMatch[1];
        if (!domainLogs[domain]) domainLogs[domain] = {};
        domainLogs[domain].accessLog = path.join(NGINX_LOG_DIR, file);
      } else if (errorMatch) {
        const domain = errorMatch[1];
        if (!domainLogs[domain]) domainLogs[domain] = {};
        domainLogs[domain].errorLog = path.join(NGINX_LOG_DIR, file);
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
 * Get parsed logs from all sources
 */
export async function getParsedLogs(options: {
  limit?: number;
  level?: string;
  type?: string;
  search?: string;
  domain?: string;
} = {}): Promise<ParsedLogEntry[]> {
  const { limit = 100, level, type, search, domain } = options;
  
  const allLogs: ParsedLogEntry[] = [];

  try {
    // If specific domain is requested, read only that domain's logs
    if (domain && domain !== 'all') {
      // Define all possible log file paths (both HTTP and HTTPS)
      const logPaths = {
        httpAccess: [
          path.join(NGINX_LOG_DIR, `${domain}_access.log`),
          path.join(NGINX_LOG_DIR, `${domain}-access.log`)
        ],
        httpError: [
          path.join(NGINX_LOG_DIR, `${domain}_error.log`),
          path.join(NGINX_LOG_DIR, `${domain}-error.log`)
        ],
        httpsAccess: [
          path.join(NGINX_LOG_DIR, `${domain}_ssl_access.log`),
          path.join(NGINX_LOG_DIR, `${domain}-ssl-access.log`)
        ],
        httpsError: [
          path.join(NGINX_LOG_DIR, `${domain}_ssl_error.log`),
          path.join(NGINX_LOG_DIR, `${domain}-ssl-error.log`)
        ]
      };

      // Helper function to find existing log file
      const findExistingFile = async (paths: string[]): Promise<string | null> => {
        for (const filePath of paths) {
          try {
            await fs.access(filePath);
            return filePath;
          } catch {
            continue;
          }
        }
        return null;
      };

      // Read domain access logs (both HTTP and HTTPS)
      if (!type || type === 'all' || type === 'access') {
        // HTTP access logs
        const httpAccessLog = await findExistingFile(logPaths.httpAccess);
        if (httpAccessLog) {
          const accessLines = await readLastLines(httpAccessLog, Math.ceil(limit / 4));
          accessLines.forEach((line, index) => {
            const parsed = parseAccessLogLine(line, index, domain);
            if (parsed) allLogs.push(parsed);
          });
        }

        // HTTPS access logs
        const httpsAccessLog = await findExistingFile(logPaths.httpsAccess);
        if (httpsAccessLog) {
          const sslAccessLines = await readLastLines(httpsAccessLog, Math.ceil(limit / 4));
          sslAccessLines.forEach((line, index) => {
            const parsed = parseAccessLogLine(line, index, domain);
            if (parsed) allLogs.push(parsed);
          });
        }
      }

      // Read domain error logs (both HTTP and HTTPS)
      if (!type || type === 'all' || type === 'error') {
        // HTTP error logs
        const httpErrorLog = await findExistingFile(logPaths.httpError);
        if (httpErrorLog) {
          const errorLines = await readLastLines(httpErrorLog, Math.ceil(limit / 4));
          errorLines.forEach((line, index) => {
            const parsed = parseErrorLogLine(line, index);
            if (parsed) {
              parsed.domain = domain;
              allLogs.push(parsed);
            }
          });
        }

        // HTTPS error logs
        const httpsErrorLog = await findExistingFile(logPaths.httpsError);
        if (httpsErrorLog) {
          const sslErrorLines = await readLastLines(httpsErrorLog, Math.ceil(limit / 4));
          sslErrorLines.forEach((line, index) => {
            const parsed = parseErrorLogLine(line, index);
            if (parsed) {
              parsed.domain = domain;
              allLogs.push(parsed);
            }
          });
        }
      }
    } else {
      // Read global nginx logs
      if (!type || type === 'all' || type === 'access') {
        const accessLines = await readLastLines(NGINX_ACCESS_LOG, Math.ceil(limit / 3));
        accessLines.forEach((line, index) => {
          const parsed = parseAccessLogLine(line, index);
          if (parsed) allLogs.push(parsed);
        });
      }

      if (!type || type === 'all' || type === 'error') {
        const errorLines = await readLastLines(NGINX_ERROR_LOG, Math.ceil(limit / 3));
        errorLines.forEach((line, index) => {
          const parsed = parseErrorLogLine(line, index);
          if (parsed) allLogs.push(parsed);
        });
      }

      // Read ModSecurity logs
      if (!type || type === 'all' || type === 'error') {
        const modsecLines = await readLastLines(MODSEC_AUDIT_LOG, Math.ceil(limit / 3));
        modsecLines.forEach((line, index) => {
          const parsed = parseModSecLogLine(line, index);
          if (parsed) allLogs.push(parsed);
        });
      }

      // Also read all domain-specific logs if no specific domain requested
      if (!domain || domain === 'all') {
        const domainLogFiles = await getDomainLogFiles();
        const logsPerDomain = Math.ceil(limit / (domainLogFiles.length * 2 + 1)); // Divide among all domains and log types
        
        for (const { domain: domainName, accessLog, errorLog, sslAccessLog, sslErrorLog } of domainLogFiles) {
          // HTTP access logs
          if (accessLog && (!type || type === 'all' || type === 'access')) {
            const lines = await readLastLines(accessLog, logsPerDomain);
            lines.forEach((line, index) => {
              const parsed = parseAccessLogLine(line, index, domainName);
              if (parsed) allLogs.push(parsed);
            });
          }

          // HTTPS access logs
          if (sslAccessLog && (!type || type === 'all' || type === 'access')) {
            const lines = await readLastLines(sslAccessLog, logsPerDomain);
            lines.forEach((line, index) => {
              const parsed = parseAccessLogLine(line, index, domainName);
              if (parsed) allLogs.push(parsed);
            });
          }

          // HTTP error logs
          if (errorLog && (!type || type === 'all' || type === 'error')) {
            const lines = await readLastLines(errorLog, logsPerDomain);
            lines.forEach((line, index) => {
              const parsed = parseErrorLogLine(line, index);
              if (parsed) {
                parsed.domain = domainName;
                allLogs.push(parsed);
              }
            });
          }

          // HTTPS error logs
          if (sslErrorLog && (!type || type === 'all' || type === 'error')) {
            const lines = await readLastLines(sslErrorLog, logsPerDomain);
            lines.forEach((line, index) => {
              const parsed = parseErrorLogLine(line, index);
              if (parsed) {
                parsed.domain = domainName;
                allLogs.push(parsed);
              }
            });
          }
        }
      }
    }

    // Sort by timestamp descending (newest first)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filters
    let filtered = allLogs;

    if (level && level !== 'all') {
      filtered = filtered.filter(log => log.level === level);
    }

    if (type && type !== 'all') {
      filtered = filtered.filter(log => log.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.source.toLowerCase().includes(searchLower) ||
        (log.ip && log.ip.includes(searchLower)) ||
        (log.path && log.path.toLowerCase().includes(searchLower))
      );
    }

    // Apply limit
    return filtered.slice(0, limit);
  } catch (error) {
    logger.error('Error getting parsed logs:', error);
    return [];
  }
}

/**
 * Get log statistics
 */
export async function getLogStats(): Promise<{
  total: number;
  byLevel: { info: number; warning: number; error: number };
  byType: { access: number; error: number; system: number };
}> {
  const logs = await getParsedLogs({ limit: 1000 });
  
  const stats = {
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
