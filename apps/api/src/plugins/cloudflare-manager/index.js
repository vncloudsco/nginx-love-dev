var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var cloudflare_manager_exports = {};
__export(cloudflare_manager_exports, {
  default: () => CloudflareManagerPlugin
});
module.exports = __toCommonJS(cloudflare_manager_exports);
var import_plugin_sdk = require("../../shared/plugin-sdk");
var import_express = require("express");
var import_cloudflare_client = require("./services/cloudflare-client");
class CloudflareManagerPlugin extends import_plugin_sdk.BasePlugin {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "cloudflare-manager",
      name: "Cloudflare Manager",
      version: "1.0.0",
      description: "Manage Cloudflare DNS records and Firewall IP rules",
      author: {
        name: "Nginx Love Team",
        email: "dev@nginxlove.com"
      },
      type: import_plugin_sdk.PluginType.INTEGRATION,
      license: "MIT"
    };
    this.cfClient = null;
    this.syncTimer = null;
  }
  /**
   * Initialize plugin
   */
  async initialize(context) {
    this.context = context;
    const config = this.getConfig();
    if (!config.apiToken || !config.accountId) {
      throw new Error("Cloudflare API token and Account ID are required");
    }
    this.cfClient = new import_cloudflare_client.CloudflareClient({
      apiToken: config.apiToken,
      accountId: config.accountId,
      zoneId: config.zoneId
    });
    const isConnected = await this.cfClient.testConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to Cloudflare API. Please check your credentials.");
    }
    this.log("info", "Connected to Cloudflare API successfully");
    await this.registerRoutes();
    if (config.enableAutoSync) {
      await this.setupAutoSync();
    }
    await context.storage.set("initialized_at", (/* @__PURE__ */ new Date()).toISOString());
    await context.storage.set("last_sync", null);
    this.log("info", "Cloudflare Manager Plugin initialized successfully");
  }
  /**
   * Register API routes
   */
  async registerRoutes() {
    const router = (0, import_express.Router)();
    router.get("/zones", this.handleGetZones.bind(this));
    router.get("/zones/:zoneId", this.handleGetZone.bind(this));
    router.get("/zones/:zoneId/dns", this.handleListDNS.bind(this));
    router.get("/zones/:zoneId/dns/:recordId", this.handleGetDNS.bind(this));
    router.post("/zones/:zoneId/dns", this.handleCreateDNS.bind(this));
    router.put("/zones/:zoneId/dns/:recordId", this.handleUpdateDNS.bind(this));
    router.delete("/zones/:zoneId/dns/:recordId", this.handleDeleteDNS.bind(this));
    router.get("/firewall/rules", this.handleListFirewallRules.bind(this));
    router.get("/firewall/rules/:ruleId", this.handleGetFirewallRule.bind(this));
    router.post("/firewall/rules", this.handleCreateFirewallRule.bind(this));
    router.put("/firewall/rules/:ruleId", this.handleUpdateFirewallRule.bind(this));
    router.delete("/firewall/rules/:ruleId", this.handleDeleteFirewallRule.bind(this));
    router.post("/firewall/block-ip", this.handleBlockIP.bind(this));
    router.post("/firewall/whitelist-ip", this.handleWhitelistIP.bind(this));
    router.post("/sync", this.handleSync.bind(this));
    router.get("/stats", this.handleGetStats.bind(this));
    this.context?.api.registerRoute("", router);
    this.log("info", "Routes registered successfully");
  }
  // ==================== Route Handlers - Zones ====================
  async handleGetZones(req, res) {
    try {
      const zones = await this.cfClient.getZones();
      res.json({ success: true, data: zones });
    } catch (error) {
      this.log("error", `Failed to get zones: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async handleGetZone(req, res) {
    try {
      const { zoneId } = req.params;
      const zone = await this.cfClient.getZone(zoneId);
      res.json({ success: true, data: zone });
    } catch (error) {
      this.log("error", `Failed to get zone: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  // ==================== Route Handlers - DNS ====================
  async handleListDNS(req, res) {
    try {
      const { zoneId } = req.params;
      const { type, name } = req.query;
      const records = await this.cfClient.listDNSRecords(zoneId, {
        type,
        name
      });
      res.json({ success: true, data: records });
    } catch (error) {
      this.log("error", `Failed to list DNS records: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async handleGetDNS(req, res) {
    try {
      const { zoneId, recordId } = req.params;
      const record = await this.cfClient.getDNSRecord(zoneId, recordId);
      res.json({ success: true, data: record });
    } catch (error) {
      this.log("error", `Failed to get DNS record: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async handleCreateDNS(req, res) {
    try {
      const { zoneId } = req.params;
      const record = await this.cfClient.createDNSRecord(zoneId, req.body);
      const count = await this.context?.storage.get("dns_records_created") || 0;
      await this.context?.storage.set("dns_records_created", count + 1);
      this.log("info", `DNS record created: ${record.name}`);
      res.json({ success: true, data: record });
    } catch (error) {
      this.log("error", `Failed to create DNS record: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }
  async handleUpdateDNS(req, res) {
    try {
      const { zoneId, recordId } = req.params;
      const record = await this.cfClient.updateDNSRecord(zoneId, recordId, req.body);
      this.log("info", `DNS record updated: ${recordId}`);
      res.json({ success: true, data: record });
    } catch (error) {
      this.log("error", `Failed to update DNS record: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }
  async handleDeleteDNS(req, res) {
    try {
      const { zoneId, recordId } = req.params;
      await this.cfClient.deleteDNSRecord(zoneId, recordId);
      this.log("info", `DNS record deleted: ${recordId}`);
      res.json({ success: true, message: "DNS record deleted successfully" });
    } catch (error) {
      this.log("error", `Failed to delete DNS record: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }
  // ==================== Route Handlers - Firewall ====================
  async handleListFirewallRules(req, res) {
    try {
      const { zoneId } = req.query;
      const rules = await this.cfClient.listIPAccessRules(zoneId);
      res.json({ success: true, data: rules });
    } catch (error) {
      this.log("error", `Failed to list firewall rules: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async handleGetFirewallRule(req, res) {
    try {
      const { ruleId } = req.params;
      const { zoneId } = req.query;
      const rule = await this.cfClient.getIPAccessRule(ruleId, zoneId);
      res.json({ success: true, data: rule });
    } catch (error) {
      this.log("error", `Failed to get firewall rule: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async handleCreateFirewallRule(req, res) {
    try {
      const { zoneId } = req.query;
      const rule = await this.cfClient.createIPAccessRule(req.body, zoneId);
      const count = await this.context?.storage.get("firewall_rules_created") || 0;
      await this.context?.storage.set("firewall_rules_created", count + 1);
      this.log("info", `Firewall rule created: ${rule.configuration?.value}`);
      res.json({ success: true, data: rule });
    } catch (error) {
      this.log("error", `Failed to create firewall rule: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }
  async handleUpdateFirewallRule(req, res) {
    try {
      const { ruleId } = req.params;
      const { zoneId } = req.query;
      const rule = await this.cfClient.updateIPAccessRule(ruleId, req.body, zoneId);
      this.log("info", `Firewall rule updated: ${ruleId}`);
      res.json({ success: true, data: rule });
    } catch (error) {
      this.log("error", `Failed to update firewall rule: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }
  async handleDeleteFirewallRule(req, res) {
    try {
      const { ruleId } = req.params;
      const { zoneId } = req.query;
      await this.cfClient.deleteIPAccessRule(ruleId, zoneId);
      this.log("info", `Firewall rule deleted: ${ruleId}`);
      res.json({ success: true, message: "Firewall rule deleted successfully" });
    } catch (error) {
      this.log("error", `Failed to delete firewall rule: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }
  async handleBlockIP(req, res) {
    try {
      const { ip, notes, zoneId } = req.body;
      const rule = await this.cfClient.blockIP(ip, notes, zoneId);
      const count = await this.context?.storage.get("ips_blocked") || 0;
      await this.context?.storage.set("ips_blocked", count + 1);
      this.log("info", `IP blocked: ${ip}`);
      res.json({ success: true, data: rule, message: `IP ${ip} blocked successfully` });
    } catch (error) {
      this.log("error", `Failed to block IP: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }
  async handleWhitelistIP(req, res) {
    try {
      const { ip, notes, zoneId } = req.body;
      const rule = await this.cfClient.whitelistIP(ip, notes, zoneId);
      const count = await this.context?.storage.get("ips_whitelisted") || 0;
      await this.context?.storage.set("ips_whitelisted", count + 1);
      this.log("info", `IP whitelisted: ${ip}`);
      res.json({ success: true, data: rule, message: `IP ${ip} whitelisted successfully` });
    } catch (error) {
      this.log("error", `Failed to whitelist IP: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }
  // ==================== Sync & Stats ====================
  async handleSync(req, res) {
    try {
      await this.syncData();
      res.json({ success: true, message: "Sync completed successfully" });
    } catch (error) {
      this.log("error", `Sync failed: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async handleGetStats(req, res) {
    try {
      const stats = {
        plugin: this.metadata.name,
        version: this.metadata.version,
        initializedAt: await this.context?.storage.get("initialized_at"),
        lastSync: await this.context?.storage.get("last_sync"),
        dnsRecordsCreated: await this.context?.storage.get("dns_records_created") || 0,
        firewallRulesCreated: await this.context?.storage.get("firewall_rules_created") || 0,
        ipsBlocked: await this.context?.storage.get("ips_blocked") || 0,
        ipsWhitelisted: await this.context?.storage.get("ips_whitelisted") || 0
      };
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
  // ==================== Auto Sync ====================
  async setupAutoSync() {
    const config = this.getConfig();
    const interval = (config.syncInterval || 30) * 60 * 1e3;
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncData();
      } catch (error) {
        this.log("error", `Auto-sync failed: ${error.message}`);
      }
    }, interval);
    this.log("info", `Auto-sync enabled (interval: ${config.syncInterval} minutes)`);
  }
  async syncData() {
    this.log("info", "Starting sync...");
    await this.context?.storage.set("last_sync", (/* @__PURE__ */ new Date()).toISOString());
    this.log("info", "Sync completed");
  }
  // ==================== Lifecycle ====================
  async destroy() {
    this.log("info", "Destroying Cloudflare Manager Plugin...");
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.cfClient = null;
    await super.destroy();
  }
  async healthCheck() {
    try {
      if (!this.cfClient) {
        return { healthy: false, message: "Cloudflare client not initialized" };
      }
      const isConnected = await this.cfClient.testConnection();
      if (!isConnected) {
        return { healthy: false, message: "Cannot connect to Cloudflare API" };
      }
      return { healthy: true, message: "Connected to Cloudflare API" };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }
  async onInstall(context) {
    this.log("info", "Plugin installed");
    await context.storage.set("install_date", (/* @__PURE__ */ new Date()).toISOString());
    await context.storage.set("dns_records_created", 0);
    await context.storage.set("firewall_rules_created", 0);
    await context.storage.set("ips_blocked", 0);
    await context.storage.set("ips_whitelisted", 0);
  }
  async onUninstall(context) {
    this.log("info", "Plugin uninstalling, cleaning up...");
    await context.storage.clear();
  }
  async onConfigChange(context, oldConfig, newConfig) {
    this.log("info", "Configuration changed, reinitializing...");
    if (newConfig.apiToken && newConfig.accountId) {
      this.cfClient = new import_cloudflare_client.CloudflareClient({
        apiToken: newConfig.apiToken,
        accountId: newConfig.accountId,
        zoneId: newConfig.zoneId
      });
      const isConnected = await this.cfClient.testConnection();
      if (!isConnected) {
        this.log("error", "Failed to connect with new credentials");
        throw new Error("Invalid Cloudflare credentials");
      }
    }
    if (oldConfig.syncInterval !== newConfig.syncInterval || oldConfig.enableAutoSync !== newConfig.enableAutoSync) {
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }
      if (newConfig.enableAutoSync) {
        await this.setupAutoSync();
      }
    }
  }
}
//# sourceMappingURL=index.js.map
