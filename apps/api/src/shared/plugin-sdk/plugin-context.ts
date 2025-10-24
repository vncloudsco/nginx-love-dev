/**
 * Plugin Context Implementation
 * Cung cấp context cho plugin để tương tác với hệ thống
 */

import { Application, Router } from 'express';
import { EventEmitter } from 'events';
import { PluginContext, PluginStorage, PluginEventEmitter, PluginAPI, PluginConfig } from './types';
import logger from '../../utils/logger';

/**
 * Plugin Storage Implementation
 * Lưu trữ dữ liệu cho plugin vào database hoặc file system
 */
class PluginStorageImpl implements PluginStorage {
  private pluginId: string;
  private db: any;
  private cache: Map<string, any> = new Map();

  constructor(pluginId: string, db: any) {
    this.pluginId = pluginId;
    this.db = db;
  }

  async get(key: string): Promise<any> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      // Try to get from database
      const record = await this.db.pluginStorage.findUnique({
        where: {
          pluginId_key: {
            pluginId: this.pluginId,
            key
          }
        }
      });

      if (record) {
        const value = JSON.parse(record.value);
        this.cache.set(key, value);
        return value;
      }

      return undefined;
    } catch (error) {
      logger.error(`[PluginStorage] Error getting key ${key} for plugin ${this.pluginId}:`, error);
      return undefined;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      await this.db.pluginStorage.upsert({
        where: {
          pluginId_key: {
            pluginId: this.pluginId,
            key
          }
        },
        update: {
          value: serialized,
          updatedAt: new Date()
        },
        create: {
          pluginId: this.pluginId,
          key,
          value: serialized
        }
      });

      this.cache.set(key, value);
    } catch (error) {
      logger.error(`[PluginStorage] Error setting key ${key} for plugin ${this.pluginId}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.db.pluginStorage.delete({
        where: {
          pluginId_key: {
            pluginId: this.pluginId,
            key
          }
        }
      });

      this.cache.delete(key);
    } catch (error) {
      logger.error(`[PluginStorage] Error deleting key ${key} for plugin ${this.pluginId}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.db.pluginStorage.deleteMany({
        where: {
          pluginId: this.pluginId
        }
      });

      this.cache.clear();
    } catch (error) {
      logger.error(`[PluginStorage] Error clearing storage for plugin ${this.pluginId}:`, error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    if (this.cache.has(key)) {
      return true;
    }

    try {
      const record = await this.db.pluginStorage.findUnique({
        where: {
          pluginId_key: {
            pluginId: this.pluginId,
            key
          }
        }
      });

      return !!record;
    } catch (error) {
      logger.error(`[PluginStorage] Error checking key ${key} for plugin ${this.pluginId}:`, error);
      return false;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const records = await this.db.pluginStorage.findMany({
        where: {
          pluginId: this.pluginId
        },
        select: {
          key: true
        }
      });

      return records.map((r: any) => r.key);
    } catch (error) {
      logger.error(`[PluginStorage] Error getting keys for plugin ${this.pluginId}:`, error);
      return [];
    }
  }
}

/**
 * Plugin Event Emitter Implementation
 */
class PluginEventEmitterImpl implements PluginEventEmitter {
  private emitter: EventEmitter;
  private pluginId: string;

  constructor(pluginId: string) {
    this.emitter = new EventEmitter();
    this.pluginId = pluginId;
  }

  on(event: string, handler: (...args: any[]) => void): void {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void): void {
    this.emitter.off(event, handler);
  }

  emit(event: string, ...args: any[]): void {
    this.emitter.emit(event, ...args);
  }

  once(event: string, handler: (...args: any[]) => void): void {
    this.emitter.once(event, handler);
  }

  getEmitter(): EventEmitter {
    return this.emitter;
  }
}

/**
 * Plugin API Implementation
 */
class PluginAPIImpl implements PluginAPI {
  private app: Application;
  private db: any;
  private pluginId: string;
  private registeredRoutes: Set<string> = new Set();
  private hooks: Map<string, Function[]> = new Map();

  constructor(app: Application, db: any, pluginId: string) {
    this.app = app;
    this.db = db;
    this.pluginId = pluginId;
  }

  registerRoute(path: string, router: Router): void {
    const fullPath = `/api/plugins/${this.pluginId}${path}`;
    
    if (this.registeredRoutes.has(fullPath)) {
      logger.warn(`[PluginAPI] Route ${fullPath} already registered for plugin ${this.pluginId}`);
      return;
    }

    this.app.use(fullPath, router);
    this.registeredRoutes.add(fullPath);
    logger.info(`[PluginAPI] Registered route ${fullPath} for plugin ${this.pluginId}`);
  }

  registerMiddleware(middleware: any): void {
    this.app.use(middleware);
    logger.info(`[PluginAPI] Registered middleware for plugin ${this.pluginId}`);
  }

  registerHook(hookName: string, handler: Function): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    
    this.hooks.get(hookName)!.push(handler);
    logger.debug(`[PluginAPI] Registered hook ${hookName} for plugin ${this.pluginId}`);
  }

  async callHook(hookName: string, ...args: any[]): Promise<any[]> {
    const handlers = this.hooks.get(hookName) || [];
    const results: any[] = [];

    for (const handler of handlers) {
      try {
        const result = await handler(...args);
        results.push(result);
      } catch (error) {
        logger.error(`[PluginAPI] Error calling hook ${hookName} for plugin ${this.pluginId}:`, error);
      }
    }

    return results;
  }

  async getSystemConfig(): Promise<Record<string, any>> {
    // Return safe system config (không expose sensitive data)
    return {
      version: process.env.APP_VERSION || '1.0.0',
      nodeEnv: process.env.NODE_ENV || 'development',
      // Add more safe config here
    };
  }

  async getPluginConfig(pluginId: string): Promise<PluginConfig | null> {
    try {
      const plugin = await this.db.plugin.findUnique({
        where: { id: pluginId }
      });

      if (!plugin) {
        return null;
      }

      return {
        enabled: plugin.enabled,
        settings: plugin.config ? JSON.parse(plugin.config) : {}
      };
    } catch (error) {
      logger.error(`[PluginAPI] Error getting config for plugin ${pluginId}:`, error);
      return null;
    }
  }

  async updatePluginConfig(pluginId: string, config: PluginConfig): Promise<void> {
    try {
      await this.db.plugin.update({
        where: { id: pluginId },
        data: {
          enabled: config.enabled,
          config: config.settings ? JSON.stringify(config.settings) : null,
          updatedAt: new Date()
        }
      });

      logger.info(`[PluginAPI] Updated config for plugin ${pluginId}`);
    } catch (error) {
      logger.error(`[PluginAPI] Error updating config for plugin ${pluginId}:`, error);
      throw error;
    }
  }

  getRegisteredRoutes(): string[] {
    return Array.from(this.registeredRoutes);
  }

  getHooks(): Map<string, Function[]> {
    return this.hooks;
  }
}

/**
 * Create Plugin Context
 */
export function createPluginContext(
  pluginId: string,
  app: Application,
  db: any,
  config: PluginConfig
): PluginContext {
  const storage = new PluginStorageImpl(pluginId, db);
  const events = new PluginEventEmitterImpl(pluginId);
  const api = new PluginAPIImpl(app, db, pluginId);

  return {
    app,
    logger: {
      info: (message: string, ...args: any[]) => logger.info(`[Plugin:${pluginId}] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => logger.warn(`[Plugin:${pluginId}] ${message}`, ...args),
      error: (message: string, ...args: any[]) => logger.error(`[Plugin:${pluginId}] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => logger.debug(`[Plugin:${pluginId}] ${message}`, ...args),
    },
    db,
    config,
    storage,
    events,
    api
  };
}

export { PluginStorageImpl, PluginEventEmitterImpl, PluginAPIImpl };
