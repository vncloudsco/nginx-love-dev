/**
 * Plugin Domain - Main Export
 * Initialize plugin system và export routes
 */

import { Application } from 'express';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import { PluginManager } from '../../shared/plugin-sdk';
import { createPluginService } from './services/plugin.service';
import { createPluginController } from './controllers/plugin.controller';
import { createPluginRoutes } from './routes/plugin.routes';

// Global plugin manager instance
let pluginManager: PluginManager | null = null;

/**
 * Initialize plugin system
 */
export const initializePluginSystem = async (app: Application, db: PrismaClient): Promise<PluginManager> => {
  if (pluginManager) {
    return pluginManager;
  }

  // Plugins directory path
  const pluginsDir = path.join(process.cwd(), 'src', 'plugins');

  // Create plugin manager
  pluginManager = new PluginManager(app, db, pluginsDir);

  // Initialize plugin manager (load enabled plugins)
  await pluginManager.initialize();

  return pluginManager;
};

/**
 * Get plugin manager instance
 */
export const getPluginManager = (): PluginManager | null => {
  return pluginManager;
};

/**
 * Shutdown plugin system
 */
export const shutdownPluginSystem = async (): Promise<void> => {
  if (pluginManager) {
    await pluginManager.shutdown();
    pluginManager = null;
  }
};

/**
 * Create plugin routes with initialized plugin manager
 */
export const createPluginDomainRoutes = (pluginManager: PluginManager) => {
  const pluginService = createPluginService(pluginManager);
  const pluginController = createPluginController(pluginService);
  return createPluginRoutes(pluginController);
};
