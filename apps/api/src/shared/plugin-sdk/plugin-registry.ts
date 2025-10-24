/**
 * Plugin Registry - File-Based Storage
 * Lưu plugin metadata vào file thay vì database
 * KHÔNG CẦN MIGRATION!
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PluginMetadata, PluginStatus } from './types';
import logger from '../../utils/logger';

export interface PluginRecord {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string | any;
  type: string;
  metadata: PluginMetadata;
  status: PluginStatus;
  enabled: boolean;
  config: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * File-based Plugin Registry
 * Lưu trữ thông tin plugins trong file JSON
 */
export class PluginRegistry {
  private registryPath: string;
  private plugins: Map<string, PluginRecord> = new Map();

  constructor(pluginsDir: string) {
    this.registryPath = path.join(pluginsDir, 'plugin-registry.json');
  }

  /**
   * Load registry from file
   */
  async load(): Promise<void> {
    try {
      const exists = await fs.access(this.registryPath).then(() => true).catch(() => false);
      
      if (!exists) {
        logger.info('Plugin registry file not found, creating new one');
        await this.save();
        return;
      }

      const content = await fs.readFile(this.registryPath, 'utf-8');
      const data = JSON.parse(content);

      this.plugins.clear();
      for (const [id, record] of Object.entries(data.plugins || {})) {
        this.plugins.set(id, record as PluginRecord);
      }

      logger.info(`Loaded ${this.plugins.size} plugins from registry`);
    } catch (error: any) {
      logger.error('Failed to load plugin registry:', error);
      throw new Error(`Failed to load plugin registry: ${error.message}`);
    }
  }

  /**
   * Save registry to file
   */
  async save(): Promise<void> {
    try {
      const data = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        plugins: Object.fromEntries(this.plugins)
      };

      await fs.writeFile(
        this.registryPath, 
        JSON.stringify(data, null, 2), 
        'utf-8'
      );

      logger.debug('Plugin registry saved');
    } catch (error: any) {
      logger.error('Failed to save plugin registry:', error);
      throw new Error(`Failed to save plugin registry: ${error.message}`);
    }
  }

  /**
   * Create or update plugin record
   */
  async upsert(pluginId: string, data: Partial<PluginRecord>): Promise<PluginRecord> {
    const existing = this.plugins.get(pluginId);

    const record: PluginRecord = {
      id: pluginId,
      name: data.name || existing?.name || '',
      version: data.version || existing?.version || '1.0.0',
      description: data.description || existing?.description || '',
      author: data.author || existing?.author || '',
      type: data.type || existing?.type || 'general',
      metadata: data.metadata || existing?.metadata || ({} as any),
      status: data.status || existing?.status || PluginStatus.INACTIVE,
      enabled: data.enabled !== undefined ? data.enabled : (existing?.enabled || false),
      config: data.config || existing?.config || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.plugins.set(pluginId, record);
    await this.save();

    return record;
  }

  /**
   * Find plugin by ID
   */
  findUnique(pluginId: string): PluginRecord | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Find many plugins with filter
   */
  findMany(filter?: { where?: any; orderBy?: any }): PluginRecord[] {
    let results = Array.from(this.plugins.values());

    // Apply filters
    if (filter?.where) {
      results = results.filter((plugin) => {
        for (const [key, value] of Object.entries(filter.where)) {
          if (plugin[key as keyof PluginRecord] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    // Apply sorting
    if (filter?.orderBy) {
      const [field, direction] = Object.entries(filter.orderBy)[0];
      results.sort((a, b) => {
        const aVal = a[field as keyof PluginRecord];
        const bVal = b[field as keyof PluginRecord];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return results;
  }

  /**
   * Update plugin
   */
  async update(pluginId: string, data: Partial<PluginRecord>): Promise<PluginRecord> {
    const existing = this.plugins.get(pluginId);

    if (!existing) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    const updated: PluginRecord = {
      ...existing,
      ...data,
      id: pluginId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    this.plugins.set(pluginId, updated);
    await this.save();

    return updated;
  }

  /**
   * Delete plugin
   */
  async delete(pluginId: string): Promise<void> {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    this.plugins.delete(pluginId);
    await this.save();
  }

  /**
   * Get all plugins
   */
  getAll(): PluginRecord[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if plugin exists
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Clear all plugins (for testing)
   */
  async clear(): Promise<void> {
    this.plugins.clear();
    await this.save();
  }
}
