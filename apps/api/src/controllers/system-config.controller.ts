import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import logger from '../utils/logger';
import axios from 'axios';
import { validateMasterUrl, constructSafeUrl, validateHealthResponse, validateConfigExportResponse } from '../utils/url-validator';

/**
 * Get system configuration (node mode,    });

    logger.info('Disconnected from master node', {
      userId: req.user?.userId
    });er/slave settings)
 */
export const getSystemConfig = async (req: AuthRequest, res: Response) => {
  try {
    let config = await prisma.systemConfig.findFirst();

    // Create default config if not exists
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          nodeMode: 'master',
          masterApiEnabled: true,
          slaveApiEnabled: false
        }
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Get system config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system configuration'
    });
  }
};

/**
 * Update node mode (master or slave)
 */
export const updateNodeMode = async (req: AuthRequest, res: Response) => {
  try {
    const { nodeMode } = req.body;

    if (!['master', 'slave'].includes(nodeMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid node mode. Must be "master" or "slave"'
      });
    }

    let config = await prisma.systemConfig.findFirst();

    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          nodeMode: nodeMode as any,
          masterApiEnabled: nodeMode === 'master',
          slaveApiEnabled: nodeMode === 'slave'
        }
      });
    } else {
      // Build update data
      const updateData: any = {
        nodeMode: nodeMode as any,
        masterApiEnabled: nodeMode === 'master',
        slaveApiEnabled: nodeMode === 'slave'
      };

      // Reset slave connection if switching to master
      if (nodeMode === 'master') {
        updateData.masterHost = null;
        updateData.masterPort = null;
        updateData.masterApiKey = null;
        updateData.connected = false;
        updateData.connectionError = null;
        updateData.lastConnectedAt = null;
      }

      config = await prisma.systemConfig.update({
        where: { id: config.id },
        data: updateData
      });
    }

    logger.info(`Node mode changed to: ${nodeMode}`, {
      userId: req.user?.userId,
      configId: config.id
    });

    res.json({
      success: true,
      data: config,
      message: `Node mode changed to ${nodeMode}`
    });
  } catch (error) {
    logger.error('Update node mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update node mode'
    });
  }
};

/**
 * Connect to master node (for slave mode)
 */
