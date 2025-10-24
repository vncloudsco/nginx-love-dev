/**
 * Plugin Loader
 * Load và unload plugin từ file system
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { IPlugin, PluginMetadata, PluginPackage, PluginValidationResult } from './types';
import { PluginValidator } from './plugin-validator';
import logger from '../../utils/logger';

export class PluginLoader {
  private pluginsDir: string;
  private validator: PluginValidator;
  private loadedPlugins: Map<string, IPlugin> = new Map();

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
    this.validator = new PluginValidator();
  }

  /**
   * Load plugin từ directory
   */
  async loadPlugin(pluginId: string): Promise<IPlugin> {
    try {
      const pluginDir = path.join(this.pluginsDir, pluginId);
      
      // Check if plugin already loaded
      if (this.loadedPlugins.has(pluginId)) {
        logger.warn(`Plugin ${pluginId} is already loaded`);
        return this.loadedPlugins.get(pluginId)!;
      }

      // Check if plugin directory exists
      try {
        await fs.access(pluginDir);
      } catch {
        throw new Error(`Plugin directory not found: ${pluginDir}`);
      }

      // Load plugin.config.json
      const configPath = path.join(pluginDir, 'plugin.config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const pluginPackage: PluginPackage = JSON.parse(configContent);

      // Validate metadata
      const validationResult = await this.validator.validateMetadata(pluginPackage.metadata);
      if (!validationResult.valid) {
        throw new Error(`Plugin validation failed: ${validationResult.errors?.join(', ')}`);
      }

      // Load main file
      const mainFilePath = path.join(pluginDir, pluginPackage.mainFile);
      
      try {
        await fs.access(mainFilePath);
      } catch {
        throw new Error(`Plugin main file not found: ${mainFilePath}`);
      }

      // Import plugin module
      const pluginModule = await this.importPlugin(mainFilePath);

      if (!pluginModule.default) {
        throw new Error(`Plugin ${pluginId} must export a default class`);
      }

      // Create plugin instance
      const PluginClass = pluginModule.default;
      const plugin: IPlugin = new PluginClass();

      // Verify plugin implements IPlugin interface
      if (!plugin.metadata || !plugin.initialize || !plugin.destroy) {
        throw new Error(`Plugin ${pluginId} does not implement IPlugin interface`);
      }

      // Store loaded plugin
      this.loadedPlugins.set(pluginId, plugin);

      logger.info(`Plugin ${pluginId} loaded successfully`);
      return plugin;

    } catch (error: any) {
      logger.error(`Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Unload plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    
    if (!plugin) {
      logger.warn(`Plugin ${pluginId} is not loaded`);
      return;
    }

    try {
      // Call destroy lifecycle
      await plugin.destroy();

      // Remove from cache
      this.loadedPlugins.delete(pluginId);

      // Clear module cache
      const pluginDir = path.join(this.pluginsDir, pluginId);
      this.clearModuleCache(pluginDir);

      logger.info(`Plugin ${pluginId} unloaded successfully`);
    } catch (error: any) {
      logger.error(`Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Reload plugin
   */
  async reloadPlugin(pluginId: string): Promise<IPlugin> {
    await this.unloadPlugin(pluginId);
    return await this.loadPlugin(pluginId);
  }

  /**
   * Get loaded plugin
   */
  getPlugin(pluginId: string): IPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): Map<string, IPlugin> {
    return new Map(this.loadedPlugins);
  }

  /**
   * Check if plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId);
  }

  /**
   * Discover all plugins in plugins directory
   */
  async discoverPlugins(): Promise<PluginMetadata[]> {
    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      const plugins: PluginMetadata[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        try {
          const pluginId = entry.name;
          const configPath = path.join(this.pluginsDir, pluginId, 'plugin.config.json');
          
          const configContent = await fs.readFile(configPath, 'utf-8');
          const pluginPackage: PluginPackage = JSON.parse(configContent);
          
          plugins.push(pluginPackage.metadata);
        } catch (error) {
          logger.warn(`Failed to read plugin config for ${entry.name}:`, error);
        }
      }

      return plugins;
    } catch (error: any) {
      logger.error('Failed to discover plugins:', error);
      return [];
    }
  }

  /**
   * Import plugin module dynamically
   */
  private async importPlugin(mainFilePath: string): Promise<any> {
    // Use dynamic import to load plugin
    // Clear cache first to allow reloading
    const absolutePath = path.resolve(mainFilePath);
    delete require.cache[require.resolve(absolutePath)];
    
    return await import(absolutePath);
  }

  /**
   * Clear Node.js module cache for plugin
   */
  private clearModuleCache(pluginDir: string): void {
    const absolutePluginDir = path.resolve(pluginDir);
    
    Object.keys(require.cache).forEach(key => {
      if (key.startsWith(absolutePluginDir)) {
        delete require.cache[key];
      }
    });
  }

  /**
   * Validate plugin package before loading
   */
  async validatePlugin(pluginId: string): Promise<PluginValidationResult> {
    try {
      const pluginDir = path.join(this.pluginsDir, pluginId);
      
      // Check if plugin directory exists
      try {
        await fs.access(pluginDir);
      } catch {
        return {
          valid: false,
          errors: [`Plugin directory not found: ${pluginDir}`]
        };
      }

      // Load plugin.config.json
      const configPath = path.join(pluginDir, 'plugin.config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const pluginPackage: PluginPackage = JSON.parse(configContent);

      // Get all files in plugin directory
      const files = await this.getPluginFiles(pluginDir);

      // Validate
      return await this.validator.validate(pluginPackage.metadata, files);

    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }

  /**
   * Get all files in plugin directory (recursive)
   */
  private async getPluginFiles(dir: string, basePath: string = ''): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.getPluginFiles(path.join(dir, entry.name), relativePath);
        files.push(...subFiles);
      } else {
        files.push(relativePath);
      }
    }

    return files;
  }
}
