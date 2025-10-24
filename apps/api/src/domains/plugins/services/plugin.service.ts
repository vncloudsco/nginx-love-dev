/**
 * Plugin Service
 * Business logic cho plugin management
 */

import { PluginManagerV2 } from '../../../shared/plugin-sdk';
import { PluginInstallOptions, PluginMetadata } from '../../../shared/plugin-sdk/types';
import logger from '../../../utils/logger';

export class PluginService {
  private pluginManager: PluginManagerV2;

  constructor(pluginManager: PluginManagerV2) {
    this.pluginManager = pluginManager;
  }

  /**
   * Get all plugins
   */
  async getAllPlugins() {
    try {
      return await this.pluginManager.listPlugins();
    } catch (error: any) {
      logger.error('Error getting all plugins:', error);
      throw new Error(`Failed to get plugins: ${error.message}`);
    }
  }

  /**
   * Get plugin by ID
   */
  async getPluginById(pluginId: string) {
    try {
      const plugin = await this.pluginManager.getPluginInfo(pluginId);
      if (!plugin) {
        throw new Error('Plugin not found');
      }
      return plugin;
    } catch (error: any) {
      logger.error(`Error getting plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Install plugin
   */
  async installPlugin(options: PluginInstallOptions): Promise<PluginMetadata> {
    try {
      logger.info('Installing plugin:', options);
      return await this.pluginManager.installPlugin(options);
    } catch (error: any) {
      logger.error('Error installing plugin:', error);
      throw new Error(`Failed to install plugin: ${error.message}`);
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(pluginId: string) {
    try {
      logger.info(`Uninstalling plugin ${pluginId}`);
      await this.pluginManager.uninstallPlugin(pluginId);
      return { success: true, message: 'Plugin uninstalled successfully' };
    } catch (error: any) {
      logger.error(`Error uninstalling plugin ${pluginId}:`, error);
      throw new Error(`Failed to uninstall plugin: ${error.message}`);
    }
  }

  /**
   * Activate plugin
   */
  async activatePlugin(pluginId: string) {
    try {
      logger.info(`Activating plugin ${pluginId}`);
      await this.pluginManager.activatePlugin(pluginId);
      return { success: true, message: 'Plugin activated successfully' };
    } catch (error: any) {
      logger.error(`Error activating plugin ${pluginId}:`, error);
      throw new Error(`Failed to activate plugin: ${error.message}`);
    }
  }

  /**
   * Deactivate plugin
   */
  async deactivatePlugin(pluginId: string) {
    try {
      logger.info(`Deactivating plugin ${pluginId}`);
      await this.pluginManager.deactivatePlugin(pluginId);
      return { success: true, message: 'Plugin deactivated successfully' };
    } catch (error: any) {
      logger.error(`Error deactivating plugin ${pluginId}:`, error);
      throw new Error(`Failed to deactivate plugin: ${error.message}`);
    }
  }

  /**
   * Update plugin config
   */
  async updatePluginConfig(pluginId: string, settings: Record<string, any>) {
    try {
      logger.info(`Updating config for plugin ${pluginId}`);
      await this.pluginManager.updatePluginConfig(pluginId, settings);
      return { success: true, message: 'Plugin config updated successfully' };
    } catch (error: any) {
      logger.error(`Error updating plugin config ${pluginId}:`, error);
      throw new Error(`Failed to update plugin config: ${error.message}`);
    }
  }

  /**
   * Get plugin health status
   */
  async getPluginHealth(pluginId: string) {
    try {
      const activePlugins = this.pluginManager.getActivePlugins();
      const plugin = activePlugins.get(pluginId);

      if (!plugin) {
        return { healthy: false, message: 'Plugin is not active' };
      }

      if (plugin.healthCheck) {
        return await plugin.healthCheck();
      }

      return { healthy: true, message: 'No health check implemented' };
    } catch (error: any) {
      logger.error(`Error checking plugin health ${pluginId}:`, error);
      return { healthy: false, message: error.message };
    }
  }

  /**
   * Get all plugins health status
   */
  async getAllPluginsHealth() {
    try {
      const healthMap = await this.pluginManager.healthCheckAll();
      const healthArray = Array.from(healthMap.entries()).map(([pluginId, health]) => ({
        pluginId,
        ...health
      }));
      return healthArray;
    } catch (error: any) {
      logger.error('Error checking all plugins health:', error);
      throw new Error(`Failed to check plugins health: ${error.message}`);
    }
  }

  /**
   * Discover available plugins in plugins directory
   */
  async discoverPlugins() {
    try {
      // This would scan the plugins directory for new plugins
      // Not yet implemented in PluginLoader
      return { success: true, message: 'Plugin discovery not yet implemented' };
    } catch (error: any) {
      logger.error('Error discovering plugins:', error);
      throw new Error(`Failed to discover plugins: ${error.message}`);
    }
  }
}

export const createPluginService = (pluginManager: PluginManagerV2) => {
  return new PluginService(pluginManager);
};
