import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';

export interface SlaveRequest extends Request {
  slaveNode?: {
    id: string;
    name: string;
    host: string;
    port: number;
  };
}

/**
 * Validate Slave API Key
 * Used for slave nodes to authenticate with master
 */
export const validateSlaveApiKey = async (
  req: SlaveRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        message: 'API key required'
      });
      return;
    }

    // Find slave node by API key
    const slaveNode = await prisma.slaveNode.findFirst({
      where: { apiKey },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        syncEnabled: true
      }
    });

    if (!slaveNode) {
      logger.warn('Invalid slave API key attempt', { apiKey: apiKey.substring(0, 8) + '...' });
      res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
      return;
    }

    if (!slaveNode.syncEnabled) {
      res.status(403).json({
        success: false,
        message: 'Node sync is disabled'
      });
      return;
    }

    // Attach slave node info to request
    req.slaveNode = slaveNode;

    // Update last seen
    await prisma.slaveNode.update({
      where: { id: slaveNode.id },
      data: { lastSeen: new Date() }
    }).catch(() => {}); // Don't fail if update fails

    next();
  } catch (error) {
    logger.error('Slave API key validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};
