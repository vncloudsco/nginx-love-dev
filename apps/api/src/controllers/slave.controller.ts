import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SlaveRequest } from '../middleware/slaveAuth';
import prisma from '../config/database';
import logger from '../utils/logger';
import crypto from 'crypto';
import axios from 'axios';

/**
 * Generate SHA256 hash for config data
 */
function generateConfigHash(config: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(config))
    .digest('hex');
}

/**
 * Generate random API key for slave authentication
 */
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Collect current configuration for sync
 */
async function collectCurrentConfig() {
  const [domains, ssl, modsec, crsRules, acl, nginxConfigs, alertRules, notificationChannels] = await Promise.all([
    prisma.domain.findMany({
      include: {
        upstreams: true,
        loadBalancer: true,
        sslCertificate: true
      }
    }),
    prisma.sSLCertificate.findMany({
      include: {
        domain: true
      }
    }),
    prisma.modSecRule.findMany(),
    prisma.modSecCRSRule.findMany(),
    prisma.aclRule.findMany(),
    prisma.nginxConfig.findMany(),
    prisma.alertRule.findMany({
      include: {
        channels: {
          include: {
            channel: true
          }
        }
      }
    }),
    prisma.notificationChannel.findMany()
  ]);

  return {
    version: '2.0',
    timestamp: new Date().toISOString(),
    domains: domains.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      sslEnabled: d.sslEnabled,
      modsecEnabled: d.modsecEnabled,
      upstreams: d.upstreams,
      loadBalancer: d.loadBalancer,
      sslCertificateId: d.sslCertificateId
    })),
    ssl: ssl.map(s => ({
      id: s.id,
      commonName: s.commonName,
      sans: s.sans,
      issuer: s.issuer,
      validFrom: s.validFrom,
      validTo: s.validTo,
      autoRenew: s.autoRenew,
      domainId: s.domainId
    })),
    modsec: {
      customRules: modsec,
      crsRules: crsRules
    },
    acl: acl,
    nginxConfigs: nginxConfigs,
    alertRules: alertRules.map(r => ({
      id: r.id,
      name: r.name,
      condition: r.condition,
      threshold: r.threshold,
      severity: r.severity,
      enabled: r.enabled,
      channels: r.channels.map(c => c.channelId)
    })),
    notificationChannels: notificationChannels
  };
}

// ==========================================
// MASTER API ENDPOINTS
// ==========================================

/**
 * Register new slave node
 */
export const registerSlaveNode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, host, port, syncInterval } = req.body;

    // Check if node with same name exists
    const existing = await prisma.slaveNode.findUnique({
      where: { name }
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: 'Node with this name already exists'
      });
      return;
    }

    // Generate API key
    const apiKey = generateApiKey();

    const node = await prisma.slaveNode.create({
      data: {
        name,
        host,
        port: port || 3001,
        apiKey,
        syncInterval: syncInterval || 60,
        status: 'offline'
      }
    });

    logger.info(`Slave node registered: ${name}`, {
      userId: req.user?.userId,
      nodeId: node.id
    });

    res.status(201).json({
      success: true,
      message: 'Slave node registered successfully',
      data: {
        id: node.id,
        name: node.name,
        host: node.host,
        port: node.port,
        apiKey: node.apiKey, // Send once during registration
        syncInterval: node.syncInterval
      }
    });
  } catch (error) {
    logger.error('Register slave node error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register slave node'
    });
  }
};

/**
 * Get all slave nodes
 */
export const getSlaveNodes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const nodes = await prisma.slaveNode.findMany({
      include: {
        syncLogs: {
          take: 1,
          orderBy: {
            startedAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: nodes.map(node => ({
        ...node,
        apiKey: undefined, // Don't expose API key in list
        lastSync: node.syncLogs[0] || null,
        syncLogs: undefined
      }))
    });
  } catch (error) {
    logger.error('Get slave nodes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get slave nodes'
    });
  }
};

/**
 * Get single slave node
 */
export const getSlaveNode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const node = await prisma.slaveNode.findUnique({
      where: { id },
      include: {
        syncLogs: {
          take: 10,
          orderBy: {
            startedAt: 'desc'
          }
        }
      }
    });

    if (!node) {
      res.status(404).json({
        success: false,
        message: 'Slave node not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        ...node,
        apiKey: undefined // Don't expose API key
      }
    });
  } catch (error) {
    logger.error('Get slave node error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get slave node'
    });
  }
};

/**
 * Update slave node
 */
