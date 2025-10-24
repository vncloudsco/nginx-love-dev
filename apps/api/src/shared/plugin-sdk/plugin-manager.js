"use strict";
/**
 * Plugin Manager
 * Quản lý lifecycle của plugins: install, uninstall, activate, deactivate
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const plugin_loader_1 = require("./plugin-loader");
const plugin_context_1 = require("./plugin-context");
const types_1 = require("./types");
const logger_1 = __importDefault(require("../../utils/logger"));
class PluginManager {
    constructor(app, db, pluginsDir) {
        this.activePlugins = new Map();
        this.app = app;
        this.db = db;
        this.pluginsDir = pluginsDir;
        this.loader = new plugin_loader_1.PluginLoader(pluginsDir);
    }
    /**
     * Initialize plugin manager
     * Load và activate tất cả plugins enabled từ database
     */
    async initialize() {
        try {
            logger_1.default.info('Initializing Plugin Manager...');
            // Ensure plugins directory exists
            await fs.mkdir(this.pluginsDir, { recursive: true });
            // Load all enabled plugins from database
            const enabledPlugins = await this.db.plugin.findMany({
                where: {
                    enabled: true,
                    status: types_1.PluginStatus.ACTIVE
                }
            });
            logger_1.default.info(`Found ${enabledPlugins.length} enabled plugins`);
            // Activate each plugin
            for (const pluginRecord of enabledPlugins) {
                try {
                    await this.activatePlugin(pluginRecord.id);
                }
                catch (error) {
                    logger_1.default.error(`Failed to activate plugin ${pluginRecord.id}:`, error);
                    // Update status to ERROR
                    await this.db.plugin.update({
                        where: { id: pluginRecord.id },
                        data: { status: types_1.PluginStatus.ERROR }
                    });
                }
            }
            logger_1.default.info('Plugin Manager initialized successfully');
        }
        catch (error) {
            logger_1.default.error('Failed to initialize Plugin Manager:', error);
            throw error;
        }
    }
    /**
     * Install plugin
     */
    async installPlugin(options) {
        try {
            logger_1.default.info(`Installing plugin from ${options.source}...`);
            // Download/extract plugin based on source
            const pluginDir = await this.downloadPlugin(options);
            // Load plugin config
            const configPath = path.join(pluginDir, 'plugin.config.json');
            const configContent = await fs.readFile(configPath, 'utf-8');
            const pluginPackage = JSON.parse(configContent);
            const metadata = pluginPackage.metadata;
            // Validate plugin
            if (!options.skipValidation) {
                const validation = await this.loader.validatePlugin(metadata.id);
                if (!validation.valid) {
                    throw new Error(`Plugin validation failed: ${validation.errors?.join(', ')}`);
                }
                if (validation.warnings && validation.warnings.length > 0) {
                    logger_1.default.warn(`Plugin validation warnings: ${validation.warnings.join(', ')}`);
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
                    status: types_1.PluginStatus.INACTIVE,
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
                    status: types_1.PluginStatus.INACTIVE,
                    enabled: false,
                    config: null
                }
            });
            // Call onInstall lifecycle hook if plugin is already loaded
            try {
                const plugin = await this.loader.loadPlugin(metadata.id);
                if (plugin.onInstall) {
                    const config = { enabled: false, settings: {} };
                    const context = (0, plugin_context_1.createPluginContext)(metadata.id, this.app, this.db, config);
                    await plugin.onInstall(context);
                }
                await this.loader.unloadPlugin(metadata.id);
            }
            catch (error) {
                logger_1.default.warn(`Failed to call onInstall for plugin ${metadata.id}:`, error);
            }
            logger_1.default.info(`Plugin ${metadata.id} installed successfully`);
            return metadata;
        }
        catch (error) {
            logger_1.default.error('Failed to install plugin:', error);
            throw error;
        }
    }
    /**
     * Uninstall plugin
     */
    async uninstallPlugin(pluginId) {
        try {
            logger_1.default.info(`Uninstalling plugin ${pluginId}...`);
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
                    const config = { enabled: false, settings: {} };
                    const context = (0, plugin_context_1.createPluginContext)(pluginId, this.app, this.db, config);
                    await pluginInstance.onUninstall(context);
                }
                await this.loader.unloadPlugin(pluginId);
            }
            catch (error) {
                logger_1.default.warn(`Failed to call onUninstall for plugin ${pluginId}:`, error);
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
            logger_1.default.info(`Plugin ${pluginId} uninstalled successfully`);
        }
        catch (error) {
            logger_1.default.error(`Failed to uninstall plugin ${pluginId}:`, error);
            throw error;
        }
    }
    /**
     * Activate plugin
     */
    async activatePlugin(pluginId) {
        try {
            logger_1.default.info(`Activating plugin ${pluginId}...`);
            // Check if already active
            if (this.activePlugins.has(pluginId)) {
                logger_1.default.warn(`Plugin ${pluginId} is already active`);
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
            const config = {
                enabled: true,
                settings: pluginRecord.config ? JSON.parse(pluginRecord.config) : {}
            };
            const context = (0, plugin_context_1.createPluginContext)(pluginId, this.app, this.db, config);
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
                    status: types_1.PluginStatus.ACTIVE,
                    updatedAt: new Date()
                }
            });
            logger_1.default.info(`Plugin ${pluginId} activated successfully`);
        }
        catch (error) {
            logger_1.default.error(`Failed to activate plugin ${pluginId}:`, error);
            // Update status to ERROR
            await this.db.plugin.update({
                where: { id: pluginId },
                data: { status: types_1.PluginStatus.ERROR }
            }).catch(() => { });
            throw error;
        }
    }
    /**
     * Deactivate plugin
     */
    async deactivatePlugin(pluginId) {
        try {
            logger_1.default.info(`Deactivating plugin ${pluginId}...`);
            const plugin = this.activePlugins.get(pluginId);
            if (!plugin) {
                logger_1.default.warn(`Plugin ${pluginId} is not active`);
                return;
            }
            // Create context for onDeactivate hook
            const pluginRecord = await this.db.plugin.findUnique({
                where: { id: pluginId }
            });
            if (pluginRecord) {
                const config = {
                    enabled: false,
                    settings: pluginRecord.config ? JSON.parse(pluginRecord.config) : {}
                };
                const context = (0, plugin_context_1.createPluginContext)(pluginId, this.app, this.db, config);
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
                    status: types_1.PluginStatus.INACTIVE,
                    updatedAt: new Date()
                }
            });
            logger_1.default.info(`Plugin ${pluginId} deactivated successfully`);
        }
        catch (error) {
            logger_1.default.error(`Failed to deactivate plugin ${pluginId}:`, error);
            throw error;
        }
    }
    /**
     * Update plugin config
     */
    async updatePluginConfig(pluginId, settings) {
        try {
            const plugin = this.activePlugins.get(pluginId);
            const pluginRecord = await this.db.plugin.findUnique({
                where: { id: pluginId }
            });
            if (!pluginRecord) {
                throw new Error(`Plugin ${pluginId} not found`);
            }
            const oldConfig = {
                enabled: pluginRecord.enabled,
                settings: pluginRecord.config ? JSON.parse(pluginRecord.config) : {}
            };
            const newConfig = {
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
                const context = (0, plugin_context_1.createPluginContext)(pluginId, this.app, this.db, newConfig);
                await plugin.onConfigChange(context, oldConfig, newConfig);
            }
            logger_1.default.info(`Plugin ${pluginId} config updated successfully`);
        }
        catch (error) {
            logger_1.default.error(`Failed to update plugin config for ${pluginId}:`, error);
            throw error;
        }
    }
    /**
     * Get plugin info
     */
    async getPluginInfo(pluginId) {
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
    async listPlugins() {
        const plugins = await this.db.plugin.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return plugins.map((p) => ({
            ...p,
            metadata: JSON.parse(p.metadata),
            isActive: this.activePlugins.has(p.id),
            config: p.config ? JSON.parse(p.config) : null
        }));
    }
    /**
     * Get active plugins
     */
    getActivePlugins() {
        return new Map(this.activePlugins);
    }
    /**
     * Health check for all active plugins
     */
    async healthCheckAll() {
        const results = new Map();
        for (const [pluginId, plugin] of this.activePlugins) {
            try {
                const result = plugin.healthCheck
                    ? await plugin.healthCheck()
                    : { healthy: true, message: 'No health check implemented' };
                results.set(pluginId, result);
            }
            catch (error) {
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
    async shutdown() {
        logger_1.default.info('Shutting down Plugin Manager...');
        const pluginIds = Array.from(this.activePlugins.keys());
        for (const pluginId of pluginIds) {
            try {
                await this.deactivatePlugin(pluginId);
            }
            catch (error) {
                logger_1.default.error(`Failed to deactivate plugin ${pluginId} during shutdown:`, error);
            }
        }
        logger_1.default.info('Plugin Manager shut down successfully');
    }
    /**
     * Download plugin from source
     * TODO: Implement actual download logic for different sources
     */
    async downloadPlugin(options) {
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
exports.PluginManager = PluginManager;
