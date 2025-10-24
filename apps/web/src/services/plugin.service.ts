/**
 * Plugin Service
 * API calls for plugin management
 */

import apiClient from './api';
import type {
  Plugin,
  PluginListResponse,
  PluginDetailResponse,
  PluginHealthResponse,
  PluginActionResponse,
  PluginInstallOptions,
} from '@/types/plugin';

export const pluginService = {
  /**
   * Get all plugins
   */
  async getAllPlugins(): Promise<Plugin[]> {
    const response = await apiClient.get<PluginListResponse>('/plugins');
    return response.data.data;
  },

  /**
   * Get plugin by ID
   */
  async getPluginById(id: string): Promise<Plugin> {
    const response = await apiClient.get<PluginDetailResponse>(`/plugins/${id}`);
    return response.data.data;
  },

  /**
   * Install plugin
   */
  async installPlugin(options: PluginInstallOptions): Promise<PluginActionResponse> {
    const response = await apiClient.post<PluginActionResponse>('/plugins/install', options);
    return response.data;
  },

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(id: string): Promise<PluginActionResponse> {
    const response = await apiClient.delete<PluginActionResponse>(`/plugins/${id}`);
    return response.data;
  },

  /**
   * Activate plugin
   */
  async activatePlugin(id: string): Promise<PluginActionResponse> {
    const response = await apiClient.post<PluginActionResponse>(`/plugins/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate plugin
   */
  async deactivatePlugin(id: string): Promise<PluginActionResponse> {
    const response = await apiClient.post<PluginActionResponse>(`/plugins/${id}/deactivate`);
    return response.data;
  },

  /**
   * Update plugin config
   */
  async updatePluginConfig(id: string, config: Record<string, any>): Promise<PluginActionResponse> {
    const response = await apiClient.put<PluginActionResponse>(`/plugins/${id}/config`, config);
    return response.data;
  },

  /**
   * Get plugin health
   */
  async getPluginHealth(id: string): Promise<PluginHealthResponse> {
    const response = await apiClient.get<PluginHealthResponse>(`/plugins/${id}/health`);
    return response.data;
  },

  /**
   * Get all plugins health
   */
  async getAllPluginsHealth(): Promise<{ pluginId: string; healthy: boolean; message?: string }[]> {
    const response = await apiClient.get<{ success: boolean; data: any[] }>('/plugins/health/all');
    return response.data.data;
  },
};
