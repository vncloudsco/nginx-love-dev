/**
 * Hello World Plugin
 * Example plugin demonstrating plugin system capabilities
 */

import { BasePlugin, PluginContext, PluginMetadata, PluginType } from '../../shared/plugin-sdk';
import { Router } from 'express';

interface HelloWorldConfig {
  greeting: string;
  enabled: boolean;
}

export default class HelloWorldPlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'hello-world',
    name: 'Hello World Plugin',
    version: '1.0.0',
    description: 'A simple example plugin demonstrating plugin system capabilities',
    author: {
      name: 'Nginx Love Team',
      email: 'dev@nginxlove.com'
    },
    type: PluginType.FEATURE,
    license: 'MIT'
  };

  /**
   * Initialize plugin
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    const config = this.getConfig<HelloWorldConfig>();
    this.log('info', `${config.greeting || 'Hello'} from Hello World Plugin!`);

    // Register custom routes
    await this.registerRoutes();

    // Setup event listeners
    this.setupEventListeners();

    // Save initialization data
    await context.storage.set('initialized_at', new Date().toISOString());
    await context.storage.set('initialization_count', await this.getInitCount() + 1);

    this.log('info', 'Hello World Plugin initialized successfully');
  }

  /**
   * Register custom routes
   */
  private async registerRoutes(): Promise<void> {
    const router = Router();

    // GET /api/plugins/hello-world/hello
    router.get('/hello', (req, res) => {
      const config = this.getConfig<HelloWorldConfig>();
      res.json({
        success: true,
        data: {
          message: `${config.greeting || 'Hello'} World!`,
          plugin: this.metadata.name,
          version: this.metadata.version
        }
      });
    });

    // GET /api/plugins/hello-world/stats
    router.get('/stats', async (req, res) => {
      try {
        const stats = await this.getStats();
        res.json({
          success: true,
          data: stats
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // POST /api/plugins/hello-world/greet
    router.post('/greet', (req, res) => {
      const { name } = req.body;
      const config = this.getConfig<HelloWorldConfig>();
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'name is required'
        });
      }

      res.json({
        success: true,
        data: {
          message: `${config.greeting || 'Hello'}, ${name}!`
        }
      });
    });

    this.context?.api.registerRoute('', router);
    this.log('info', 'Routes registered successfully');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.context) return;

    // Listen to domain creation
    this.context.events.on('domain:created', this.handleDomainCreated.bind(this));

    this.log('debug', 'Event listeners registered');
  }

  /**
   * Handle domain created event
   */
  private async handleDomainCreated(data: any): Promise<void> {
    this.log('info', `Domain created: ${data.name}`);
    
    const config = this.getConfig<HelloWorldConfig>();
    this.log('info', `${config.greeting || 'Hello'} new domain: ${data.name}!`);

    // Store domain creation event
    const domainCount = await this.context?.storage.get('domain_count') || 0;
    await this.context?.storage.set('domain_count', domainCount + 1);
  }

  /**
   * Get plugin statistics
   */
  private async getStats(): Promise<any> {
    const initCount = await this.context?.storage.get('initialization_count') || 0;
    const domainCount = await this.context?.storage.get('domain_count') || 0;
    const initializedAt = await this.context?.storage.get('initialized_at');
    
    // Get total domains from database
    const totalDomains = await this.context?.db.domain.count() || 0;

    return {
      plugin: this.metadata.name,
      version: this.metadata.version,
      initializationCount: initCount,
      domainsCreatedSinceInit: domainCount,
      totalDomains,
      initializedAt,
      uptime: initializedAt 
        ? Math.floor((Date.now() - new Date(initializedAt).getTime()) / 1000)
        : 0
    };
  }

  /**
   * Get initialization count
   */
  private async getInitCount(): Promise<number> {
    return await this.context?.storage.get('initialization_count') || 0;
  }

  /**
   * Destroy plugin
   */
  async destroy(): Promise<void> {
    this.log('info', 'Destroying Hello World Plugin...');

    // Remove event listeners
    if (this.context) {
      this.context.events.off('domain:created', this.handleDomainCreated.bind(this));
    }

    this.log('info', 'Goodbye from Hello World Plugin!');
    await super.destroy();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const initialized = await this.context?.storage.has('initialized_at');
      
      if (!initialized) {
        return {
          healthy: false,
          message: 'Plugin not properly initialized'
        };
      }

      const config = this.getConfig<HelloWorldConfig>();
      if (!config.enabled) {
        return {
          healthy: false,
          message: 'Plugin is disabled in config'
        };
      }

      return {
        healthy: true,
        message: 'Plugin is healthy and running'
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: `Health check failed: ${error.message}`
      };
    }
  }

  /**
   * Lifecycle: On Install
   */
  async onInstall(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin installed');
    
    // Set initial data
    await context.storage.set('install_date', new Date().toISOString());
    await context.storage.set('initialization_count', 0);
    await context.storage.set('domain_count', 0);
  }

  /**
   * Lifecycle: On Uninstall
   */
  async onUninstall(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin uninstalling, cleaning up...');
    
    // Clear all storage
    await context.storage.clear();
  }

  /**
   * Lifecycle: On Activate
   */
  async onActivate(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin activated');
  }

  /**
   * Lifecycle: On Deactivate
   */
  async onDeactivate(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin deactivated');
  }

  /**
   * Lifecycle: On Config Change
   */
  async onConfigChange(
    context: PluginContext,
    oldConfig: HelloWorldConfig,
    newConfig: HelloWorldConfig
  ): Promise<void> {
    this.log('info', 'Plugin config changed');
    this.log('debug', `Old greeting: ${oldConfig.greeting}`);
    this.log('debug', `New greeting: ${newConfig.greeting}`);
  }
}
