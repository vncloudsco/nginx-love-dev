/**
 * Plugin Controller
 * Handle HTTP requests cho plugin management
 */

import { Request, Response } from 'express';
import { PluginService } from '../services/plugin.service';
import { PluginInstallOptions } from '../../../shared/plugin-sdk/types';
import logger from '../../../utils/logger';

export class PluginController {
  private pluginService: PluginService;

  constructor(pluginService: PluginService) {
    this.pluginService = pluginService;
  }

  /**
   * GET /api/plugins
   * Get all plugins
   */
  async getAllPlugins(req: Request, res: Response) {
    try {
      const plugins = await this.pluginService.getAllPlugins();
      res.json({
        success: true,
        data: plugins
      });
    } catch (error: any) {
      logger.error('Error in getAllPlugins:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/plugins/:id
   * Get plugin by ID
   */
  async getPluginById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const plugin = await this.pluginService.getPluginById(id);
      res.json({
        success: true,
        data: plugin
      });
    } catch (error: any) {
      logger.error('Error in getPluginById:', error);
      res.status(error.message === 'Plugin not found' ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/plugins/install
   * Install plugin
   */
  async installPlugin(req: Request, res: Response) {
    try {
      const options: PluginInstallOptions = req.body;
      
      // Validate required fields
      if (!options.source) {
        return res.status(400).json({
          success: false,
          error: 'source is required'
        });
      }

      const metadata = await this.pluginService.installPlugin(options);
      res.json({
        success: true,
        data: metadata,
        message: 'Plugin installed successfully'
      });
    } catch (error: any) {
      logger.error('Error in installPlugin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/plugins/:id
   * Uninstall plugin
   */
  async uninstallPlugin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.pluginService.uninstallPlugin(id);
      res.json(result);
    } catch (error: any) {
      logger.error('Error in uninstallPlugin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/plugins/:id/activate
   * Activate plugin
   */
  async activatePlugin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.pluginService.activatePlugin(id);
      res.json(result);
    } catch (error: any) {
      logger.error('Error in activatePlugin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/plugins/:id/deactivate
   * Deactivate plugin
   */
  async deactivatePlugin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.pluginService.deactivatePlugin(id);
      res.json(result);
    } catch (error: any) {
      logger.error('Error in deactivatePlugin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/plugins/:id/config
   * Update plugin config
   */
  async updatePluginConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const settings = req.body;
      
      const result = await this.pluginService.updatePluginConfig(id, settings);
      res.json(result);
    } catch (error: any) {
      logger.error('Error in updatePluginConfig:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/plugins/:id/health
   * Get plugin health status
   */
  async getPluginHealth(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const health = await this.pluginService.getPluginHealth(id);
      res.json({
        success: true,
        data: health
      });
    } catch (error: any) {
      logger.error('Error in getPluginHealth:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/plugins/health/all
   * Get all plugins health status
   */
  async getAllPluginsHealth(req: Request, res: Response) {
    try {
      const health = await this.pluginService.getAllPluginsHealth();
      res.json({
        success: true,
        data: health
      });
    } catch (error: any) {
      logger.error('Error in getAllPluginsHealth:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/plugins/discover
   * Discover available plugins
   */
  async discoverPlugins(req: Request, res: Response) {
    try {
      const result = await this.pluginService.discoverPlugins();
      res.json(result);
    } catch (error: any) {
      logger.error('Error in discoverPlugins:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const createPluginController = (pluginService: PluginService) => {
  return new PluginController(pluginService);
};
