"use strict";
/**
 * Cloudflare API Client
 * Wrapper for Cloudflare API interactions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareClient = void 0;
const axios_1 = __importDefault(require("axios"));
class CloudflareClient {
    constructor(config) {
        this.config = config;
        this.client = axios_1.default.create({
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
    async getZones() {
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
    async getZone(zoneId) {
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
    async listDNSRecords(zoneId, params) {
        const response = await this.client.get(`/zones/${zoneId}/dns_records`, { params });
        if (!response.data.success) {
            throw new Error(response.data.errors?.[0]?.message || 'Failed to fetch DNS records');
        }
        return response.data.result;
    }
    /**
     * Get single DNS record
     */
    async getDNSRecord(zoneId, recordId) {
        const response = await this.client.get(`/zones/${zoneId}/dns_records/${recordId}`);
        if (!response.data.success) {
            throw new Error(response.data.errors?.[0]?.message || 'Failed to fetch DNS record');
        }
        return response.data.result;
    }
    /**
     * Create DNS record
     */
    async createDNSRecord(zoneId, record) {
        const response = await this.client.post(`/zones/${zoneId}/dns_records`, record);
        if (!response.data.success) {
            throw new Error(response.data.errors?.[0]?.message || 'Failed to create DNS record');
        }
        return response.data.result;
    }
    /**
     * Update DNS record
     */
    async updateDNSRecord(zoneId, recordId, record) {
        const response = await this.client.patch(`/zones/${zoneId}/dns_records/${recordId}`, record);
        if (!response.data.success) {
            throw new Error(response.data.errors?.[0]?.message || 'Failed to update DNS record');
        }
        return response.data.result;
    }
    /**
     * Delete DNS record
     */
    async deleteDNSRecord(zoneId, recordId) {
        const response = await this.client.delete(`/zones/${zoneId}/dns_records/${recordId}`);
        if (!response.data.success) {
            throw new Error(response.data.errors?.[0]?.message || 'Failed to delete DNS record');
        }
    }
    // ==================== Firewall Rules (IP Access Rules) ====================
    /**
     * List IP access rules
     */
    async listIPAccessRules(zoneId) {
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
    async getIPAccessRule(ruleId, zoneId) {
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
    async createIPAccessRule(rule, zoneId) {
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
    async updateIPAccessRule(ruleId, rule, zoneId) {
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
    async deleteIPAccessRule(ruleId, zoneId) {
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
    async blockIP(ip, notes, zoneId) {
        return this.createIPAccessRule({
            mode: 'block',
            configuration: {
                target: 'ip',
                value: ip,
            },
            notes: notes || `Blocked by Nginx Love WAF - ${new Date().toISOString()}`,
        }, zoneId);
    }
    /**
     * Whitelist IP address
     */
    async whitelistIP(ip, notes, zoneId) {
        return this.createIPAccessRule({
            mode: 'whitelist',
            configuration: {
                target: 'ip',
                value: ip,
            },
            notes: notes || `Whitelisted by Nginx Love WAF - ${new Date().toISOString()}`,
        }, zoneId);
    }
    /**
     * Test connection
     */
    async testConnection() {
        try {
            await this.client.get('/user/tokens/verify');
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.CloudflareClient = CloudflareClient;
