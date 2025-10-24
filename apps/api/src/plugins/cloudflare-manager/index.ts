/**
 * Cloudflare Manager Plugin
 * Manage Cloudflare DNS records and Firewall IP rules
 */

import { BasePlugin, PluginContext, PluginMetadata, PluginType } from '../../shared/plugin-sdk';
import { Router, Request, Response } from 'express';
import { CloudflareClient, CloudflareConfig } from './services/cloudflare-client';

interface CloudflareManagerConfig extends CloudflareConfig {
  syncInterval?: number;
  enableAutoSync?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export default class CloudflareManagerPlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'cloudflare-manager',
    name: 'Cloudflare Manager',
    version: '1.0.0',
    description: 'Manage Cloudflare DNS records and Firewall IP rules',
    author: {
      name: 'Nginx Love Team',
      email: 'dev@nginxlove.com',
    },
    type: PluginType.INTEGRATION,
    license: 'MIT',
  };

  private cfClient: CloudflareClient | null = null;
  private syncTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize plugin
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    const config = this.getConfig<CloudflareManagerConfig>();

    // Validate config
    if (!config.apiToken || !config.accountId) {
      throw new Error('Cloudflare API token and Account ID are required');
    }

    // Initialize Cloudflare client
    this.cfClient = new CloudflareClient({
      apiToken: config.apiToken,
      accountId: config.accountId,
      zoneId: config.zoneId,
    });

    // Test connection
    const isConnected = await this.cfClient.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Cloudflare API. Please check your credentials.');
    }

    this.log('info', 'Connected to Cloudflare API successfully');

    // Register routes
    await this.registerRoutes();

    // Setup auto-sync if enabled
    if (config.enableAutoSync) {
      await this.setupAutoSync();
    }

    // Store initialization timestamp
    await context.storage.set('initialized_at', new Date().toISOString());
    await context.storage.set('last_sync', null);

    this.log('info', 'Cloudflare Manager Plugin initialized successfully');
  }

  /**
   * Register API routes
   */
  private async registerRoutes(): Promise<void> {
    const router = Router();

    // ==================== Zones ====================
    
    // GET /api/plugins/cloudflare-manager/zones
    router.get('/zones', this.handleGetZones.bind(this));

    // GET /api/plugins/cloudflare-manager/zones/:zoneId
    router.get('/zones/:zoneId', this.handleGetZone.bind(this));

    // ==================== DNS Records ====================

    // GET /api/plugins/cloudflare-manager/zones/:zoneId/dns
    router.get('/zones/:zoneId/dns', this.handleListDNS.bind(this));

    // GET /api/plugins/cloudflare-manager/zones/:zoneId/dns/:recordId
    router.get('/zones/:zoneId/dns/:recordId', this.handleGetDNS.bind(this));

    // POST /api/plugins/cloudflare-manager/zones/:zoneId/dns
    router.post('/zones/:zoneId/dns', this.handleCreateDNS.bind(this));

    // PUT /api/plugins/cloudflare-manager/zones/:zoneId/dns/:recordId
    router.put('/zones/:zoneId/dns/:recordId', this.handleUpdateDNS.bind(this));

    // DELETE /api/plugins/cloudflare-manager/zones/:zoneId/dns/:recordId
    router.delete('/zones/:zoneId/dns/:recordId', this.handleDeleteDNS.bind(this));

    // ==================== Firewall Rules ====================

    // GET /api/plugins/cloudflare-manager/firewall/rules
    router.get('/firewall/rules', this.handleListFirewallRules.bind(this));

    // GET /api/plugins/cloudflare-manager/firewall/rules/:ruleId
    router.get('/firewall/rules/:ruleId', this.handleGetFirewallRule.bind(this));

    // POST /api/plugins/cloudflare-manager/firewall/rules
    router.post('/firewall/rules', this.handleCreateFirewallRule.bind(this));

    // PUT /api/plugins/cloudflare-manager/firewall/rules/:ruleId
    router.put('/firewall/rules/:ruleId', this.handleUpdateFirewallRule.bind(this));

    // DELETE /api/plugins/cloudflare-manager/firewall/rules/:ruleId
    router.delete('/firewall/rules/:ruleId', this.handleDeleteFirewallRule.bind(this));

    // POST /api/plugins/cloudflare-manager/firewall/block-ip
    router.post('/firewall/block-ip', this.handleBlockIP.bind(this));

    // POST /api/plugins/cloudflare-manager/firewall/whitelist-ip
    router.post('/firewall/whitelist-ip', this.handleWhitelistIP.bind(this));

    // ==================== Sync ====================

    // POST /api/plugins/cloudflare-manager/sync
    router.post('/sync', this.handleSync.bind(this));

    // GET /api/plugins/cloudflare-manager/stats
    router.get('/stats', this.handleGetStats.bind(this));

    this.context?.api.registerRoute('', router);
    this.log('info', 'Routes registered successfully');
  }

  // ==================== Route Handlers - Zones ====================

  private async handleGetZones(req: Request, res: Response): Promise<void> {
    try {
      const zones = await this.cfClient!.getZones();
      res.json({ success: true, data: zones });
    } catch (error: any) {
      this.log('error', `Failed to get zones: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleGetZone(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.params;
      const zone = await this.cfClient!.getZone(zoneId);
      res.json({ success: true, data: zone });
    } catch (error: any) {
      this.log('error', `Failed to get zone: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==================== Route Handlers - DNS ====================

  private async handleListDNS(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.params;
      const { type, name } = req.query;
      const records = await this.cfClient!.listDNSRecords(zoneId, {
        type: type as string,
        name: name as string,
      });
      res.json({ success: true, data: records });
    } catch (error: any) {
      this.log('error', `Failed to list DNS records: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleGetDNS(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, recordId } = req.params;
      const record = await this.cfClient!.getDNSRecord(zoneId, recordId);
      res.json({ success: true, data: record });
    } catch (error: any) {
      this.log('error', `Failed to get DNS record: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleCreateDNS(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.params;
      const record = await this.cfClient!.createDNSRecord(zoneId, req.body);
      
      // Increment counter
      const count = (await this.context?.storage.get('dns_records_created')) || 0;
      await this.context?.storage.set('dns_records_created', count + 1);

      this.log('info', `DNS record created: ${record.name}`);
      res.json({ success: true, data: record });
    } catch (error: any) {
      this.log('error', `Failed to create DNS record: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  private async handleUpdateDNS(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, recordId } = req.params;
      const record = await this.cfClient!.updateDNSRecord(zoneId, recordId, req.body);
      this.log('info', `DNS record updated: ${recordId}`);
      res.json({ success: true, data: record });
    } catch (error: any) {
      this.log('error', `Failed to update DNS record: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  private async handleDeleteDNS(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, recordId } = req.params;
      await this.cfClient!.deleteDNSRecord(zoneId, recordId);
      this.log('info', `DNS record deleted: ${recordId}`);
      res.json({ success: true, message: 'DNS record deleted successfully' });
    } catch (error: any) {
      this.log('error', `Failed to delete DNS record: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ==================== Route Handlers - Firewall ====================

  private async handleListFirewallRules(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.query;
      const rules = await this.cfClient!.listIPAccessRules(zoneId as string);
      res.json({ success: true, data: rules });
    } catch (error: any) {
      this.log('error', `Failed to list firewall rules: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleGetFirewallRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const { zoneId } = req.query;
      const rule = await this.cfClient!.getIPAccessRule(ruleId, zoneId as string);
      res.json({ success: true, data: rule });
    } catch (error: any) {
      this.log('error', `Failed to get firewall rule: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleCreateFirewallRule(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.query;
      const rule = await this.cfClient!.createIPAccessRule(req.body, zoneId as string);
      
      // Increment counter
      const count = (await this.context?.storage.get('firewall_rules_created')) || 0;
      await this.context?.storage.set('firewall_rules_created', count + 1);

      this.log('info', `Firewall rule created: ${rule.configuration?.value}`);
      res.json({ success: true, data: rule });
    } catch (error: any) {
      this.log('error', `Failed to create firewall rule: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  private async handleUpdateFirewallRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const { zoneId } = req.query;
      const rule = await this.cfClient!.updateIPAccessRule(ruleId, req.body, zoneId as string);
      this.log('info', `Firewall rule updated: ${ruleId}`);
      res.json({ success: true, data: rule });
    } catch (error: any) {
      this.log('error', `Failed to update firewall rule: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  private async handleDeleteFirewallRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const { zoneId } = req.query;
      await this.cfClient!.deleteIPAccessRule(ruleId, zoneId as string);
      this.log('info', `Firewall rule deleted: ${ruleId}`);
      res.json({ success: true, message: 'Firewall rule deleted successfully' });
    } catch (error: any) {
      this.log('error', `Failed to delete firewall rule: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  private async handleBlockIP(req: Request, res: Response): Promise<void> {
    try {
      const { ip, notes, zoneId } = req.body;
      const rule = await this.cfClient!.blockIP(ip, notes, zoneId);
      
      const count = (await this.context?.storage.get('ips_blocked')) || 0;
      await this.context?.storage.set('ips_blocked', count + 1);

      this.log('info', `IP blocked: ${ip}`);
      res.json({ success: true, data: rule, message: `IP ${ip} blocked successfully` });
    } catch (error: any) {
      this.log('error', `Failed to block IP: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  private async handleWhitelistIP(req: Request, res: Response): Promise<void> {
    try {
      const { ip, notes, zoneId } = req.body;
      const rule = await this.cfClient!.whitelistIP(ip, notes, zoneId);
      
      const count = (await this.context?.storage.get('ips_whitelisted')) || 0;
      await this.context?.storage.set('ips_whitelisted', count + 1);

      this.log('info', `IP whitelisted: ${ip}`);
      res.json({ success: true, data: rule, message: `IP ${ip} whitelisted successfully` });
    } catch (error: any) {
      this.log('error', `Failed to whitelist IP: ${error.message}`);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ==================== Sync & Stats ====================

  private async handleSync(req: Request, res: Response): Promise<void> {
    try {
      await this.syncData();
      res.json({ success: true, message: 'Sync completed successfully' });
    } catch (error: any) {
      this.log('error', `Sync failed: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleGetStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = {
        plugin: this.metadata.name,
        version: this.metadata.version,
        initializedAt: await this.context?.storage.get('initialized_at'),
        lastSync: await this.context?.storage.get('last_sync'),
        dnsRecordsCreated: (await this.context?.storage.get('dns_records_created')) || 0,
        firewallRulesCreated: (await this.context?.storage.get('firewall_rules_created')) || 0,
        ipsBlocked: (await this.context?.storage.get('ips_blocked')) || 0,
        ipsWhitelisted: (await this.context?.storage.get('ips_whitelisted')) || 0,
      };
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==================== Auto Sync ====================

  private async setupAutoSync(): Promise<void> {
    const config = this.getConfig<CloudflareManagerConfig>();
    const interval = (config.syncInterval || 30) * 60 * 1000; // Convert to ms

    this.syncTimer = setInterval(async () => {
      try {
        await this.syncData();
      } catch (error: any) {
        this.log('error', `Auto-sync failed: ${error.message}`);
      }
    }, interval);

    this.log('info', `Auto-sync enabled (interval: ${config.syncInterval} minutes)`);
  }

  private async syncData(): Promise<void> {
    this.log('info', 'Starting sync...');
    
    // Here you can implement logic to sync data to local storage/database
    // For now, just update last sync timestamp
    
    await this.context?.storage.set('last_sync', new Date().toISOString());
    this.log('info', 'Sync completed');
  }

  // ==================== Lifecycle ====================

  async destroy(): Promise<void> {
    this.log('info', 'Destroying Cloudflare Manager Plugin...');

    // Clear sync timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    // Clear client
    this.cfClient = null;

    await super.destroy();
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      if (!this.cfClient) {
        return { healthy: false, message: 'Cloudflare client not initialized' };
      }

      const isConnected = await this.cfClient.testConnection();
      
      if (!isConnected) {
        return { healthy: false, message: 'Cannot connect to Cloudflare API' };
      }

      return { healthy: true, message: 'Connected to Cloudflare API' };
    } catch (error: any) {
      return { healthy: false, message: error.message };
    }
  }

  async onInstall(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin installed');
    await context.storage.set('install_date', new Date().toISOString());
    await context.storage.set('dns_records_created', 0);
    await context.storage.set('firewall_rules_created', 0);
    await context.storage.set('ips_blocked', 0);
    await context.storage.set('ips_whitelisted', 0);
  }

  async onUninstall(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin uninstalling, cleaning up...');
    await context.storage.clear();
  }

  async onConfigChange(
    context: PluginContext,
    oldConfig: any,
    newConfig: any
  ): Promise<void> {
    this.log('info', 'Configuration changed, reinitializing...');

    // Reinitialize client with new config
    if (newConfig.apiToken && newConfig.accountId) {
      this.cfClient = new CloudflareClient({
        apiToken: newConfig.apiToken,
        accountId: newConfig.accountId,
        zoneId: newConfig.zoneId,
      });

      // Test new connection
      const isConnected = await this.cfClient.testConnection();
      if (!isConnected) {
        this.log('error', 'Failed to connect with new credentials');
        throw new Error('Invalid Cloudflare credentials');
      }
    }

    // Restart auto-sync if settings changed
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
