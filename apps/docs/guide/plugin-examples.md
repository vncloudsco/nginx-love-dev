# Plugin Examples

## Example 1: Simple Monitoring Plugin

Plugin cơ bản monitor số lượng domains và upstreams.

```typescript
import { BasePlugin, PluginContext, PluginMetadata } from '../../../shared/plugin-sdk';

export default class MonitoringPlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'simple-monitoring',
    name: 'Simple Monitoring Plugin',
    version: '1.0.0',
    description: 'Monitor domains and upstreams count',
    author: { name: 'Developer' },
    type: 'feature',
    license: 'MIT'
  };

  private timer: NodeJS.Timeout | null = null;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.log('info', 'Starting monitoring...');

    // Check every 60 seconds
    this.timer = setInterval(() => this.checkStats(), 60000);

    // Run immediately
    await this.checkStats();
  }

  async destroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await super.destroy();
  }

  private async checkStats(): Promise<void> {
    try {
      const domains = await this.context?.db.domain.count();
      const upstreams = await this.context?.db.upstream.count();
      const activeDomains = await this.context?.db.domain.count({
        where: { status: 'active' }
      });

      this.log('info', `Stats - Domains: ${domains}, Active: ${activeDomains}, Upstreams: ${upstreams}`);

      // Store stats
      await this.context?.storage.set('last_stats', {
        domains,
        activeDomains,
        upstreams,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.log('error', 'Failed to check stats:', error);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    const stats = await this.context?.storage.get('last_stats');
    if (!stats) {
      return { healthy: false, message: 'No stats collected yet' };
    }
    return { healthy: true, message: 'Monitoring is working' };
  }
}
```

---

## Example 2: Slack Notification Plugin

Plugin gửi thông báo alert tới Slack.

```typescript
import { BasePlugin, PluginContext, PluginMetadata } from '../../../shared/plugin-sdk';
import axios from 'axios';

interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username: string;
  enabled: boolean;
  notifyOn: {
    critical: boolean;
    warning: boolean;
    info: boolean;
  };
}

export default class SlackNotificationPlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'slack-notification',
    name: 'Slack Notification Plugin',
    version: '1.0.0',
    description: 'Send alerts to Slack',
    author: { name: 'Developer' },
    type: 'integration',
    license: 'MIT',
    configSchema: {
      type: 'object',
      properties: {
        webhookUrl: { type: 'string' },
        channel: { type: 'string', default: '#alerts' },
        username: { type: 'string', default: 'Nginx WAF Bot' },
        enabled: { type: 'boolean', default: true },
        notifyOn: {
          type: 'object',
          properties: {
            critical: { type: 'boolean', default: true },
            warning: { type: 'boolean', default: true },
            info: { type: 'boolean', default: false }
          }
        }
      },
      required: ['webhookUrl']
    }
  };

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    const config = this.getConfig<SlackConfig>();

    if (!config.enabled) {
      this.log('info', 'Slack notifications disabled');
      return;
    }

    // Register event listeners
    if (config.notifyOn.critical) {
      context.events.on('alert:critical', this.sendCriticalAlert.bind(this));
    }
    if (config.notifyOn.warning) {
      context.events.on('alert:warning', this.sendWarningAlert.bind(this));
    }
    if (config.notifyOn.info) {
      context.events.on('alert:info', this.sendInfoAlert.bind(this));
    }

    // Listen to domain events
    context.events.on('domain:created', this.onDomainCreated.bind(this));
    context.events.on('ssl:expiring', this.onSSLExpiring.bind(this));

    this.log('info', 'Slack notification plugin initialized');
  }

  async destroy(): Promise<void> {
    if (this.context) {
      this.context.events.off('alert:critical', this.sendCriticalAlert.bind(this));
      this.context.events.off('alert:warning', this.sendWarningAlert.bind(this));
      this.context.events.off('alert:info', this.sendInfoAlert.bind(this));
      this.context.events.off('domain:created', this.onDomainCreated.bind(this));
      this.context.events.off('ssl:expiring', this.onSSLExpiring.bind(this));
    }
    await super.destroy();
  }

  private async sendCriticalAlert(data: any): Promise<void> {
    await this.sendToSlack({
      color: 'danger',
      emoji: ':rotating_light:',
      title: '🚨 Critical Alert',
      message: data.message,
      fields: [
        { title: 'Severity', value: 'Critical', short: true },
        { title: 'Source', value: data.source, short: true }
      ]
    });
  }

  private async sendWarningAlert(data: any): Promise<void> {
    await this.sendToSlack({
      color: 'warning',
      emoji: ':warning:',
      title: '⚠️ Warning Alert',
      message: data.message,
      fields: [
        { title: 'Severity', value: 'Warning', short: true },
        { title: 'Source', value: data.source, short: true }
      ]
    });
  }

  private async sendInfoAlert(data: any): Promise<void> {
    await this.sendToSlack({
      color: 'good',
      emoji: ':information_source:',
      title: 'ℹ️ Info',
      message: data.message
    });
  }

  private async onDomainCreated(data: any): Promise<void> {
    await this.sendToSlack({
      color: 'good',
      emoji: ':white_check_mark:',
      title: '✅ Domain Created',
      message: `New domain **${data.name}** has been created`,
      fields: [
        { title: 'Domain', value: data.name, short: true },
        { title: 'Status', value: data.status, short: true }
      ]
    });
  }

  private async onSSLExpiring(data: any): Promise<void> {
    await this.sendToSlack({
      color: 'warning',
      emoji: ':warning:',
      title: '⚠️ SSL Certificate Expiring',
      message: `SSL certificate for **${data.domain}** expires in ${data.daysLeft} days`,
      fields: [
        { title: 'Domain', value: data.domain, short: true },
        { title: 'Days Left', value: String(data.daysLeft), short: true }
      ]
    });
  }

  private async sendToSlack(options: {
    color: string;
    emoji: string;
    title: string;
    message: string;
    fields?: Array<{ title: string; value: string; short?: boolean }>;
  }): Promise<void> {
    const config = this.getConfig<SlackConfig>();

    try {
      await axios.post(config.webhookUrl, {
        channel: config.channel,
        username: config.username,
        icon_emoji: options.emoji,
        attachments: [{
          color: options.color,
          title: options.title,
          text: options.message,
          fields: options.fields,
          ts: Math.floor(Date.now() / 1000)
        }]
      });

      this.log('info', 'Notification sent to Slack');

      // Track sent notifications
      const count = await this.context?.storage.get('notification_count') || 0;
      await this.context?.storage.set('notification_count', count + 1);

    } catch (error: any) {
      this.log('error', 'Failed to send Slack notification:', error);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    const config = this.getConfig<SlackConfig>();

    try {
      // Test webhook
      await axios.post(config.webhookUrl, {
        text: 'Health check from Nginx WAF Plugin'
      });

      return { healthy: true, message: 'Slack webhook is working' };
    } catch (error: any) {
      return { healthy: false, message: `Slack webhook failed: ${error.message}` };
    }
  }
}
```

