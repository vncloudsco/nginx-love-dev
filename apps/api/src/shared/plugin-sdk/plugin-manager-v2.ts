/**
 * Plugin Manager V2 - File-Based Storage
 * Quản lý lifecycle của plugins WITHOUT DATABASE!
 */

import { Application } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PluginLoader } from './plugin-loader';
import { createPluginContext } from './plugin-context';
import { PluginRegistry } from './plugin-registry';
import { 
  IPlugin, 
  PluginConfig, 
  PluginStatus, 
  PluginMetadata,
  PluginInstallOptions
} from './types';
import logger from '../../utils/logger';

export class PluginManagerV2 {
  private app: Application;
  private db: any; // Keep for plugin storage API
  private loader: PluginLoader;
  private registry: PluginRegistry;
  private pluginsDir: string;
  private activePlugins: Map<string, IPlugin> = new Map();

  constructor(app: Application, db: any, pluginsDir: string) {
    this.app = app;
    this.db = db;
    this.pluginsDir = pluginsDir;
    this.loader = new PluginLoader(pluginsDir);
    this.registry = new PluginRegistry(pluginsDir);
  }

  /**
   * Initialize plugin manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Plugin Manager V2 (File-Based)...');

      // Ensure plugins directory exists
      await fs.mkdir(this.pluginsDir, { recursive: true });

      // Load registry from file
      await this.registry.load();

      // Load all enabled plugins
      const enabledPlugins = this.registry.findMany({
        where: {
          enabled: true,
          status: PluginStatus.ACTIVE
        }
      });

      logger.info(`Found ${enabledPlugins.length} enabled plugins`);

      // Activate each plugin
      for (const pluginRecord of enabledPlugins) {
        try {
          await this.activatePlugin(pluginRecord.id);
        } catch (error: any) {
          logger.error(`Failed to activate plugin ${pluginRecord.id}:`, error);
          
          // Update status to ERROR
          await this.registry.update(pluginRecord.id, {
            status: PluginStatus.ERROR
          });
        }
      }

      logger.info('Plugin Manager V2 initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize Plugin Manager:', error);
      throw error;
    }
  }

  /**
   * Install plugin
   */
  async installPlugin(options: PluginInstallOptions): Promise<PluginMetadata> {
    try {
      logger.info(`Installing plugin from ${options.source}...`);

      // Download/extract plugin based on source
      const pluginDir = await this.downloadPlugin(options);

      // Load plugin config
      const configPath = path.join(pluginDir, 'plugin.config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const pluginPackage = JSON.parse(configContent);
      const metadata: PluginMetadata = pluginPackage.metadata;

      // Validate plugin
      if (!options.skipValidation) {
        const validation = await this.loader.validatePlugin(metadata.id);
        if (!validation.valid) {
          throw new Error(`Plugin validation failed: ${validation.errors?.join(', ')}`);
        }

        if (validation.warnings && validation.warnings.length > 0) {
          logger.warn(`Plugin validation warnings: ${validation.warnings.join(', ')}`);
        }
      }

      // Check if plugin already exists
      const existing = this.registry.findUnique(metadata.id);

      if (existing && !options.force) {
        throw new Error(`Plugin ${metadata.id} already installed. Use force option to reinstall.`);
      }

      // Save to registry (FILE, not database!)
      await this.registry.upsert(metadata.id, {
        id: metadata.id,
        name: metadata.name,
        version: metadata.version,
        description: metadata.description,
        author: JSON.stringify(metadata.author),
        type: metadata.type,
        metadata: metadata,
        status: PluginStatus.INACTIVE,
        enabled: false,
        config: null
      });

      // Call onInstall lifecycle hook
      try {
        const plugin = await this.loader.loadPlugin(metadata.id);
        if (plugin.onInstall) {
          const config: PluginConfig = { enabled: false, settings: {} };
          const context = createPluginContext(metadata.id, this.app, this.db, config);
          await plugin.onInstall(context);
        }
        await this.loader.unloadPlugin(metadata.id);
      } catch (error) {
        logger.warn(`Failed to call onInstall for plugin ${metadata.id}:`, error);
      }

      logger.info(`Plugin ${metadata.id} installed successfully`);
      return metadata;

    } catch (error: any) {
      logger.error('Failed to install plugin:', error);
      throw error;
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    try {
      logger.info(`Uninstalling plugin ${pluginId}...`);

      // Check if plugin exists
      const plugin = this.registry.findUnique(pluginId);

      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Deactivate if active
      if (this.activePlugins.has(pluginId)) {
        await this.deactivatePlugin(pluginId);
      }

      // Call onUninstall lifecycle hook
      try {
        const pluginInstance = await this.loader.loadPlugin(pluginId);
        if (pluginInstance.onUninstall) {
          const config: PluginConfig = { enabled: false, settings: {} };
          const context = createPluginContext(pluginId, this.app, this.db, config);
          await pluginInstance.onUninstall(context);
        }
        await this.loader.unloadPlugin(pluginId);
      } catch (error) {
        logger.warn(`Failed to call onUninstall for plugin ${pluginId}:`, error);
      }

      // Delete from registry
      await this.registry.delete(pluginId);

      // Delete plugin files
      const pluginDir = path.join(this.pluginsDir, pluginId);
      await fs.rm(pluginDir, { recursive: true, force: true });

      logger.info(`Plugin ${pluginId} uninstalled successfully`);

    } catch (error: any) {
      logger.error(`Failed to uninstall plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Activate plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    try {
      logger.info(`Activating plugin ${pluginId}...`);

      // Check if already active
      if (this.activePlugins.has(pluginId)) {
        logger.warn(`Plugin ${pluginId} is already active`);
        return;
      }

      // Get plugin from registry
      const pluginRecord = this.registry.findUnique(pluginId);

      if (!pluginRecord) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Load plugin
      const plugin = await this.loader.loadPlugin(pluginId);

      // Create context
      const config: PluginConfig = {
        enabled: true,
        settings: pluginRecord.config || {}
      };
      const context = createPluginContext(pluginId, this.app, this.db, config);

      // Call onActivate lifecycle hook
      if (plugin.onActivate) {
        await plugin.onActivate(context);
      }

      // Initialize plugin
      await plugin.initialize(context);

      // Store active plugin
      this.activePlugins.set(pluginId, plugin);

      // Update registry
      await this.registry.update(pluginId, {
        enabled: true,
        status: PluginStatus.ACTIVE
      });

      logger.info(`Plugin ${pluginId} activated successfully`);

    } catch (error: any) {
      logger.error(`Failed to activate plugin ${pluginId}:`, error);
      
      // Update status to ERROR
      try {
        await this.registry.update(pluginId, {
          status: PluginStatus.ERROR
        });
      } catch {}

      throw error;
    }
  }

  /**
   * Deactivate plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    try {
      logger.info(`Deactivating plugin ${pluginId}...`);

      const plugin = this.activePlugins.get(pluginId);
      
      if (!plugin) {
        logger.warn(`Plugin ${pluginId} is not active`);
        return;
      }

      // Get plugin record
      const pluginRecord = this.registry.findUnique(pluginId);

      if (pluginRecord) {
        const config: PluginConfig = {
          enabled: false,
          settings: pluginRecord.config || {}
        };
        const context = createPluginContext(pluginId, this.app, this.db, config);

        // Call onDeactivate lifecycle hook
        if (plugin.onDeactivate) {
          await plugin.onDeactivate(context);
        }
      }

      // Destroy plugin
      await plugin.destroy();

      // Remove from active plugins
      this.activePlugins.delete(pluginId);

      // Unload plugin
      await this.loader.unloadPlugin(pluginId);

      // Update registry
      await this.registry.update(pluginId, {
        enabled: false,
        status: PluginStatus.INACTIVE
      });

      logger.info(`Plugin ${pluginId} deactivated successfully`);

    } catch (error: any) {
      logger.error(`Failed to deactivate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Update plugin config
   */
  async updatePluginConfig(pluginId: string, settings: Record<string, any>): Promise<void> {
    try {
      const plugin = this.activePlugins.get(pluginId);
      const pluginRecord = this.registry.findUnique(pluginId);

      if (!pluginRecord) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      const oldConfig: PluginConfig = {
        enabled: pluginRecord.enabled,
        settings: pluginRecord.config || {}
      };

      const newConfig: PluginConfig = {
        enabled: pluginRecord.enabled,
        settings
      };

      // Update registry
      await this.registry.update(pluginId, {
        config: settings
      });

      // Call onConfigChange if plugin is active
      if (plugin && plugin.onConfigChange) {
        const context = createPluginContext(pluginId, this.app, this.db, newConfig);
        await plugin.onConfigChange(context, oldConfig, newConfig);
      }

      logger.info(`Plugin ${pluginId} config updated successfully`);

    } catch (error: any) {
      logger.error(`Failed to update plugin config for ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Get plugin info
   */
  async getPluginInfo(pluginId: string): Promise<any> {
    const pluginRecord = this.registry.findUnique(pluginId);

    if (!pluginRecord) {
      return null;
    }

    const isActive = this.activePlugins.has(pluginId);

    return {
      ...pluginRecord,
      isActive,
      config: pluginRecord.config
    };
  }

  /**
   * List all plugins
   */
  async listPlugins(): Promise<any[]> {
    const plugins = this.registry.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return plugins.map((p) => ({
      ...p,
      isActive: this.activePlugins.has(p.id)
    }));
  }

  /**
   * Get active plugins
   */
  getActivePlugins(): Map<string, IPlugin> {
    return new Map(this.activePlugins);
  }

  /**
   * Health check for all active plugins
   */
  async healthCheckAll(): Promise<Map<string, any>> {
    const results = new Map();

    for (const [pluginId, plugin] of this.activePlugins) {
      try {
        const result = plugin.healthCheck 
          ? await plugin.healthCheck()
          : { healthy: true, message: 'No health check implemented' };
        
        results.set(pluginId, result);
      } catch (error: any) {
        results.set(pluginId, { 
          healthy: false, 
          message: `Health check failed: ${error.message}` 
        });
      }
    }

    return results;
  }

  /**
   * Shutdown plugin manager
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Plugin Manager...');

    const pluginIds = Array.from(this.activePlugins.keys());
    
    for (const pluginId of pluginIds) {
      try {
        await this.deactivatePlugin(pluginId);
      } catch (error) {
        logger.error(`Failed to deactivate plugin ${pluginId} during shutdown:`, error);
      }
    }

    logger.info('Plugin Manager shut down successfully');
  }

  /**
   * Download plugin from source
   */
  private async downloadPlugin(options: PluginInstallOptions): Promise<string> {
    if (options.source === 'file' && options.filePath) {
      // Plugin already exists at filePath
      return options.filePath;
    }

    throw new Error(`Plugin download from ${options.source} not implemented yet`);
  }
}
