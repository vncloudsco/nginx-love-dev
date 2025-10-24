/**
 * Dashboard Analytics Types
 * Types for advanced dashboard statistics and analytics
 */

// Request trend data point
export interface RequestTrendDataPoint {
  timestamp: string;
  total: number;
  status200: number;
  status301: number;
  status302: number;
  status400: number;
  status403: number;
  status404: number;
  status500: number;
  status502: number;
  status503: number;
  statusOther: number;
}

// Slow request entry
export interface SlowRequestEntry {
  path: string;
  avgResponseTime: number;
  requestCount: number;
  maxResponseTime: number;
  minResponseTime: number;
}

// Attack type statistics
export interface AttackTypeStats {
  attackType: string;
  count: number;
  severity: string;
  lastOccurred: string;
  ruleIds: string[];
}

// Latest attack/security event
export interface LatestAttackEntry {
  id: string;
  timestamp: string;
  attackerIp: string;
  domain?: string; // Target domain/hostname
  urlPath: string;
  attackType: string;
  ruleId?: string;
  severity?: string;
  action: string;
  logId: string;
}

// IP analytics entry
export interface IpAnalyticsEntry {
  ip: string;
  requestCount: number;
  errorCount: number;
  attackCount: number;
  lastSeen: string;
  userAgent?: string;
}

// Attack vs Normal request ratio
export interface AttackRatioStats {
  totalRequests: number;
  attackRequests: number;
  normalRequests: number;
  attackPercentage: number;
}

// Request analytics response
export interface RequestAnalyticsResponse {
  period: 'day' | 'week' | 'month';
  topIps: IpAnalyticsEntry[];
  totalRequests: number;
  uniqueIps: number;
}

// Complete dashboard analytics response
export interface DashboardAnalyticsResponse {
  requestTrend: RequestTrendDataPoint[];
  slowRequests: SlowRequestEntry[];
  latestAttacks: AttackTypeStats[];
  latestNews: LatestAttackEntry[];
  requestAnalytics: RequestAnalyticsResponse;
  attackRatio: AttackRatioStats;
}