export const updateSlaveNode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, host, port, syncEnabled, syncInterval } = req.body;

    const updated = await prisma.slaveNode.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(host && { host }),
        ...(port && { port }),
        ...(syncEnabled !== undefined && { syncEnabled }),
        ...(syncInterval && { syncInterval })
      }
    });

    logger.info(`Slave node updated: ${id}`, {
      userId: req.user?.userId
    });

    res.json({
      success: true,
      message: 'Slave node updated successfully',
      data: {
        ...updated,
        apiKey: undefined
      }
    });
  } catch (error) {
    logger.error('Update slave node error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update slave node'
    });
  }
};

/**
 * Delete slave node
 */
export const deleteSlaveNode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.slaveNode.delete({
      where: { id }
    });

    logger.info(`Slave node deleted: ${id}`, {
      userId: req.user?.userId
    });

    res.json({
      success: true,
      message: 'Slave node deleted successfully'
    });
  } catch (error) {
    logger.error('Delete slave node error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete slave node'
    });
  }
};

/**
 * Sync configuration to specific node
 */
export const syncConfigToNode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { force } = req.body;

    const node = await prisma.slaveNode.findUnique({ where: { id } });
    if (!node) {
      res.status(404).json({
        success: false,
        message: 'Slave node not found'
      });
      return;
    }

    if (!node.syncEnabled) {
      res.status(400).json({
        success: false,
        message: 'Sync is disabled for this node'
      });
      return;
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        nodeId: id,
        type: 'full_sync',
        status: 'running'
      }
    });

    const startTime = Date.now();

    try {
      // Collect config
      const config = await collectCurrentConfig();
      const configHash = generateConfigHash(config);

      // Check if sync needed (skip if same hash and not forced)
      if (!force && node.configHash === configHash) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'success',
            completedAt: new Date(),
            duration: Date.now() - startTime,
            configHash
          }
        });

        return res.json({
          success: true,
          message: 'Configuration already up to date',
          data: { 
            skipped: true,
            configHash
          }
        });
      }

      // Store config version
      await prisma.configVersion.create({
        data: {
          configHash,
          configData: config as any,
          createdBy: req.user?.userId,
          description: `Sync to ${node.name}`
        }
      }).catch(() => {}); // Ignore if hash already exists

      // Update node status
      await prisma.slaveNode.update({
        where: { id },
        data: { status: 'syncing' }
      });

      // Push config to slave via HTTP
      const response = await axios.post(
        `http://${node.host}:${node.port}/api/slave/sync/apply-config`,
        { 
          config, 
          configHash,
          masterVersion: '2.0'
        },
        {
          headers: {
            'X-API-Key': node.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60s timeout for large configs
        }
      );

      if (response.data.success) {
        // Update sync log - success
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'success',
            completedAt: new Date(),
            duration: Date.now() - startTime,
            configHash,
            changesCount: response.data.changesCount
          }
        });

        // Update node
        await prisma.slaveNode.update({
          where: { id },
          data: {
            status: 'online',
            configHash,
            lastSyncAt: new Date(),
            lastSeen: new Date(),
            version: response.data.version
          }
        });

        logger.info(`Config synced to node: ${node.name}`, {
          userId: req.user?.userId,
          nodeId: id,
          configHash,
          duration: Date.now() - startTime
        });

        res.json({
          success: true,
          message: 'Configuration synced successfully',
          data: {
            configHash,
            changesCount: response.data.changesCount,
            duration: Date.now() - startTime
          }
        });
      } else {
        throw new Error(response.data.message || 'Slave rejected configuration');
      }
    } catch (error: any) {
      // Update sync log - failed
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          duration: Date.now() - startTime,
          errorMessage: error.message
        }
      });

      // Update node status to error
      await prisma.slaveNode.update({
        where: { id },
        data: { status: 'error' }
      });

      throw error;
    }
  } catch (error: any) {
    logger.error('Sync config to node error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Sync failed'
    });
  }
};

/**
 * Sync to all active nodes
 */
export const syncConfigToAllNodes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const nodes = await prisma.slaveNode.findMany({
      where: { 
        syncEnabled: true,
        status: { not: 'error' }
      }
    });

    if (nodes.length === 0) {
      res.json({
        success: true,
        message: 'No active nodes to sync',
        data: { total: 0, success: 0, failed: 0 }
      });
      return;
    }

    const results = await Promise.allSettled(
      nodes.map(async (node) => {
        const mockReq = { ...req, params: { id: node.id }, body: { force: false } } as any;
        const mockRes = {
          status: () => mockRes,
          json: (data: any) => data
        } as any;
        
        await syncConfigToNode(mockReq, mockRes);
        return node;
      })
    );

    const summary = {
      total: nodes.length,
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };

    logger.info('Sync to all nodes completed', {
      userId: req.user?.userId,
      summary
    });

    res.json({
      success: true,
      message: `Synced to ${summary.success}/${summary.total} nodes`,
      data: summary
    });
  } catch (error) {
    logger.error('Sync all nodes error:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed'
    });
  }
};

