"use strict";
/**
 * Plugin Loader
 * Load và unload plugin từ file system
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
exports.PluginLoader = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const plugin_validator_1 = require("./plugin-validator");
const logger_1 = __importDefault(require("../../utils/logger"));
class PluginLoader {
    constructor(pluginsDir) {
        this.loadedPlugins = new Map();
        this.pluginsDir = pluginsDir;
        this.validator = new plugin_validator_1.PluginValidator();
    }
    /**
     * Load plugin từ directory
     */
    async loadPlugin(pluginId) {
        try {
            const pluginDir = path.join(this.pluginsDir, pluginId);
            // Check if plugin already loaded
            if (this.loadedPlugins.has(pluginId)) {
                logger_1.default.warn(`Plugin ${pluginId} is already loaded`);
                return this.loadedPlugins.get(pluginId);
            }
            // Check if plugin directory exists
            try {
                await fs.access(pluginDir);
            }
            catch {
                throw new Error(`Plugin directory not found: ${pluginDir}`);
            }
            // Load plugin.config.json
            const configPath = path.join(pluginDir, 'plugin.config.json');
            const configContent = await fs.readFile(configPath, 'utf-8');
            const pluginPackage = JSON.parse(configContent);
            // Validate metadata
            const validationResult = await this.validator.validateMetadata(pluginPackage.metadata);
            if (!validationResult.valid) {
                throw new Error(`Plugin validation failed: ${validationResult.errors?.join(', ')}`);
            }
            // Load main file
            const mainFilePath = path.join(pluginDir, pluginPackage.mainFile);
            try {
                await fs.access(mainFilePath);
            }
            catch {
                throw new Error(`Plugin main file not found: ${mainFilePath}`);
            }
            // Import plugin module
            const pluginModule = await this.importPlugin(mainFilePath);
            if (!pluginModule.default) {
                throw new Error(`Plugin ${pluginId} must export a default class`);
            }
            // Create plugin instance
            const PluginClass = pluginModule.default;
            const plugin = new PluginClass();
            // Verify plugin implements IPlugin interface
            if (!plugin.metadata || !plugin.initialize || !plugin.destroy) {
                throw new Error(`Plugin ${pluginId} does not implement IPlugin interface`);
            }
            // Store loaded plugin
            this.loadedPlugins.set(pluginId, plugin);
            logger_1.default.info(`Plugin ${pluginId} loaded successfully`);
            return plugin;
        }
        catch (error) {
            logger_1.default.error(`Failed to load plugin ${pluginId}:`, error);
            throw error;
        }
    }
    /**
     * Unload plugin
     */
    async unloadPlugin(pluginId) {
        const plugin = this.loadedPlugins.get(pluginId);
        if (!plugin) {
            logger_1.default.warn(`Plugin ${pluginId} is not loaded`);
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
            logger_1.default.info(`Plugin ${pluginId} unloaded successfully`);
        }
        catch (error) {
            logger_1.default.error(`Failed to unload plugin ${pluginId}:`, error);
            throw error;
        }
    }
    /**
     * Reload plugin
     */
    async reloadPlugin(pluginId) {
        await this.unloadPlugin(pluginId);
        return await this.loadPlugin(pluginId);
    }
    /**
     * Get loaded plugin
     */
    getPlugin(pluginId) {
        return this.loadedPlugins.get(pluginId);
    }
    /**
     * Get all loaded plugins
     */
    getLoadedPlugins() {
        return new Map(this.loadedPlugins);
    }
    /**
     * Check if plugin is loaded
     */
    isLoaded(pluginId) {
        return this.loadedPlugins.has(pluginId);
    }
    /**
     * Discover all plugins in plugins directory
     */
    async discoverPlugins() {
        try {
            const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
            const plugins = [];
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                try {
                    const pluginId = entry.name;
                    const configPath = path.join(this.pluginsDir, pluginId, 'plugin.config.json');
                    const configContent = await fs.readFile(configPath, 'utf-8');
                    const pluginPackage = JSON.parse(configContent);
                    plugins.push(pluginPackage.metadata);
                }
                catch (error) {
                    logger_1.default.warn(`Failed to read plugin config for ${entry.name}:`, error);
                }
            }
            return plugins;
        }
        catch (error) {
            logger_1.default.error('Failed to discover plugins:', error);
            return [];
        }
    }
    /**
     * Import plugin module dynamically
     */
    async importPlugin(mainFilePath) {
        // Use dynamic import to load plugin
        // Clear cache first to allow reloading
        const absolutePath = path.resolve(mainFilePath);
        delete require.cache[require.resolve(absolutePath)];
        return await Promise.resolve(`${absolutePath}`).then(s => __importStar(require(s)));
    }
    /**
     * Clear Node.js module cache for plugin
     */
    clearModuleCache(pluginDir) {
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
    async validatePlugin(pluginId) {
        try {
            const pluginDir = path.join(this.pluginsDir, pluginId);
            // Check if plugin directory exists
            try {
                await fs.access(pluginDir);
            }
            catch {
                return {
                    valid: false,
                    errors: [`Plugin directory not found: ${pluginDir}`]
                };
            }
            // Load plugin.config.json
            const configPath = path.join(pluginDir, 'plugin.config.json');
            const configContent = await fs.readFile(configPath, 'utf-8');
            const pluginPackage = JSON.parse(configContent);
            // Get all files in plugin directory
            const files = await this.getPluginFiles(pluginDir);
            // Validate
            return await this.validator.validate(pluginPackage.metadata, files);
        }
        catch (error) {
            return {
                valid: false,
                errors: [`Validation error: ${error.message}`]
            };
        }
    }
    /**
     * Get all files in plugin directory (recursive)
     */
    async getPluginFiles(dir, basePath = '') {
        const files = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const relativePath = path.join(basePath, entry.name);
            if (entry.isDirectory()) {
                const subFiles = await this.getPluginFiles(path.join(dir, entry.name), relativePath);
                files.push(...subFiles);
            }
            else {
                files.push(relativePath);
            }
        }
        return files;
    }
}
exports.PluginLoader = PluginLoader;
