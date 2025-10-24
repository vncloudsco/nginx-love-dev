/**
 * Plugin Queries
 * TanStack Query hooks for plugin management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pluginService } from '@/services/plugin.service';
import type { PluginInstallOptions } from '@/types/plugin';
import { toast } from 'sonner';

// Query keys
export const pluginKeys = {
  all: ['plugins'] as const,
  lists: () => [...pluginKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...pluginKeys.lists(), filters] as const,
  details: () => [...pluginKeys.all, 'detail'] as const,
  detail: (id: string) => [...pluginKeys.details(), id] as const,
  health: (id: string) => [...pluginKeys.all, 'health', id] as const,
  healthAll: () => [...pluginKeys.all, 'health', 'all'] as const,
};

/**
 * Get all plugins
 */
export function usePlugins() {
  return useQuery({
    queryKey: pluginKeys.lists(),
    queryFn: () => pluginService.getAllPlugins(),
  });
}

/**
 * Get plugin by ID
 */
export function usePlugin(id: string) {
  return useQuery({
    queryKey: pluginKeys.detail(id),
    queryFn: () => pluginService.getPluginById(id),
    enabled: !!id,
  });
}

/**
 * Get plugin health
 */
export function usePluginHealth(id: string) {
  return useQuery({
    queryKey: pluginKeys.health(id),
    queryFn: () => pluginService.getPluginHealth(id),
    enabled: !!id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Get all plugins health
 */
export function useAllPluginsHealth() {
  return useQuery({
    queryKey: pluginKeys.healthAll(),
    queryFn: () => pluginService.getAllPluginsHealth(),
    refetchInterval: 30000,
  });
}

/**
 * Install plugin mutation
 */
export function useInstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: PluginInstallOptions) => pluginService.installPlugin(options),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      toast.success('Plugin installed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to install plugin');
    },
  });
}

/**
 * Uninstall plugin mutation
 */
export function useUninstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pluginService.uninstallPlugin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      toast.success('Plugin uninstalled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to uninstall plugin');
    },
  });
}

/**
 * Activate plugin mutation
 */
export function useActivatePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pluginService.activatePlugin(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.detail(id) });
      toast.success('Plugin activated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to activate plugin');
    },
  });
}

/**
 * Deactivate plugin mutation
 */
export function useDeactivatePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pluginService.deactivatePlugin(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pluginKeys.detail(id) });
      toast.success('Plugin deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to deactivate plugin');
    },
  });
}

/**
 * Update plugin config mutation
 */
export function useUpdatePluginConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: Record<string, any> }) =>
      pluginService.updatePluginConfig(id, config),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.detail(id) });
      toast.success('Plugin configuration updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update configuration');
    },
  });
}
