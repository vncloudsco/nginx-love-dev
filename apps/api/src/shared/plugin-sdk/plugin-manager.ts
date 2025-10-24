/**
 * Plugin Manager
 * Quản lý lifecycle của plugins: install, uninstall, activate, deactivate
 */

import { Application } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PluginLoader } from './plugin-loader';
import { createPluginContext } from './plugin-context';
import { 
  IPlugin, 
  PluginConfig, 
  PluginStatus, 
  PluginMetadata,
  PluginInstallOptions,
  PluginValidationResult
} from './types';
import logger from '../../utils/logger';

export class PluginManager {
  private app: Application;
  private db: any;
  private loader: PluginLoader;
  private pluginsDir: string;
  private activePlugins: Map<string, IPlugin> = new Map();

  constructor(app: Application, db: any, pluginsDir: string) {
    this.app = app;
    this.db = db;
    this.pluginsDir = pluginsDir;
    this.loader = new PluginLoader(pluginsDir);
  }

  /**
   * Initialize plugin manager
   * Load và activate tất cả plugins enabled từ database
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Plugin Manager...');

      // Ensure plugins directory exists
      await fs.mkdir(this.pluginsDir, { recursive: true });

      // Load all enabled plugins from database
      const enabledPlugins = await this.db.plugin.findMany({
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
          await this.db.plugin.update({
            where: { id: pluginRecord.id },
            data: { status: PluginStatus.ERROR }
          });
        }
      }

      logger.info('Plugin Manager initialized successfully');
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
      const existing = await this.db.plugin.findUnique({
        where: { id: metadata.id }
      });

      if (existing && !options.force) {
        throw new Error(`Plugin ${metadata.id} already installed. Use force option to reinstall.`);
      }

      // Save to database
      await this.db.plugin.upsert({
        where: { id: metadata.id },
        update: {
          name: metadata.name,
          version: metadata.version,
          description: metadata.description,
          author: JSON.stringify(metadata.author),
          type: metadata.type,
          metadata: JSON.stringify(metadata),
          status: PluginStatus.INACTIVE,
          enabled: false,
          updatedAt: new Date()
        },
        create: {
          id: metadata.id,
          name: metadata.name,
          version: metadata.version,
          description: metadata.description,
          author: JSON.stringify(metadata.author),
          type: metadata.type,
          metadata: JSON.stringify(metadata),
          status: PluginStatus.INACTIVE,
          enabled: false,
          config: null
        }
      });

      // Call onInstall lifecycle hook if plugin is already loaded
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
      const plugin = await this.db.plugin.findUnique({
        where: { id: pluginId }
      });

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

      // Delete from database
      await this.db.plugin.delete({
        where: { id: pluginId }
      });

      // Delete plugin storage
      await this.db.pluginStorage.deleteMany({
        where: { pluginId }
      });

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

      // Get plugin from database
      const pluginRecord = await this.db.plugin.findUnique({
        where: { id: pluginId }
      });

      if (!pluginRecord) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Load plugin
      const plugin = await this.loader.loadPlugin(pluginId);

      // Create context
      const config: PluginConfig = {
        enabled: true,
        settings: pluginRecord.config ? JSON.parse(pluginRecord.config) : {}
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

      // Update database
      await this.db.plugin.update({
        where: { id: pluginId },
        data: {
          enabled: true,
          status: PluginStatus.ACTIVE,
          updatedAt: new Date()
        }
      });

      logger.info(`Plugin ${pluginId} activated successfully`);

    } catch (error: any) {
      logger.error(`Failed to activate plugin ${pluginId}:`, error);
      
      // Update status to ERROR
      await this.db.plugin.update({
        where: { id: pluginId },
        data: { status: PluginStatus.ERROR }
      }).catch(() => {});

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

      // Create context for onDeactivate hook
      const pluginRecord = await this.db.plugin.findUnique({
        where: { id: pluginId }
      });

      if (pluginRecord) {
        const config: PluginConfig = {
          enabled: false,
          settings: pluginRecord.config ? JSON.parse(pluginRecord.config) : {}
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

      // Update database
      await this.db.plugin.update({
        where: { id: pluginId },
        data: {
          enabled: false,
          status: PluginStatus.INACTIVE,
          updatedAt: new Date()
        }
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
      const pluginRecord = await this.db.plugin.findUnique({
        where: { id: pluginId }
      });

      if (!pluginRecord) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      const oldConfig: PluginConfig = {
        enabled: pluginRecord.enabled,
        settings: pluginRecord.config ? JSON.parse(pluginRecord.config) : {}
      };

      const newConfig: PluginConfig = {
        enabled: pluginRecord.enabled,
        settings
      };

      // Update database
      await this.db.plugin.update({
        where: { id: pluginId },
        data: {
          config: JSON.stringify(settings),
          updatedAt: new Date()
        }
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
    const pluginRecord = await this.db.plugin.findUnique({
      where: { id: pluginId }
    });

    if (!pluginRecord) {
      return null;
    }

    const metadata = JSON.parse(pluginRecord.metadata);
    const isActive = this.activePlugins.has(pluginId);

    return {
      ...pluginRecord,
      metadata,
      isActive,
      config: pluginRecord.config ? JSON.parse(pluginRecord.config) : null
    };
  }

  /**
   * List all plugins
   */
  async listPlugins(): Promise<any[]> {
    const plugins = await this.db.plugin.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return plugins.map((p: any) => ({
      ...p,
      metadata: JSON.parse(p.metadata),
      isActive: this.activePlugins.has(p.id),
      config: p.config ? JSON.parse(p.config) : null
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
   * TODO: Implement actual download logic for different sources
   */
  private async downloadPlugin(options: PluginInstallOptions): Promise<string> {
    // This is a placeholder implementation
    // Real implementation should handle:
    // - npm packages
    // - URL downloads
    // - File uploads
    // - Marketplace downloads

    if (options.source === 'file' && options.filePath) {
      // Plugin already exists at filePath
      return options.filePath;
    }

    throw new Error(`Plugin download from ${options.source} not implemented yet`);
  }
}