---

## Example 3: Custom API Plugin

Plugin cung cấp custom API endpoints.

```typescript
import { BasePlugin, PluginContext, PluginMetadata } from '../../../shared/plugin-sdk';
import { Router } from 'express';

export default class CustomAPIPlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'custom-api',
    name: 'Custom API Plugin',
    version: '1.0.0',
    description: 'Custom REST API endpoints',
    author: { name: 'Developer' },
    type: 'feature',
    license: 'MIT'
  };

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    const router = Router();

    // GET /api/plugins/custom-api/stats
    router.get('/stats', async (req, res) => {
      try {
        const stats = await this.getSystemStats();
        res.json({ success: true, data: stats });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // GET /api/plugins/custom-api/domains
    router.get('/domains', async (req, res) => {
      try {
        const { status, search } = req.query;

        const where: any = {};
        if (status) where.status = status;
        if (search) where.name = { contains: search as string };

        const domains = await context.db.domain.findMany({
          where,
          include: {
            upstreams: true,
            sslCertificate: true
          },
          take: 50
        });

        res.json({ success: true, data: domains });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // GET /api/plugins/custom-api/domains/:id/health
    router.get('/domains/:id/health', async (req, res) => {
      try {
        const { id } = req.params;

        const domain = await context.db.domain.findUnique({
          where: { id },
          include: { upstreams: true }
        });

        if (!domain) {
          return res.status(404).json({ success: false, error: 'Domain not found' });
        }

        const health = {
          domain: domain.name,
          status: domain.status,
          upstreams: domain.upstreams.map(u => ({
            host: u.host,
            port: u.port,
            status: u.status
          })),
          sslEnabled: domain.sslEnabled,
          modsecEnabled: domain.modsecEnabled
        };

        res.json({ success: true, data: health });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // POST /api/plugins/custom-api/webhook
    router.post('/webhook', async (req, res) => {
      try {
        const { event, data } = req.body;

        // Validate input
        if (!event || !data) {
          return res.status(400).json({
            success: false,
            error: 'event and data are required'
          });
        }

        // Store webhook data
        await context.storage.set(`webhook:${Date.now()}`, {
          event,
          data,
          receivedAt: new Date().toISOString()
        });

        // Emit custom event
        context.events.emit(`custom-api:webhook:${event}`, data);

        this.log('info', `Webhook received: ${event}`);

        res.json({ success: true, message: 'Webhook processed' });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    context.api.registerRoute('', router);
    this.log('info', 'Custom API routes registered');
  }

  async destroy(): Promise<void> {
    await super.destroy();
  }

  private async getSystemStats(): Promise<any> {
    const [
      totalDomains,
      activeDomains,
      totalUpstreams,
      upstreamsUp,
      sslCertificates,
      expiringSSL
    ] = await Promise.all([
      this.context?.db.domain.count(),
      this.context?.db.domain.count({ where: { status: 'active' } }),
      this.context?.db.upstream.count(),
      this.context?.db.upstream.count({ where: { status: 'up' } }),
      this.context?.db.sSLCertificate.count(),
      this.context?.db.sSLCertificate.count({
        where: {
          validTo: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        }
      })
    ]);

    return {
      domains: {
        total: totalDomains,
        active: activeDomains
      },
      upstreams: {
        total: totalUpstreams,
        up: upstreamsUp
      },
      ssl: {
        total: sslCertificates,
        expiring: expiringSSL
      }
    };
  }
}
```

