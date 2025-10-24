var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var cloudflare_client_exports = {};
__export(cloudflare_client_exports, {
  CloudflareClient: () => CloudflareClient
});
module.exports = __toCommonJS(cloudflare_client_exports);
var import_axios = __toESM(require("axios"));
class CloudflareClient {
  constructor(config) {
    this.config = config;
    this.client = import_axios.default.create({
      baseURL: "https://api.cloudflare.com/client/v4",
      headers: {
        "Authorization": `Bearer ${config.apiToken}`,
        "Content-Type": "application/json"
      }
    });
  }
  /**
   * Get all zones for the account
   */
  async getZones() {
    const response = await this.client.get("/zones", {
      params: {
        account: {
          id: this.config.accountId
        }
      }
    });
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to fetch zones");
    }
    return response.data.result;
  }
  /**
   * Get zone by ID
   */
  async getZone(zoneId) {
    const response = await this.client.get(`/zones/${zoneId}`);
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to fetch zone");
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
      throw new Error(response.data.errors?.[0]?.message || "Failed to fetch DNS records");
    }
    return response.data.result;
  }
  /**
   * Get single DNS record
   */
  async getDNSRecord(zoneId, recordId) {
    const response = await this.client.get(`/zones/${zoneId}/dns_records/${recordId}`);
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to fetch DNS record");
    }
    return response.data.result;
  }
  /**
   * Create DNS record
   */
  async createDNSRecord(zoneId, record) {
    const response = await this.client.post(`/zones/${zoneId}/dns_records`, record);
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to create DNS record");
    }
    return response.data.result;
  }
  /**
   * Update DNS record
   */
  async updateDNSRecord(zoneId, recordId, record) {
    const response = await this.client.patch(`/zones/${zoneId}/dns_records/${recordId}`, record);
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to update DNS record");
    }
    return response.data.result;
  }
  /**
   * Delete DNS record
   */
  async deleteDNSRecord(zoneId, recordId) {
    const response = await this.client.delete(`/zones/${zoneId}/dns_records/${recordId}`);
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to delete DNS record");
    }
  }
  // ==================== Firewall Rules (IP Access Rules) ====================
  /**
   * List IP access rules
   */
  async listIPAccessRules(zoneId) {
    const endpoint = zoneId ? `/zones/${zoneId}/firewall/access_rules/rules` : `/accounts/${this.config.accountId}/firewall/access_rules/rules`;
    const response = await this.client.get(endpoint);
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to fetch IP access rules");
    }
    return response.data.result;
  }
  /**
   * Get single IP access rule
   */
  async getIPAccessRule(ruleId, zoneId) {
    const endpoint = zoneId ? `/zones/${zoneId}/firewall/access_rules/rules/${ruleId}` : `/accounts/${this.config.accountId}/firewall/access_rules/rules/${ruleId}`;
    const response = await this.client.get(endpoint);
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to fetch IP access rule");
    }
    return response.data.result;
  }
  /**
   * Create IP access rule (block/whitelist IP)
   */
  async createIPAccessRule(rule, zoneId) {
    const endpoint = zoneId ? `/zones/${zoneId}/firewall/access_rules/rules` : `/accounts/${this.config.accountId}/firewall/access_rules/rules`;
    const response = await this.client.post(endpoint, {
      mode: rule.mode,
      configuration: rule.configuration,
      notes: rule.notes || ""
    });
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to create IP access rule");
    }
    return response.data.result;
  }
  /**
   * Update IP access rule
   */
  async updateIPAccessRule(ruleId, rule, zoneId) {
    const endpoint = zoneId ? `/zones/${zoneId}/firewall/access_rules/rules/${ruleId}` : `/accounts/${this.config.accountId}/firewall/access_rules/rules/${ruleId}`;
    const response = await this.client.patch(endpoint, {
      mode: rule.mode,
      notes: rule.notes
    });
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to update IP access rule");
    }
    return response.data.result;
  }
  /**
   * Delete IP access rule
   */
  async deleteIPAccessRule(ruleId, zoneId) {
    const endpoint = zoneId ? `/zones/${zoneId}/firewall/access_rules/rules/${ruleId}` : `/accounts/${this.config.accountId}/firewall/access_rules/rules/${ruleId}`;
    const response = await this.client.delete(endpoint);
    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || "Failed to delete IP access rule");
    }
  }
  /**
   * Block IP address
   */
  async blockIP(ip, notes, zoneId) {
    return this.createIPAccessRule(
      {
        mode: "block",
        configuration: {
          target: "ip",
          value: ip
        },
        notes: notes || `Blocked by Nginx Love WAF - ${(/* @__PURE__ */ new Date()).toISOString()}`
      },
      zoneId
    );
  }
  /**
   * Whitelist IP address
   */
  async whitelistIP(ip, notes, zoneId) {
    return this.createIPAccessRule(
      {
        mode: "whitelist",
        configuration: {
          target: "ip",
          value: ip
        },
        notes: notes || `Whitelisted by Nginx Love WAF - ${(/* @__PURE__ */ new Date()).toISOString()}`
      },
      zoneId
    );
  }
  /**
   * Test connection
   */
  async testConnection() {
    try {
      await this.client.get("/user/tokens/verify");
      return true;
    } catch (error) {
      return false;
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CloudflareClient
});
//# sourceMappingURL=cloudflare-client.js.map
