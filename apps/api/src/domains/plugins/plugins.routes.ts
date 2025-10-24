/**
 * Plugin Routes Entry Point
 * Tạo routes với lazy initialization
 */

import { Router } from 'express';
import { getPluginManager, createPluginDomainRoutes } from './index';
import logger from '../../utils/logger';

const router = Router();

// Middleware để check plugin manager initialized
router.use((req, res, next) => {
  const pluginManager = getPluginManager();
  if (!pluginManager) {
    return res.status(503).json({
      success: false,
      error: 'Plugin system not initialized yet'
    });
  }
  next();
});

// Lazy load plugin routes
const getPluginRoutes = () => {
  const pluginManager = getPluginManager();
  if (!pluginManager) {
    throw new Error('Plugin manager not initialized');
  }
  return createPluginDomainRoutes(pluginManager);
};

// Mount plugin routes dynamically
router.use((req, res, next) => {
  try {
    const pluginRoutes = getPluginRoutes();
    pluginRoutes(req, res, next);
  } catch (error: any) {
    logger.error('Error loading plugin routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load plugin routes'
    });
  }
});

export default router;