/**
 * Get node status (health check from master)
 */
export const getNodeStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const node = await prisma.slaveNode.findUnique({ where: { id } });
    if (!node) {
      res.status(404).json({
        success: false,
        message: 'Node not found'
      });
      return;
    }

    try {
      const startTime = Date.now();
      const response = await axios.get(
        `http://${node.host}:${node.port}/api/slave/sync/health`,
        {
          headers: { 'X-API-Key': node.apiKey },
          timeout: 5000
        }
      );

      const latency = Date.now() - startTime;

      // Update node with health check results
      await prisma.slaveNode.update({
        where: { id },
        data: {
          status: 'online',
          lastSeen: new Date(),
          version: response.data.version,
          latency,
          cpuUsage: response.data.metrics?.cpu,
          memoryUsage: response.data.metrics?.memory,
          diskUsage: response.data.metrics?.disk
        }
      });

      res.json({
        success: true,
        data: {
          status: 'online',
          latency,
          ...response.data
        }
      });
    } catch (error) {
      // Mark node as offline
      await prisma.slaveNode.update({
        where: { id },
        data: { status: 'offline' }
      });

      res.json({
        success: true,
        data: { 
          status: 'offline',
          error: 'Failed to reach node'
        }
      });
    }
  } catch (error) {
    logger.error('Get node status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get node status'
    });
  }
};

/**
 * Get node sync history
 */
export const getNodeSyncHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const syncLogs = await prisma.syncLog.findMany({
      where: { nodeId: id },
      orderBy: { startedAt: 'desc' },
      take: Number(limit)
    });

    res.json({
      success: true,
      data: syncLogs
    });
  } catch (error) {
    logger.error('Get sync history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync history'
    });
  }
};

/**
 * Regenerate API key for slave node
 */
export const regenerateApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const newApiKey = generateApiKey();

    const updated = await prisma.slaveNode.update({
      where: { id },
      data: { apiKey: newApiKey }
    });

    logger.warn(`API key regenerated for node: ${updated.name}`, {
      userId: req.user?.userId,
      nodeId: id
    });

    res.json({
      success: true,
      message: 'API key regenerated successfully',
      data: {
        apiKey: newApiKey // Send new key once
      }
    });
  } catch (error) {
    logger.error('Regenerate API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate API key'
    });
  }
};

// ==========================================
// SLAVE API ENDPOINTS
// ==========================================

/**
 * Pull configuration from master (called by slave)
 */
export const pullConfig = async (req: SlaveRequest, res: Response): Promise<void> => {
  try {
    const config = await collectCurrentConfig();
    const configHash = generateConfigHash(config);

    logger.info('Config pulled by slave', {
      nodeId: req.slaveNode?.id,
      nodeName: req.slaveNode?.name
    });

    res.json({
      success: true,
      data: {
        config,
        configHash,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Pull config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pull configuration'
    });
  }
};

/**
 * Report status to master (called by slave)
 */
export const reportStatus = async (req: SlaveRequest, res: Response): Promise<void> => {
  try {
    const { configHash, metrics } = req.body;
    const nodeId = req.slaveNode?.id;

    if (!nodeId) {
      res.status(400).json({
        success: false,
        message: 'Node ID not found'
      });
      return;
    }

    // Update node status
    await prisma.slaveNode.update({
      where: { id: nodeId },
      data: {
        status: 'online',
        lastSeen: new Date(),
        ...(configHash && { configHash }),
        ...(metrics?.cpu !== undefined && { cpuUsage: metrics.cpu }),
        ...(metrics?.memory !== undefined && { memoryUsage: metrics.memory }),
        ...(metrics?.disk !== undefined && { diskUsage: metrics.disk })
      }
    });

    // Check if config needs sync
    const masterConfig = await collectCurrentConfig();
    const masterHash = generateConfigHash(masterConfig);
    const needsSync = configHash !== masterHash;

    res.json({
      success: true,
      data: {
        needsSync,
        masterHash: needsSync ? masterHash : undefined
      }
    });
  } catch (error) {
    logger.error('Report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report status'
    });
  }
};

/**
 * Health check endpoint (called by master)
 */
export const healthCheck = async (req: SlaveRequest, res: Response): Promise<void> => {
  try {
    const nodeId = req.slaveNode?.id;

    // Get system metrics (basic implementation)
    const metrics = {
      cpu: 0, // TODO: Implement actual CPU usage
      memory: 0, // TODO: Implement actual memory usage
      disk: 0 // TODO: Implement actual disk usage
    };

    res.json({
      success: true,
      status: 'healthy',
      version: process.env.APP_VERSION || '2.0.0',
      nodeId,
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed'
    });
  }
};
