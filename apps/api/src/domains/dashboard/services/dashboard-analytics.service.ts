/**
 * Dashboard Analytics Service
 * Handles advanced analytics and statistics from logs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import logger from '../../../utils/logger';
import {
  RequestTrendDataPoint,
  SlowRequestEntry,
  AttackTypeStats,
  LatestAttackEntry,
  IpAnalyticsEntry,
  AttackRatioStats,
  RequestAnalyticsResponse,
} from '../types/dashboard-analytics.types';
import { parseAccessLogLine, parseModSecLogLine } from '../../logs/services/log-parser.service';

const execAsync = promisify(exec);

const NGINX_ACCESS_LOG = '/var/log/nginx/access.log';
const NGINX_ERROR_LOG = '/var/log/nginx/error.log';
const MODSEC_AUDIT_LOG = '/var/log/modsec_audit.log';
const NGINX_LOG_DIR = '/var/log/nginx';

export class DashboardAnalyticsService {
  /**
   * Helper: Read ALL ModSecurity logs from error.log (NO LINE LIMIT!)
   */
  private async readModSecLogs(numLines: number): Promise<string[]> {
    const lines: string[] = [];
    
    // MaxBuffer for large log files (100MB)
    const maxBuffer = 100 * 1024 * 1024;
    
    // Read from main nginx error.log - NO LIMIT, read entire file
    try {
      const { stdout } = await execAsync(`grep "ModSecurity:" ${NGINX_ERROR_LOG} 2>/dev/null || echo ""`, { maxBuffer });
      const modsecLines = stdout.trim().split('\n').filter(line => line.trim().length > 0);
      lines.push(...modsecLines);
    } catch (error) {
      logger.warn('Could not read from nginx error.log:', error);
    }
    
    // Read from domain-specific error logs - NO LIMIT
    try {
      const domainLogs = await this.getDomainLogFiles();
      
      for (const domainLog of domainLogs) {
        if (domainLog.errorLog) {
          const { stdout } = await execAsync(`grep "ModSecurity:" ${domainLog.errorLog} 2>/dev/null || echo ""`, { maxBuffer });
          const modsecLines = stdout.trim().split('\n').filter(line => line.trim().length > 0);
          lines.push(...modsecLines);
        }
        if (domainLog.sslErrorLog) {
          const { stdout } = await execAsync(`grep "ModSecurity:" ${domainLog.sslErrorLog} 2>/dev/null || echo ""`, { maxBuffer });
          const modsecLines = stdout.trim().split('\n').filter(line => line.trim().length > 0);
          lines.push(...modsecLines);
        }
      }
    } catch (error) {
      logger.error('Could not read from domain error logs:', error);
    }
    
    // NOTE: modsec_audit.log has completely different format (sections A-Z)
    // and doesn't have [client IP] pattern, so we DON'T read it here
    
    return lines;
  }

  /**
   * Get request trend data (auto-refresh every 5 seconds)
   * Returns request count grouped by status codes over time
   */
  async getRequestTrend(intervalSeconds: number = 5): Promise<RequestTrendDataPoint[]> {
    try {
      // Get logs from the last 24 hours grouped by time intervals
      const hoursToFetch = 24;
      const dataPoints = Math.floor((hoursToFetch * 3600) / intervalSeconds);
      const now = Date.now();

      // Read access logs
      const lines = await this.readLastLines(NGINX_ACCESS_LOG, 10000);
      
      // Also read domain-specific logs
      const domainLogs = await this.getDomainLogFiles();
      for (const domainLog of domainLogs) {
        if (domainLog.accessLog) {
          const domainLines = await this.readLastLines(domainLog.accessLog, 5000);
          lines.push(...domainLines);
        }
        if (domainLog.sslAccessLog) {
          const sslLines = await this.readLastLines(domainLog.sslAccessLog, 5000);
          lines.push(...sslLines);
        }
      }

      // Parse logs and group by time intervals
      const intervalMap = new Map<number, RequestTrendDataPoint>();

      lines.forEach((line, index) => {
        const parsed = parseAccessLogLine(line, index);
        if (!parsed) return;

        const timestamp = new Date(parsed.timestamp).getTime();
        const intervalIndex = Math.floor((now - timestamp) / (intervalSeconds * 1000));
        
        if (intervalIndex >= dataPoints || intervalIndex < 0) return;

        const intervalKey = now - (intervalIndex * intervalSeconds * 1000);
        
        if (!intervalMap.has(intervalKey)) {
          intervalMap.set(intervalKey, {
            timestamp: new Date(intervalKey).toISOString(),
            total: 0,
            status200: 0,
            status301: 0,
            status302: 0,
            status400: 0,
            status403: 0,
            status404: 0,
            status500: 0,
            status502: 0,
            status503: 0,
            statusOther: 0,
          });
        }

        const dataPoint = intervalMap.get(intervalKey)!;
        dataPoint.total++;

        // Count by status code
        const status = parsed.statusCode;
        if (status === 200) dataPoint.status200++;
        else if (status === 301) dataPoint.status301++;
        else if (status === 302) dataPoint.status302++;
        else if (status === 400) dataPoint.status400++;
        else if (status === 403) dataPoint.status403++;
        else if (status === 404) dataPoint.status404++;
        else if (status === 500) dataPoint.status500++;
        else if (status === 502) dataPoint.status502++;
        else if (status === 503) dataPoint.status503++;
        else dataPoint.statusOther++;
      });

      // Convert to array and sort by timestamp
      const result = Array.from(intervalMap.values())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return result;
    } catch (error) {
      logger.error('Get request trend error:', error);
      return [];
    }
  }

  /**
   * Get top 10 slow requests from performance monitoring
   */
  async getSlowRequests(limit: number = 10): Promise<SlowRequestEntry[]> {
    try {
      // Get from PerformanceMetric table
      const prisma = (await import('../../../config/database')).default;
      
      const slowRequests = await prisma.performanceMetric.groupBy({
        by: ['domain'],
        _avg: {
          responseTime: true,
        },
        _max: {
          responseTime: true,
        },
        _min: {
          responseTime: true,
        },
        _count: {
          domain: true,
        },
        orderBy: {
          _avg: {
            responseTime: 'desc',
          },
        },
        take: limit,
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 3600 * 1000), // Last 24 hours
          },
        },
      });

      return slowRequests.map(item => ({
        path: item.domain,
        avgResponseTime: item._avg.responseTime || 0,
        maxResponseTime: item._max.responseTime || 0,
        minResponseTime: item._min.responseTime || 0,
        requestCount: item._count.domain,
      }));
    } catch (error) {
      logger.error('Get slow requests error:', error);
      return [];
    }
  }

  /**
   * Get top 5 attack types in last 24 hours
   */
  async getLatestAttacks(limit: number = 5): Promise<AttackTypeStats[]> {
    try {
      // Read ModSecurity logs from error.log and audit log
      const lines = await this.readModSecLogs(5000);
      
      // Parse and group by attack type
      const attackMap = new Map<string, {
        count: number;
        severity: string;
        lastOccurred: string;
        ruleIds: Set<string>;
      }>();

      const cutoffTime = Date.now() - 24 * 3600 * 1000;

      lines.forEach((line, index) => {
        const parsed = parseModSecLogLine(line, index);
        if (!parsed || !parsed.ruleId) return;

        const timestamp = new Date(parsed.timestamp).getTime();
        if (timestamp < cutoffTime) return;

        // Determine attack type from tags or message
        let attackType = 'Unknown Attack';
        if (parsed.tags && parsed.tags.length > 0) {
          // Use the first meaningful tag
          const meaningfulTag = parsed.tags.find(tag => 
            tag.includes('attack') || 
            tag.includes('injection') || 
            tag.includes('xss') ||
            tag.includes('sqli') ||
            tag.includes('rce') ||
            tag.includes('lfi') ||
            tag.includes('rfi')
          );
          if (meaningfulTag) {
            attackType = meaningfulTag.replace(/-/g, ' ').replace(/_/g, ' ').toUpperCase();
          }
        }

        // Extract attack type from message if not found in tags
        if (attackType === 'Unknown Attack' && parsed.message) {
          if (parsed.message.includes('SQL Injection')) attackType = 'SQL Injection';
          else if (parsed.message.includes('XSS')) attackType = 'Cross-Site Scripting';
          else if (parsed.message.includes('RCE')) attackType = 'Remote Code Execution';
          else if (parsed.message.includes('LFI')) attackType = 'Local File Inclusion';
          else if (parsed.message.includes('RFI')) attackType = 'Remote File Inclusion';
          else if (parsed.message.includes('Command Injection')) attackType = 'Command Injection';
        }

        if (!attackMap.has(attackType)) {
          attackMap.set(attackType, {
            count: 0,
            severity: parsed.severity || 'MEDIUM',
            lastOccurred: parsed.timestamp,
            ruleIds: new Set(),
          });
        }

        const stats = attackMap.get(attackType)!;
        stats.count++;
        if (parsed.ruleId) stats.ruleIds.add(parsed.ruleId);
        
        // Update last occurred if more recent
        if (new Date(parsed.timestamp) > new Date(stats.lastOccurred)) {
          stats.lastOccurred = parsed.timestamp;
        }
      });

      // Convert to array and sort by count
      const result: AttackTypeStats[] = Array.from(attackMap.entries())
        .map(([attackType, stats]) => ({
          attackType,
          count: stats.count,
          severity: stats.severity,
          lastOccurred: stats.lastOccurred,
          timestamp: stats.lastOccurred,
          ruleIds: Array.from(stats.ruleIds),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return result;
    } catch (error) {
      logger.error('Get latest attacks error:', error);
      return [];
    }
  }

  /**
   * Get latest security news/events (table format)
   */
  async getLatestNews(limit: number = 20): Promise<LatestAttackEntry[]> {
    try {
      // Read ModSecurity logs from error logs only (not audit log - different format)
      const lines = await this.readModSecLogs(2000);
      
      const attacks: LatestAttackEntry[] = [];
      const cutoffTime = Date.now() - 24 * 3600 * 1000;

      lines.forEach((line, index) => {
        const parsed = parseModSecLogLine(line, index);
        if (!parsed) return;

        const timestamp = new Date(parsed.timestamp).getTime();
        if (timestamp < cutoffTime) return;

        // Use parsed IP (already extracted from [client IP])
        const attackerIp = parsed.ip || 'Unknown';
        
        // Use parsed hostname (already extracted from [hostname "domain.com"])
        const domain = parsed.hostname;

        // Determine attack type
        let attackType = 'Security Event';
        if (parsed.tags && parsed.tags.length > 0) {
          const tag = parsed.tags.find(t => t.includes('attack') || t.includes('injection'));
          if (tag) attackType = tag.replace(/-/g, ' ').toUpperCase();
        }
        if (parsed.message) {
          if (parsed.message.includes('SQL Injection')) attackType = 'SQL Injection';
          else if (parsed.message.includes('XSS')) attackType = 'XSS Attack';
        }

        // Use ruleId as logId for better searching
        const logId = parsed.ruleId || parsed.uniqueId || parsed.id;

        attacks.push({
          id: parsed.id,
          timestamp: parsed.timestamp,
          attackerIp,
          domain,
          urlPath: parsed.path || parsed.uri || '/',
          attackType,
          ruleId: parsed.ruleId,
          uniqueId: parsed.uniqueId, // Add uniqueId for precise log lookup
          severity: parsed.severity,
          action: 'Blocked',
          logId,
          // DEBUG: Add raw log sample for first few entries
          ...(index < 3 ? { _debugRawLog: line.substring(0, 300) } : {}),
        } as any);
      });

      // Sort by timestamp descending and limit
      return attacks
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      logger.error('Get latest news error:', error);
      return [];
    }
  }

  /**
   * Get request analytics (top IPs by period)
   */
  async getRequestAnalytics(period: 'day' | 'week' | 'month' = 'day'): Promise<RequestAnalyticsResponse> {
    try {
      const periodHours = period === 'day' ? 24 : period === 'week' ? 168 : 720;
      const cutoffTime = Date.now() - periodHours * 3600 * 1000;

      // Read access logs
      const lines = await this.readLastLines(NGINX_ACCESS_LOG, 20000);
      
      // Read domain logs
      const domainLogs = await this.getDomainLogFiles();
      for (const domainLog of domainLogs) {
        if (domainLog.accessLog) {
          const domainLines = await this.readLastLines(domainLog.accessLog, 10000);
          lines.push(...domainLines);
        }
        if (domainLog.sslAccessLog) {
          const sslLines = await this.readLastLines(domainLog.sslAccessLog, 10000);
          lines.push(...sslLines);
        }
      }

      // Group by IP
      const ipMap = new Map<string, IpAnalyticsEntry>();

      lines.forEach((line, index) => {
        const parsed = parseAccessLogLine(line, index);
        if (!parsed || !parsed.ip) return;

        const timestamp = new Date(parsed.timestamp).getTime();
        if (timestamp < cutoffTime) return;

        if (!ipMap.has(parsed.ip)) {
          ipMap.set(parsed.ip, {
            ip: parsed.ip,
            requestCount: 0,
            errorCount: 0,
            attackCount: 0,
            lastSeen: parsed.timestamp,
          });
        }

        const entry = ipMap.get(parsed.ip)!;
        entry.requestCount++;
        
        if (parsed.statusCode && parsed.statusCode >= 400) {
          entry.errorCount++;
        }

        // Update last seen
        if (new Date(parsed.timestamp) > new Date(entry.lastSeen)) {
          entry.lastSeen = parsed.timestamp;
        }
      });

      // Check for attacks from ModSecurity logs - count by actual client IP
      let modsecLines: string[] = [];
      try {
        modsecLines = await this.readModSecLogs(10000);
      } catch (error) {
        logger.error('Failed to read ModSec logs:', error);
      }
      
      modsecLines.forEach((line, index) => {
        const parsed = parseModSecLogLine(line, index);
        if (!parsed) return;
        
        const timestamp = new Date(parsed.timestamp).getTime();
        if (timestamp < cutoffTime) return;

        // Use parsed IP (already extracted correctly from [client IP])
        const attackerIp = parsed.ip;
        if (!attackerIp) return;

        // If IP exists in map, increment attack count
        let entry = ipMap.get(attackerIp);
        if (entry) {
          entry.attackCount++;
          entry.requestCount++; // Attacks are also requests!
        } else {
          // Create new entry for this IP if not exists
          ipMap.set(attackerIp, {
            ip: attackerIp,
            requestCount: 1, // Attack is a request
            errorCount: 1, // Attack is also an error
            attackCount: 1,
            lastSeen: parsed.timestamp,
          });
        }
      });

      // Sort by request count and get top 10
      const topIps = Array.from(ipMap.values())
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10);

      return {
        period,
        topIps,
        totalRequests: lines.length,
        uniqueIps: ipMap.size,
        _timestamp: Date.now(), // Force cache refresh
      } as any;
    } catch (error) {
      logger.error('Get request analytics error:', error);
      return {
        period,
        topIps: [],
        totalRequests: 0,
        uniqueIps: 0,
      };
    }
  }

  /**
   * Get attack vs normal request ratio
   */
  async getAttackRatio(): Promise<AttackRatioStats> {
    try {
      // Count total requests from access logs (last 24h)
      const accessLines = await this.readLastLines(NGINX_ACCESS_LOG, 20000);
      
      // Read domain logs
      const domainLogs = await this.getDomainLogFiles();
      for (const domainLog of domainLogs) {
        if (domainLog.accessLog) {
          const lines = await this.readLastLines(domainLog.accessLog, 10000);
          accessLines.push(...lines);
        }
        if (domainLog.sslAccessLog) {
          const lines = await this.readLastLines(domainLog.sslAccessLog, 10000);
          accessLines.push(...lines);
        }
      }

      const cutoffTime = Date.now() - 24 * 3600 * 1000;
      let totalRequests = 0;

      accessLines.forEach((line, index) => {
        const parsed = parseAccessLogLine(line, index);
        if (!parsed) return;
        
        const timestamp = new Date(parsed.timestamp).getTime();
        if (timestamp >= cutoffTime) {
          totalRequests++;
        }
      });

      // Count attack requests from ModSecurity logs
      const modsecLines = await this.readModSecLogs(5000);
      let attackRequests = 0;

      modsecLines.forEach((line, index) => {
        const parsed = parseModSecLogLine(line, index);
        if (!parsed) return;

        const timestamp = new Date(parsed.timestamp).getTime();
        if (timestamp >= cutoffTime) {
          attackRequests++;
        }
      });

      const normalRequests = totalRequests - attackRequests;
      const attackPercentage = totalRequests > 0 ? (attackRequests / totalRequests) * 100 : 0;

      return {
        totalRequests,
        attackRequests,
        normalRequests,
        attackPercentage: parseFloat(attackPercentage.toFixed(2)),
      };
    } catch (error) {
      logger.error('Get attack ratio error:', error);
      return {
        totalRequests: 0,
        attackRequests: 0,
        normalRequests: 0,
        attackPercentage: 0,
      };
    }
  }

  /**
   * Helper: Read last N lines from file
   */
  private async readLastLines(filePath: string, numLines: number): Promise<string[]> {
    try {
      await fs.access(filePath);
      const { stdout } = await execAsync(`tail -n ${numLines} ${filePath} 2>/dev/null || echo ""`);
      return stdout.trim().split('\n').filter((line: string) => line.trim().length > 0);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.warn(`Could not read log file ${filePath}:`, error);
      }
      return [];
    }
  }

  /**
   * Helper: Get domain-specific log files
   */
  private async getDomainLogFiles(): Promise<{ domain: string; accessLog: string; errorLog: string; sslAccessLog: string; sslErrorLog: string }[]> {
    try {
      const files = await fs.readdir(NGINX_LOG_DIR);
      const domainLogs: { [key: string]: { accessLog?: string; errorLog?: string; sslAccessLog?: string; sslErrorLog?: string } } = {};

      files.forEach(file => {
        const sslAccessMatch = file.match(/^(.+?)[-_]ssl[-_]access\.log$/);
        const sslErrorMatch = file.match(/^(.+?)[-_]ssl[-_]error\.log$/);
        const accessMatch = !file.includes('ssl') && file.match(/^(.+?)[-_]access\.log$/);
        const errorMatch = !file.includes('ssl') && file.match(/^(.+?)[-_]error\.log$/);

        if (sslAccessMatch) {
          const domain = sslAccessMatch[1];
          if (!domainLogs[domain]) domainLogs[domain] = {};
          domainLogs[domain].sslAccessLog = `${NGINX_LOG_DIR}/${file}`;
        } else if (sslErrorMatch) {
          const domain = sslErrorMatch[1];
          if (!domainLogs[domain]) domainLogs[domain] = {};
          domainLogs[domain].sslErrorLog = `${NGINX_LOG_DIR}/${file}`;
        } else if (accessMatch) {
          const domain = accessMatch[1];
          if (!domainLogs[domain]) domainLogs[domain] = {};
          domainLogs[domain].accessLog = `${NGINX_LOG_DIR}/${file}`;
        } else if (errorMatch) {
          const domain = errorMatch[1];
          if (!domainLogs[domain]) domainLogs[domain] = {};
          domainLogs[domain].errorLog = `${NGINX_LOG_DIR}/${file}`;
        }
      });

      return Object.entries(domainLogs).map(([domain, logs]) => ({
        domain,
        accessLog: logs.accessLog || '',
        errorLog: logs.errorLog || '',
        sslAccessLog: logs.sslAccessLog || '',
        sslErrorLog: logs.sslErrorLog || '',
      }));
    } catch (error) {
      logger.error('Error reading domain log files:', error);
      return [];
    }
  }
}

// Export singleton instance
export const dashboardAnalyticsService = new DashboardAnalyticsService();
