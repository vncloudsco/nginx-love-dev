/**
 * Plugin Routes
 * Define API routes cho plugin management
 */

import { Router } from 'express';
import { PluginController } from '../controllers/plugin.controller';

export const createPluginRoutes = (pluginController: PluginController): Router => {
  const router = Router();

  // Get all plugins
  router.get('/', pluginController.getAllPlugins.bind(pluginController));

  // Get plugin by ID
  router.get('/:id', pluginController.getPluginById.bind(pluginController));

  // Install plugin
  router.post('/install', pluginController.installPlugin.bind(pluginController));

  // Uninstall plugin
  router.delete('/:id', pluginController.uninstallPlugin.bind(pluginController));

  // Activate plugin
  router.post('/:id/activate', pluginController.activatePlugin.bind(pluginController));

  // Deactivate plugin
  router.post('/:id/deactivate', pluginController.deactivatePlugin.bind(pluginController));

  // Update plugin config
  router.put('/:id/config', pluginController.updatePluginConfig.bind(pluginController));

  // Get plugin health
  router.get('/:id/health', pluginController.getPluginHealth.bind(pluginController));

  // Get all plugins health
  router.get('/health/all', pluginController.getAllPluginsHealth.bind(pluginController));

  // Discover plugins
  router.post('/discover', pluginController.discoverPlugins.bind(pluginController));

  return router;
};
