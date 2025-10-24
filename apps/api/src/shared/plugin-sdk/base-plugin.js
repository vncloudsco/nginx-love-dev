"use strict";
/**
 * Base Plugin Class
 * Class cơ sở mà các plugin có thể extend để implement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePlugin = void 0;
class BasePlugin {
    /**
     * Destroy plugin
     */
    async destroy() {
        // Default implementation - override if needed
        this.context = undefined;
    }
    /**
     * Health check
     */
    async healthCheck() {
        // Default implementation
        return { healthy: true, message: 'Plugin is running' };
    }
    /**
     * Helper methods
     */
    log(level, message, ...args) {
        if (this.context?.logger) {
            this.context.logger[level](`[${this.metadata.name}] ${message}`, ...args);
        }
    }
    getConfig() {
        return this.context?.config?.settings;
    }
    async setConfig(settings) {
        if (this.context?.api) {
            const newConfig = {
                enabled: this.context.config.enabled,
                settings
            };
            await this.context.api.updatePluginConfig(this.metadata.id, newConfig);
        }
    }
}
exports.BasePlugin = BasePlugin;
