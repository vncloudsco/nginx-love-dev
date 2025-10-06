import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SlaveRequest } from '../middleware/slaveAuth';
import prisma from '../config/database';
import logger from '../utils/logger';
import crypto from 'crypto';

/**
 * Generate random API key for slave authentication
 */
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Register new slave node
 */
export const registerSlaveNode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, host, port = 3001, syncInterval = 60 } = req.body;

    // Check if name already exists
    const existing = await prisma.slaveNode.findUnique({
      where: { name }
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: 'Slave node with this name already exists'
      });
      return;
    }

    // Generate API key for slave authentication
    const apiKey = generateApiKey();

    const node = await prisma.slaveNode.create({
      data: {
        name,
        host,
        port,
        syncInterval,
        apiKey,
        syncEnabled: true,
        status: 'offline'
      }
    });

    logger.info(`Slave node registered: ${name}`, {
      userId: req.user?.userId,
      host,
      port
    });

    res.status(201).json({
      success: true,
      message: 'Slave node registered successfully',
      data: {
        id: node.id,
        name: node.name,
        host: node.host,
        port: node.port,
        apiKey: node.apiKey, // Return API key ONLY on creation
        status: node.status
      }
    });
  } catch (error: any) {
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
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        status: true,
        syncEnabled: true,
        syncInterval: true,
        lastSeen: true,
        configHash: true,
        createdAt: true,
        updatedAt: true
        // DO NOT return apiKey
      }
    });

    res.json({
      success: true,
      data: nodes
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
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        status: true,
        syncEnabled: true,
        syncInterval: true,
        lastSeen: true,
        configHash: true,
        createdAt: true,
        updatedAt: true
        // DO NOT return apiKey
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
      data: node
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
 * Health check endpoint (called by master to verify slave is alive)
 */
export const healthCheck = async (req: SlaveRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      message: 'Slave node is healthy',
      data: {
        timestamp: new Date().toISOString(),
        nodeId: req.slaveNode?.id,
        nodeName: req.slaveNode?.name
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed'
    });
  }
};