---

## Example 4: Background Task Plugin

Plugin chạy background tasks định kỳ.

```typescript
import { BasePlugin, PluginContext, PluginMetadata } from '../../../shared/plugin-sdk';

interface TaskConfig {
  enabled: boolean;
  interval: number; // seconds
  checkSSL: boolean;
  checkUpstreams: boolean;
  cleanupOldLogs: boolean;
}

export default class BackgroundTaskPlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'background-tasks',
    name: 'Background Task Plugin',
    version: '1.0.0',
    description: 'Run periodic background tasks',
    author: { name: 'Developer' },
    type: 'feature',
    license: 'MIT'
  };

  private timer: NodeJS.Timeout | null = null;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    const config = this.getConfig<TaskConfig>();

    if (!config.enabled) {
      this.log('info', 'Background tasks disabled');
      return;
    }

    // Start periodic tasks
    this.timer = setInterval(
      () => this.runTasks(),
      config.interval * 1000
    );

    // Run immediately
    await this.runTasks();

    this.log('info', `Background tasks started (interval: ${config.interval}s)`);
  }

  async destroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await super.destroy();
  }

  private async runTasks(): Promise<void> {
    const config = this.getConfig<TaskConfig>();
    this.log('debug', 'Running background tasks...');

    const tasks = [];

    if (config.checkSSL) {
      tasks.push(this.checkSSLCertificates());
    }

    if (config.checkUpstreams) {
      tasks.push(this.checkUpstreamStatus());
    }

    if (config.cleanupOldLogs) {
      tasks.push(this.cleanupOldLogs());
    }

    try {
      await Promise.all(tasks);
      await this.context?.storage.set('last_run', new Date().toISOString());
      this.log('info', 'Background tasks completed');
    } catch (error: any) {
      this.log('error', 'Background tasks failed:', error);
    }
  }

  private async checkSSLCertificates(): Promise<void> {
    this.log('debug', 'Checking SSL certificates...');

    const expiringSoon = await this.context?.db.sSLCertificate.findMany({
      where: {
        validTo: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        status: 'valid'
      },
      include: { domain: true }
    });

    if (expiringSoon && expiringSoon.length > 0) {
      this.log('warn', `Found ${expiringSoon.length} SSL certificates expiring soon`);

      for (const cert of expiringSoon) {
        const daysLeft = Math.floor(
          (cert.validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        this.context?.events.emit('ssl:expiring', {
          domain: cert.domain.name,
          daysLeft,
          validTo: cert.validTo
        });
      }
    }
  }

  private async checkUpstreamStatus(): Promise<void> {
    this.log('debug', 'Checking upstream status...');

    const downUpstreams = await this.context?.db.upstream.findMany({
      where: { status: 'down' },
      include: { domain: true }
    });

    if (downUpstreams && downUpstreams.length > 0) {
      this.log('warn', `Found ${downUpstreams.length} down upstreams`);

      for (const upstream of downUpstreams) {
        this.context?.events.emit('upstream:down', {
          domain: upstream.domain.name,
          host: upstream.host,
          port: upstream.port
        });
      }
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    this.log('debug', 'Cleaning up old logs...');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deleted = await this.context?.db.activityLog.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    });

    if (deleted && deleted.count > 0) {
      this.log('info', `Deleted ${deleted.count} old activity logs`);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    const lastRun = await this.context?.storage.get('last_run');

    if (!lastRun) {
      return { healthy: false, message: 'Tasks have not run yet' };
    }

    const lastRunDate = new Date(lastRun);
    const timeSinceLastRun = Date.now() - lastRunDate.getTime();
    const config = this.getConfig<TaskConfig>();
    const expectedInterval = config.interval * 1000 * 2; // 2x interval

    if (timeSinceLastRun > expectedInterval) {
      return {
        healthy: false,
        message: `Tasks not running (last run: ${lastRunDate.toISOString()})`
      };
    }

    return { healthy: true, message: 'Tasks running normally' };
  }
}
```

