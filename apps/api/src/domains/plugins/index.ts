/**
 * Plugin Domain - Main Export
 * Initialize plugin system và export routes
 */

import { Application } from 'express';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import { PluginManagerV2 } from '../../shared/plugin-sdk';
import { createPluginService } from './services/plugin.service';
import { createPluginController } from './controllers/plugin.controller';
import { createPluginRoutes } from './routes/plugin.routes';

// Global plugin manager instance
let pluginManager: PluginManagerV2 | null = null;

/**
 * Initialize plugin system - FILE-BASED (NO DATABASE!)
 */
export const initializePluginSystem = async (app: Application, db: PrismaClient): Promise<PluginManagerV2> => {
  if (pluginManager) {
    return pluginManager;
  }

  // Plugins directory path
  const pluginsDir = path.join(process.cwd(), 'src', 'plugins');

  // Create plugin manager V2 (file-based, no database migration needed!)
  pluginManager = new PluginManagerV2(app, db, pluginsDir);

  // Initialize plugin manager (load enabled plugins)
  await pluginManager.initialize();

  return pluginManager;
};

/**
 * Get plugin manager instance
 */
export const getPluginManager = (): PluginManagerV2 | null => {
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
export const createPluginDomainRoutes = (pluginManager: PluginManagerV2) => {
  const pluginService = createPluginService(pluginManager);
  const pluginController = createPluginController(pluginService);
  return createPluginRoutes(pluginController);
};