export const connectToMaster = async (req: AuthRequest, res: Response) => {
  try {
    const { masterHost, masterPort, masterApiKey } = req.body;

    if (!masterHost || !masterPort || !masterApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Master host, port, and API key are required'
      });
    }

    // Get current config
    let config = await prisma.systemConfig.findFirst();

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'System config not found. Please set node mode first.'
      });
    }

    if (config.nodeMode !== 'slave') {
      return res.status(400).json({
        success: false,
        message: 'Cannot connect to master. Node mode must be "slave".'
      });
    }

    // Validate master URL format (prevent injection, allow LAN IPs)
    const urlValidation = validateMasterUrl(masterHost, parseInt(masterPort.toString()));
    if (!urlValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Invalid master configuration: ${urlValidation.error}`
      });
    }

    // Test connection to master
    try {
      logger.info('Testing connection to master...', { masterHost, masterPort });

      const healthUrl = constructSafeUrl(masterHost, parseInt(masterPort.toString()), '/api/slave/health');
      const response = await axios.get(healthUrl!, {
        headers: {
          'X-API-Key': masterApiKey
        },
        timeout: 10000
      });

      // SSRF Protection: Validate response data
      const responseValidation = validateHealthResponse(response.data);
      if (!responseValidation.isValid) {
        throw new Error(`Invalid response from master: ${responseValidation.error}`);
      }

      if (!response.data.success) {
        throw new Error('Master health check failed');
      }

      // Connection successful, update config
      config = await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          masterHost,
          masterPort: parseInt(masterPort.toString()),
          masterApiKey,
          connected: true,
          lastConnectedAt: new Date(),
          connectionError: null
        }
      });

      logger.info('Successfully connected to master', {
        userId: req.user?.userId,
        masterHost,
        masterPort
      });

      res.json({
        success: true,
        data: config,
        message: 'Successfully connected to master node'
      });

    } catch (connectionError: any) {
      // Connection failed, update config with error
      const errorMessage = connectionError.response?.data?.message || 
                          connectionError.message || 
                          'Failed to connect to master';

      config = await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          masterHost,
          masterPort: parseInt(masterPort.toString()),
          masterApiKey,
          connected: false,
          connectionError: errorMessage
        }
      });

      logger.error('Failed to connect to master:', {
        error: errorMessage,
        masterHost,
        masterPort
      });

      return res.status(400).json({
        success: false,
        message: errorMessage,
        data: config
      });
    }

  } catch (error: any) {
    logger.error('Connect to master error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to connect to master'
    });
  }
};

/**
 * Disconnect from master node (for slave mode)
 */
export const disconnectFromMaster = async (req: AuthRequest, res: Response) => {
  try {
    let config = await prisma.systemConfig.findFirst();

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'System config not found'
      });
    }

    config = await prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        masterHost: null,
        masterPort: null,
        masterApiKey: null,
        connected: false,
        lastConnectedAt: null,
        connectionError: null
      }
    });

    logger.info('Disconnected from master', {
      userId: req.user?.userId
    });

    res.json({
      success: true,
      data: config,
      message: 'Disconnected from master node'
    });

  } catch (error) {
    logger.error('Disconnect from master error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect from master'
    });
  }
};

/**
 * Test connection to master (for slave mode)
 */
export const testMasterConnection = async (req: AuthRequest, res: Response) => {
  try {
    const config = await prisma.systemConfig.findFirst();

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'System config not found'
      });
    }

    if (!config.masterHost || !config.masterPort || !config.masterApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Master connection not configured'
      });
    }

    // Test connection
    const startTime = Date.now();
    
    const healthUrl = constructSafeUrl(config.masterHost!, config.masterPort!, '/api/slave/health');
    const response = await axios.get(healthUrl!, {
      headers: {
        'X-API-Key': config.masterApiKey
      },
      timeout: 10000
    });
    const latency = Date.now() - startTime;

    // SSRF Protection: Validate response data
    const responseValidation = validateHealthResponse(response.data);
    if (!responseValidation.isValid) {
      throw new Error(`Invalid response from master: ${responseValidation.error}`);
    }

    // Update config
    await prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        connected: true,
        lastConnectedAt: new Date(),
        connectionError: null
      }
    });

    res.json({
      success: true,
      message: 'Connection to master successful',
      data: {
        latency,
        masterVersion: response.data.version,
        masterStatus: response.data.status
      }
    });

  } catch (error: any) {
    logger.error('Test master connection error:', error);

    // Update config with error
    const config = await prisma.systemConfig.findFirst();
    if (config) {
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          connected: false,
          connectionError: error.message
        }
      });
    }

    res.status(400).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Connection test failed'
    });
  }
};

/**
 * Sync configuration from master (slave pulls all config)
 * NEW APPROACH: Download config → Calculate hash → Compare → Import only if changed
 */
export const syncWithMaster = async (req: AuthRequest, res: Response) => {
  try {
    const config = await prisma.systemConfig.findFirst();

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'System config not found'
      });
    }

    if (config.nodeMode !== 'slave') {
      return res.status(400).json({
        success: false,
        message: 'Cannot sync. Node mode must be "slave".'
      });
    }

    if (!config.connected || !config.masterHost || !config.masterApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Not connected to master. Please connect first.'
      });
    }

    logger.info('Starting sync from master...', {
      masterHost: config.masterHost,
      masterPort: config.masterPort
    });

    // Download config from master using new node-sync API
    const masterUrl = constructSafeUrl(
      config.masterHost!,
      config.masterPort || 3001,
      '/api/node-sync/export'
    );
    
    const response = await axios.get(masterUrl!, {
      headers: {
        'X-Slave-API-Key': config.masterApiKey
      },
      timeout: 30000
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to export config from master');
    }

    // SSRF Protection: Validate response data structure
    const exportValidation = validateConfigExportResponse(response.data.data);
    if (!exportValidation.isValid) {
      throw new Error(`Invalid config export response: ${exportValidation.error}`);
    }

    const { hash: masterHash, config: masterConfig } = response.data.data;

    // Calculate CURRENT hash of slave's config (to detect data loss)
    const slaveCurrentConfigResponse = await axios.get(
      `http://localhost:${process.env.PORT || 3001}/api/node-sync/current-hash`,
      {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      }
    );

    const slaveCurrentHash = slaveCurrentConfigResponse.data.data?.hash || null;

    logger.info('Comparing slave current config with master', {
      masterHash,
      slaveCurrentHash,
      lastSyncHash: config.lastSyncHash || 'none'
    });

    // Compare CURRENT slave hash with master hash
    if (slaveCurrentHash && slaveCurrentHash === masterHash) {
      logger.info('Config identical (hash match), skipping import');
      
      // Update lastConnectedAt and lastSyncHash
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          lastConnectedAt: new Date(),
          lastSyncHash: masterHash
        }
      });

      return res.json({
        success: true,
        message: 'Configuration already synchronized (no changes detected)',
        data: {
          imported: false,
          masterHash,
          slaveHash: slaveCurrentHash,
          changesApplied: 0,
          lastSyncAt: new Date().toISOString()
        }
      });
    }

    // Hash different → Force sync (data loss or master updated)
    logger.info('Config mismatch detected, force syncing...', {
      masterHash,
      slaveCurrentHash: slaveCurrentHash || 'null',
      reason: !slaveCurrentHash ? 'slave_empty' : 'data_mismatch'
    });

    // Extract JWT token from request
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.substring(7) : ''; // Remove 'Bearer '

    // Call import API (internal call to ourselves)
    const importResponse = await axios.post(
      `http://localhost:${process.env.PORT || 3001}/api/node-sync/import`,
      {
        hash: masterHash,
        config: masterConfig
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!importResponse.data.success) {
      throw new Error(importResponse.data.message || 'Import failed');
    }

    const importData = importResponse.data.data;

    // Update lastSyncHash
    await prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        lastSyncHash: masterHash,
        lastConnectedAt: new Date()
      }
    });

    logger.info(`Sync completed successfully. ${importData.changes} changes applied.`);

    res.json({
      success: true,
      message: 'Configuration synchronized successfully',
      data: {
        imported: true,
        masterHash,
        slaveHash: slaveCurrentHash,
        changesApplied: importData.changes,
        details: importData.details,
        lastSyncAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Sync with master error:', error);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Sync failed'
    });
  }
};
