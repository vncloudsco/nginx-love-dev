/**
 * Base Plugin Class
 * Class cơ sở mà các plugin có thể extend để implement
 */

import { IPlugin, PluginMetadata, PluginContext, PluginConfig } from './types';

export abstract class BasePlugin implements IPlugin {
  public abstract metadata: PluginMetadata;
  protected context?: PluginContext;

  /**
   * Initialize plugin
   */
  abstract initialize(context: PluginContext): Promise<void>;

  /**
   * Destroy plugin
   */
  async destroy(): Promise<void> {
    // Default implementation - override if needed
    this.context = undefined;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    // Default implementation
    return { healthy: true, message: 'Plugin is running' };
  }

  /**
   * Lifecycle hooks - Optional implementations
   */
  async onInstall?(context: PluginContext): Promise<void>;
  async onUninstall?(context: PluginContext): Promise<void>;
  async onActivate?(context: PluginContext): Promise<void>;
  async onDeactivate?(context: PluginContext): Promise<void>;
  async onUpdate?(context: PluginContext, oldVersion: string, newVersion: string): Promise<void>;
  async onConfigChange?(context: PluginContext, oldConfig: PluginConfig, newConfig: PluginConfig): Promise<void>;

  /**
   * Helper methods
   */
  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: any[]): void {
    if (this.context?.logger) {
      this.context.logger[level](`[${this.metadata.name}] ${message}`, ...args);
    }
  }

  protected getConfig<T = any>(): T {
    return this.context?.config?.settings as T;
  }

  protected async setConfig(settings: Record<string, any>): Promise<void> {
    if (this.context?.api) {
      const newConfig: PluginConfig = {
        enabled: this.context.config.enabled,
        settings
      };
      await this.context.api.updatePluginConfig(this.metadata.id, newConfig);
    }
  }
}
