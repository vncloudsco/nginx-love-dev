import api from './api';

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

/**
 * Get request trend analytics (auto-refresh every 5s)
 */
export const getRequestTrend = async (intervalSeconds: number = 5): Promise<RequestTrendDataPoint[]> => {
  const response = await api.get('/dashboard/analytics/request-trend', {
    params: { interval: intervalSeconds },
  });
  return response.data.data;
};

/**
 * Get slow requests from performance monitoring
 */
export const getSlowRequests = async (limit: number = 10): Promise<SlowRequestEntry[]> => {
  const response = await api.get('/dashboard/analytics/slow-requests', {
    params: { limit },
  });
  return response.data.data;
};

/**
 * Get latest attack statistics (top 5 in 24h)
 */
export const getLatestAttackStats = async (limit: number = 5): Promise<AttackTypeStats[]> => {
  const response = await api.get('/dashboard/analytics/latest-attacks', {
    params: { limit },
  });
  return response.data.data;
};

/**
 * Get latest security news/events
 */
export const getLatestNews = async (limit: number = 20): Promise<LatestAttackEntry[]> => {
  const response = await api.get('/dashboard/analytics/latest-news', {
    params: { limit },
  });
  return response.data.data;
};

/**
 * Get request analytics (top IPs by period)
 */
export const getRequestAnalytics = async (
  period: 'day' | 'week' | 'month' = 'day'
): Promise<RequestAnalyticsResponse> => {
  const response = await api.get('/dashboard/analytics/request-analytics', {
    params: { period },
  });
  return response.data.data;
};

/**
 * Get attack vs normal request ratio
 */
export const getAttackRatio = async (): Promise<AttackRatioStats> => {
  const response = await api.get('/dashboard/analytics/attack-ratio');
  return response.data.data;
};

/**
 * Get complete dashboard analytics (all in one)
 */
export const getDashboardAnalytics = async (): Promise<DashboardAnalyticsResponse> => {
  const response = await api.get('/dashboard/analytics');
  return response.data.data;
};

export const dashboardAnalyticsService = {
  getRequestTrend,
  getSlowRequests,
  getLatestAttackStats,
  getLatestNews,
  getRequestAnalytics,
  getAttackRatio,
  getDashboardAnalytics,
};

export default dashboardAnalyticsService;
