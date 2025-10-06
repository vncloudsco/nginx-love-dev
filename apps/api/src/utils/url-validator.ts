import logger from './logger';

/**
 * SSRF Protection Strategy:
 * - Allow ALL IPs (including private/LAN for internal deployments)
 * - Validate RESPONSE data instead of blocking IPs
 * - Use strict timeout and response schema validation
 * 
 * Why not block private IPs?
 * - LAN deployments use 192.168.x.x, 10.x.x.x
 * - Cannot predict IP when deploying new servers
 * - LAN is faster and safer than WAN
 */

/**
 * Validate host format (allow all valid IPs including private)
 * Only block obvious injection attempts
 */
export function validateHost(host: string): boolean {
  if (!host || typeof host !== 'string') {
    return false;
  }

  // Remove whitespace
  host = host.trim();

  // Block only URL injection attempts (not private IPs)
  const injectionPatterns = [
    /@/,                    // username@host injection
    /\s/,                   // whitespace injection
    /javascript:/i,         // javascript: protocol
    /data:/i,               // data: protocol  
    /file:/i,               // file: protocol
    /[<>'"]/,              // HTML/SQL injection
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(host)) {
      logger.warn('[URL-VALIDATOR] Blocked injection attempt', { host });
      return false;
    }
  }

  // Validate format: IPv4, IPv6, or domain name
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
  const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

  if (!ipv4Pattern.test(host) && !ipv6Pattern.test(host) && !domainPattern.test(host)) {
    logger.warn('[URL-VALIDATOR] Invalid host format', { host });
    return false;
  }

  return true;
}

/**
 * Validate port number
 */
export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

/**
 * Construct safe URL with validation
 */
export function constructSafeUrl(
  host: string,
  port: number,
  path: string = ''
): string | null {
  // Validate host format (not blocking private IPs)
  if (!validateHost(host)) {
    logger.error('[URL-VALIDATOR] Invalid host format', { host });
    throw new Error('Invalid host format');
  }

  // Validate port
  if (!validatePort(port)) {
    logger.error('[URL-VALIDATOR] Invalid port', { port });
    throw new Error('Invalid port number');
  }

  // Sanitize path (prevent path traversal)
  if (path) {
    path = path.replace(/\.\./g, '').replace(/\/\//g, '/');
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
  }

  const url = `http://${host}:${port}${path}`;
  logger.debug('[URL-VALIDATOR] URL constructed', { url });
  
  return url;
}

/**
 * Validate master URL and return validation result
 */
export function validateMasterUrl(
  host: string,
  port: number
): { isValid: boolean; error?: string } {
  try {
    if (!validateHost(host)) {
      return {
        isValid: false,
        error: 'Invalid host format or injection attempt detected'
      };
    }

    if (!validatePort(port)) {
      return {
        isValid: false,
        error: 'Port must be between 1 and 65535'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}

/**
 * Validate config export response from master
 * This is the MAIN SSRF protection - validate response data
 */
export function validateConfigExportResponse(data: any): { isValid: boolean; error?: string } {
  try {
    // Must be object
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Response must be an object' };
    }

    // Must have required fields
    if (!data.hasOwnProperty('hash') || !data.hasOwnProperty('timestamp') || !data.hasOwnProperty('config')) {
      return { isValid: false, error: 'Missing required fields: hash, timestamp, config' };
    }

    // Hash must be string (SHA256 = 64 chars)
    if (typeof data.hash !== 'string' || data.hash.length !== 64) {
      return { isValid: false, error: 'Invalid hash format' };
    }

    // Timestamp must be valid date string
    if (typeof data.timestamp !== 'string' || isNaN(Date.parse(data.timestamp))) {
      return { isValid: false, error: 'Invalid timestamp format' };
    }

    // Config must be object with expected structure
    const config = data.config;
    if (!config || typeof config !== 'object') {
      return { isValid: false, error: 'Config must be an object' };
    }

    // Config must have array fields
    const requiredArrays = ['domains', 'modsecCRSRules', 'modsecCustomRules', 'aclRules', 'sslCertificates'];
    for (const field of requiredArrays) {
      if (!Array.isArray(config[field])) {
        return { isValid: false, error: `Config.${field} must be an array` };
      }
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Response validation failed'
    };
  }
}

/**
 * Validate health check response
 */
export function validateHealthResponse(data: any): { isValid: boolean; error?: string } {
  try {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Response must be an object' };
    }

    // Health check should return status and message
    if (!data.hasOwnProperty('status')) {
      return { isValid: false, error: 'Missing status field' };
    }

    if (typeof data.status !== 'string') {
      return { isValid: false, error: 'Status must be a string' };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Health response validation failed'
    };
  }
}
