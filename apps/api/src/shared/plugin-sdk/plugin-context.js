"use strict";
/**
 * Plugin Context Implementation
 * Cung cấp context cho plugin để tương tác với hệ thống
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginAPIImpl = exports.PluginEventEmitterImpl = exports.PluginStorageImpl = void 0;
exports.createPluginContext = createPluginContext;
const events_1 = require("events");
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * Plugin Storage Implementation
 * Lưu trữ dữ liệu cho plugin vào database hoặc file system
 */
class PluginStorageImpl {
    constructor(pluginId, db) {
        this.cache = new Map();
        this.pluginId = pluginId;
        this.db = db;
    }
    async get(key) {
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
        }
        catch (error) {
            logger_1.default.error(`[PluginStorage] Error getting key ${key} for plugin ${this.pluginId}:`, error);
            return undefined;
        }
    }
    async set(key, value) {
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
        }
        catch (error) {
            logger_1.default.error(`[PluginStorage] Error setting key ${key} for plugin ${this.pluginId}:`, error);
            throw error;
        }
    }
    async delete(key) {
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
        }
        catch (error) {
            logger_1.default.error(`[PluginStorage] Error deleting key ${key} for plugin ${this.pluginId}:`, error);
        }
    }
    async clear() {
        try {
            await this.db.pluginStorage.deleteMany({
                where: {
                    pluginId: this.pluginId
                }
            });
            this.cache.clear();
        }
        catch (error) {
            logger_1.default.error(`[PluginStorage] Error clearing storage for plugin ${this.pluginId}:`, error);
            throw error;
        }
    }
    async has(key) {
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
        }
        catch (error) {
            logger_1.default.error(`[PluginStorage] Error checking key ${key} for plugin ${this.pluginId}:`, error);
            return false;
        }
    }
    async keys() {
        try {
            const records = await this.db.pluginStorage.findMany({
                where: {
                    pluginId: this.pluginId
                },
                select: {
                    key: true
                }
            });
            return records.map((r) => r.key);
        }
        catch (error) {
            logger_1.default.error(`[PluginStorage] Error getting keys for plugin ${this.pluginId}:`, error);
            return [];
        }
    }
}
exports.PluginStorageImpl = PluginStorageImpl;
/**
 * Plugin Event Emitter Implementation
 */
class PluginEventEmitterImpl {
    constructor(pluginId) {
        this.emitter = new events_1.EventEmitter();
        this.pluginId = pluginId;
    }
    on(event, handler) {
        this.emitter.on(event, handler);
    }
    off(event, handler) {
        this.emitter.off(event, handler);
    }
    emit(event, ...args) {
        this.emitter.emit(event, ...args);
    }
    once(event, handler) {
        this.emitter.once(event, handler);
    }
    getEmitter() {
        return this.emitter;
    }
}
exports.PluginEventEmitterImpl = PluginEventEmitterImpl;
/**
 * Plugin API Implementation
 */
class PluginAPIImpl {
    constructor(app, db, pluginId) {
        this.registeredRoutes = new Set();
        this.hooks = new Map();
        this.app = app;
        this.db = db;
        this.pluginId = pluginId;
    }
    registerRoute(path, router) {
        const fullPath = `/api/plugins/${this.pluginId}${path}`;
        if (this.registeredRoutes.has(fullPath)) {
            logger_1.default.warn(`[PluginAPI] Route ${fullPath} already registered for plugin ${this.pluginId}`);
            return;
        }
        this.app.use(fullPath, router);
        this.registeredRoutes.add(fullPath);
        logger_1.default.info(`[PluginAPI] Registered route ${fullPath} for plugin ${this.pluginId}`);
    }
    registerMiddleware(middleware) {
        this.app.use(middleware);
        logger_1.default.info(`[PluginAPI] Registered middleware for plugin ${this.pluginId}`);
    }
    registerHook(hookName, handler) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push(handler);
        logger_1.default.debug(`[PluginAPI] Registered hook ${hookName} for plugin ${this.pluginId}`);
    }
    async callHook(hookName, ...args) {
        const handlers = this.hooks.get(hookName) || [];
        const results = [];
        for (const handler of handlers) {
            try {
                const result = await handler(...args);
                results.push(result);
            }
            catch (error) {
                logger_1.default.error(`[PluginAPI] Error calling hook ${hookName} for plugin ${this.pluginId}:`, error);
            }
        }
        return results;
    }
    async getSystemConfig() {
        // Return safe system config (không expose sensitive data)
        return {
            version: process.env.APP_VERSION || '1.0.0',
            nodeEnv: process.env.NODE_ENV || 'development',
            // Add more safe config here
        };
    }
    async getPluginConfig(pluginId) {
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
        }
        catch (error) {
            logger_1.default.error(`[PluginAPI] Error getting config for plugin ${pluginId}:`, error);
            return null;
        }
    }
    async updatePluginConfig(pluginId, config) {
        try {
            await this.db.plugin.update({
                where: { id: pluginId },
                data: {
                    enabled: config.enabled,
                    config: config.settings ? JSON.stringify(config.settings) : null,
                    updatedAt: new Date()
                }
            });
            logger_1.default.info(`[PluginAPI] Updated config for plugin ${pluginId}`);
        }
        catch (error) {
            logger_1.default.error(`[PluginAPI] Error updating config for plugin ${pluginId}:`, error);
            throw error;
        }
    }
    getRegisteredRoutes() {
        return Array.from(this.registeredRoutes);
    }
    getHooks() {
        return this.hooks;
    }
}
exports.PluginAPIImpl = PluginAPIImpl;
/**
 * Create Plugin Context
 */
function createPluginContext(pluginId, app, db, config) {
    const storage = new PluginStorageImpl(pluginId, db);
    const events = new PluginEventEmitterImpl(pluginId);
    const api = new PluginAPIImpl(app, db, pluginId);
    return {
        app,
        logger: {
            info: (message, ...args) => logger_1.default.info(`[Plugin:${pluginId}] ${message}`, ...args),
            warn: (message, ...args) => logger_1.default.warn(`[Plugin:${pluginId}] ${message}`, ...args),
            error: (message, ...args) => logger_1.default.error(`[Plugin:${pluginId}] ${message}`, ...args),
            debug: (message, ...args) => logger_1.default.debug(`[Plugin:${pluginId}] ${message}`, ...args),
        },
        db,
        config,
        storage,
        events,
        api
    };
}