---

## Example 5: Database Export Plugin

Plugin export data sang JSON/CSV.

```typescript
import { BasePlugin, PluginContext, PluginMetadata } from '../../../shared/plugin-sdk';
import { Router } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

export default class DatabaseExportPlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'database-export',
    name: 'Database Export Plugin',
    version: '1.0.0',
    description: 'Export database data to JSON/CSV',
    author: { name: 'Developer' },
    type: 'feature',
    license: 'MIT'
  };

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    const router = Router();

    // POST /api/plugins/database-export/export
    router.post('/export', async (req, res) => {
      try {
        const { tables, format } = req.body;

        if (!tables || !Array.isArray(tables)) {
          return res.status(400).json({
            success: false,
            error: 'tables array is required'
          });
        }

        const exportData = await this.exportData(tables);
        const filename = `export_${Date.now()}.json`;

        // Store export info
        await context.storage.set(`export:${filename}`, {
          tables,
          format,
          createdAt: new Date().toISOString(),
          recordCount: Object.values(exportData).reduce((sum: number, arr: any) => sum + arr.length, 0)
        });

        res.json({
          success: true,
          data: exportData,
          filename
        });

      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // GET /api/plugins/database-export/history
    router.get('/history', async (req, res) => {
      try {
        const keys = await context.storage.keys();
        const exportKeys = keys.filter(k => k.startsWith('export:'));

        const history = await Promise.all(
          exportKeys.map(async key => {
            const data = await context.storage.get(key);
            return { filename: key.replace('export:', ''), ...data };
          })
        );

        res.json({ success: true, data: history });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    context.api.registerRoute('', router);
    this.log('info', 'Database export plugin initialized');
  }

  async destroy(): Promise<void> {
    await super.destroy();
  }

  private async exportData(tables: string[]): Promise<Record<string, any[]>> {
    const exportData: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        let data: any[] = [];

        switch (table) {
          case 'domains':
            data = await this.context?.db.domain.findMany({
              include: { upstreams: true }
            }) || [];
            break;

          case 'users':
            data = await this.context?.db.user.findMany({
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
                status: true,
                createdAt: true
              }
            }) || [];
            break;

          case 'alerts':
            data = await this.context?.db.alertHistory.findMany({
              take: 1000,
              orderBy: { timestamp: 'desc' }
            }) || [];
            break;

          case 'logs':
            data = await this.context?.db.activityLog.findMany({
              take: 1000,
              orderBy: { timestamp: 'desc' }
            }) || [];
            break;

          default:
            this.log('warn', `Unknown table: ${table}`);
        }

        exportData[table] = data;
        this.log('info', `Exported ${data.length} records from ${table}`);

      } catch (error: any) {
        this.log('error', `Failed to export ${table}:`, error);
        exportData[table] = [];
      }
    }

    return exportData;
  }
}
```

---

## Testing Plugins

### Test với cURL

```bash
# Test monitoring plugin
curl http://localhost:3001/api/plugins/simple-monitoring/health

# Test custom API
curl http://localhost:3001/api/plugins/custom-api/stats

# Test export plugin
curl -X POST http://localhost:3001/api/plugins/database-export/export \
  -H "Content-Type: application/json" \
  -d '{"tables": ["domains", "users"], "format": "json"}'
```

### Unit Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SlackNotificationPlugin from './slack-plugin';

describe('SlackNotificationPlugin', () => {
  let plugin: SlackNotificationPlugin;
  let mockContext: any;

  beforeEach(() => {
    plugin = new SlackNotificationPlugin();
    mockContext = {
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
      },
      storage: {
        get: vi.fn(),
        set: vi.fn()
      },
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
      },
      api: {
        registerRoute: vi.fn()
      }
    };
  });

  it('should initialize successfully', async () => {
    await expect(plugin.initialize(mockContext)).resolves.not.toThrow();
  });

  it('should register event listeners', async () => {
    await plugin.initialize(mockContext);
    expect(mockContext.events.on).toHaveBeenCalled();
  });
});
```
