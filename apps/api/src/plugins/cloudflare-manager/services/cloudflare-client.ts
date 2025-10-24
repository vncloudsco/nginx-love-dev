/**
 * Cloudflare API Client
 * Wrapper for Cloudflare API interactions
 */

import axios, { AxiosInstance } from 'axios';

export interface CloudflareConfig {
  apiToken: string;
  accountId: string;
  zoneId?: string;
}

export interface DNSRecord {
  id?: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA';
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
  comment?: string;
}

export interface FirewallRule {
  id?: string;
  mode: 'block' | 'challenge' | 'whitelist' | 'js_challenge';
  configuration: {
    target: 'ip' | 'ip_range' | 'country' | 'asn';
    value: string;
  };
  notes?: string;
  paused?: boolean;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  name_servers: string[];
}

export class CloudflareClient {
  private client: AxiosInstance;
  private config: CloudflareConfig;

  constructor(config: CloudflareConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get all zones for the account
   */
  async getZones(): Promise<CloudflareZone[]> {
    const response = await this.client.get('/zones', {
      params: {
        account: {
          id: this.config.accountId,
        },
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to fetch zones');
    }

    return response.data.result;
  }

  /**
   * Get zone by ID
   */
  async getZone(zoneId: string): Promise<CloudflareZone> {
    const response = await this.client.get(`/zones/${zoneId}`);

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to fetch zone');
    }

    return response.data.result;
  }

  // ==================== DNS Records ====================

  /**
   * List DNS records for a zone
   */
  async listDNSRecords(zoneId: string, params?: { type?: string; name?: string }): Promise<DNSRecord[]> {
    const response = await this.client.get(`/zones/${zoneId}/dns_records`, { params });

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to fetch DNS records');
    }

    return response.data.result;
  }

  /**
   * Get single DNS record
   */
  async getDNSRecord(zoneId: string, recordId: string): Promise<DNSRecord> {
    const response = await this.client.get(`/zones/${zoneId}/dns_records/${recordId}`);

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to fetch DNS record');
    }

    return response.data.result;
  }

  /**
   * Create DNS record
   */
  async createDNSRecord(zoneId: string, record: Omit<DNSRecord, 'id'>): Promise<DNSRecord> {
    const response = await this.client.post(`/zones/${zoneId}/dns_records`, record);

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to create DNS record');
    }

    return response.data.result;
  }

  /**
   * Update DNS record
   */
  async updateDNSRecord(zoneId: string, recordId: string, record: Partial<DNSRecord>): Promise<DNSRecord> {
    const response = await this.client.patch(`/zones/${zoneId}/dns_records/${recordId}`, record);

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to update DNS record');
    }

    return response.data.result;
  }

  /**
   * Delete DNS record
   */
  async deleteDNSRecord(zoneId: string, recordId: string): Promise<void> {
    const response = await this.client.delete(`/zones/${zoneId}/dns_records/${recordId}`);

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to delete DNS record');
    }
  }

  // ==================== Firewall Rules (IP Access Rules) ====================

  /**
   * List IP access rules
   */
  async listIPAccessRules(zoneId?: string): Promise<any[]> {
    const endpoint = zoneId
      ? `/zones/${zoneId}/firewall/access_rules/rules`
      : `/accounts/${this.config.accountId}/firewall/access_rules/rules`;

    const response = await this.client.get(endpoint);

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to fetch IP access rules');
    }

    return response.data.result;
  }

  /**
   * Get single IP access rule
   */
  async getIPAccessRule(ruleId: string, zoneId?: string): Promise<any> {
    const endpoint = zoneId
      ? `/zones/${zoneId}/firewall/access_rules/rules/${ruleId}`
      : `/accounts/${this.config.accountId}/firewall/access_rules/rules/${ruleId}`;

    const response = await this.client.get(endpoint);

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to fetch IP access rule');
    }

    return response.data.result;
  }

  /**
   * Create IP access rule (block/whitelist IP)
   */
  async createIPAccessRule(rule: FirewallRule, zoneId?: string): Promise<any> {
    const endpoint = zoneId
      ? `/zones/${zoneId}/firewall/access_rules/rules`
      : `/accounts/${this.config.accountId}/firewall/access_rules/rules`;

    const response = await this.client.post(endpoint, {
      mode: rule.mode,
      configuration: rule.configuration,
      notes: rule.notes || '',
    });

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to create IP access rule');
    }

    return response.data.result;
  }

  /**
   * Update IP access rule
   */
  async updateIPAccessRule(ruleId: string, rule: Partial<FirewallRule>, zoneId?: string): Promise<any> {
    const endpoint = zoneId
      ? `/zones/${zoneId}/firewall/access_rules/rules/${ruleId}`
      : `/accounts/${this.config.accountId}/firewall/access_rules/rules/${ruleId}`;

    const response = await this.client.patch(endpoint, {
      mode: rule.mode,
      notes: rule.notes,
    });

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to update IP access rule');
    }

    return response.data.result;
  }

  /**
   * Delete IP access rule
   */
  async deleteIPAccessRule(ruleId: string, zoneId?: string): Promise<void> {
    const endpoint = zoneId
      ? `/zones/${zoneId}/firewall/access_rules/rules/${ruleId}`
      : `/accounts/${this.config.accountId}/firewall/access_rules/rules/${ruleId}`;

    const response = await this.client.delete(endpoint);

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Failed to delete IP access rule');
    }
  }

  /**
   * Block IP address
   */
  async blockIP(ip: string, notes?: string, zoneId?: string): Promise<any> {
    return this.createIPAccessRule(
      {
        mode: 'block',
        configuration: {
          target: 'ip',
          value: ip,
        },
        notes: notes || `Blocked by Nginx Love WAF - ${new Date().toISOString()}`,
      },
      zoneId
    );
  }

  /**
   * Whitelist IP address
   */
  async whitelistIP(ip: string, notes?: string, zoneId?: string): Promise<any> {
    return this.createIPAccessRule(
      {
        mode: 'whitelist',
        configuration: {
          target: 'ip',
          value: ip,
        },
        notes: notes || `Whitelisted by Nginx Love WAF - ${new Date().toISOString()}`,
      },
      zoneId
    );
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/user/tokens/verify');
      return true;
    } catch (error) {
      return false;
    }
  }
}
