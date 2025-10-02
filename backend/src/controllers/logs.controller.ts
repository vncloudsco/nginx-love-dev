import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { getParsedLogs, getLogStats } from '../utils/log-parser';
import prisma from '../config/database';

/**
 * Get logs with filters
 */
export const getLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      limit = '100',
      level,
      type,
      search,
      domain
    } = req.query;

    const logs = await getParsedLogs({
      limit: parseInt(limit as string),
      level: level as string,
      type: type as string,
      search: search as string,
      domain: domain as string
    });

    logger.info(`User ${req.user?.username} fetched ${logs.length} logs${domain ? ` for domain ${domain}` : ''}`);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get log statistics
 */
export const getLogStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await getLogStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get log statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Download logs as JSON
 */
export const downloadLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      limit = '1000',
      level,
      type,
      search,
      domain
    } = req.query;

    const logs = await getParsedLogs({
      limit: parseInt(limit as string),
      level: level as string,
      type: type as string,
      search: search as string,
      domain: domain as string
    });

    logger.info(`User ${req.user?.username} downloaded ${logs.length} logs${domain ? ` for domain ${domain}` : ''}`);

    // Set headers for file download
    const filename = `logs-${new Date().toISOString()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json({
      success: true,
      data: logs,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: req.user?.username,
        totalCount: logs.length
      }
    });
  } catch (error) {
    logger.error('Download logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get list of available domains for filtering
 */
export const getAvailableDomains = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const domains = await prisma.domain.findMany({
      select: {
        name: true,
        status: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: domains
    });
  } catch (error) {
    logger.error('Get available domains error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
