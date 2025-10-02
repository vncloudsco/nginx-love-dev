import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import prisma from '../config/database';
import { sendTestNotification } from '../utils/notification.service';

/**
 * Get all notification channels
 */
export const getNotificationChannels = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channels = await prisma.notificationChannel.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    logger.error('Get notification channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get single notification channel
 */
export const getNotificationChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const channel = await prisma.notificationChannel.findUnique({
      where: { id }
    });

    if (!channel) {
      res.status(404).json({
        success: false,
        message: 'Notification channel not found'
      });
      return;
    }

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    logger.error('Get notification channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create notification channel
 */
export const createNotificationChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, type, enabled, config } = req.body;

    // Validation
    if (!name || !type || !config) {
      res.status(400).json({
        success: false,
        message: 'Name, type, and config are required'
      });
      return;
    }

    if (type === 'email' && !config.email) {
      res.status(400).json({
        success: false,
        message: 'Email is required for email channel'
      });
      return;
    }

    if (type === 'telegram' && (!config.chatId || !config.botToken)) {
      res.status(400).json({
        success: false,
        message: 'Chat ID and Bot Token are required for Telegram channel'
      });
      return;
    }

    const channel = await prisma.notificationChannel.create({
      data: {
        name,
        type,
        enabled: enabled !== undefined ? enabled : true,
        config
      }
    });

    logger.info(`User ${req.user?.username} created notification channel: ${channel.name}`);

    res.status(201).json({
      success: true,
      data: channel
    });
  } catch (error) {
    logger.error('Create notification channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update notification channel
 */
export const updateNotificationChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type, enabled, config } = req.body;

    const existingChannel = await prisma.notificationChannel.findUnique({
      where: { id }
    });

    if (!existingChannel) {
      res.status(404).json({
        success: false,
        message: 'Notification channel not found'
      });
      return;
    }

    const channel = await prisma.notificationChannel.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(enabled !== undefined && { enabled }),
        ...(config && { config })
      }
    });

    logger.info(`User ${req.user?.username} updated notification channel: ${channel.name}`);

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    logger.error('Update notification channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete notification channel
 */
export const deleteNotificationChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const channel = await prisma.notificationChannel.findUnique({
      where: { id }
    });

    if (!channel) {
      res.status(404).json({
        success: false,
        message: 'Notification channel not found'
      });
      return;
    }

    await prisma.notificationChannel.delete({
      where: { id }
    });

    logger.info(`User ${req.user?.username} deleted notification channel: ${channel.name}`);

    res.json({
      success: true,
      message: 'Notification channel deleted successfully'
    });
  } catch (error) {
    logger.error('Delete notification channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Test notification channel
 */
export const testNotificationChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const channel = await prisma.notificationChannel.findUnique({
      where: { id }
    });

    if (!channel) {
      res.status(404).json({
        success: false,
        message: 'Notification channel not found'
      });
      return;
    }

    if (!channel.enabled) {
      res.status(400).json({
        success: false,
        message: 'Channel is disabled'
      });
      return;
    }

    // Send actual test notification
    logger.info(`Sending test notification to channel: ${channel.name} (type: ${channel.type})`);
    
    const result = await sendTestNotification(
      channel.name,
      channel.type,
      channel.config as any
    );

    if (result.success) {
      logger.info(`✅ ${result.message}`);
      res.json({
        success: true,
        message: result.message
      });
    } else {
      logger.error(`❌ Failed to send test notification: ${result.message}`);
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    logger.error('Test notification channel error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * Get all alert rules
 */
export const getAlertRules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rules = await prisma.alertRule.findMany({
      include: {
        channels: {
          include: {
            channel: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to match frontend format
    const transformedRules = rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      enabled: rule.enabled,
      channels: rule.channels.map(rc => rc.channelId),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    }));

    res.json({
      success: true,
      data: transformedRules
    });
  } catch (error) {
    logger.error('Get alert rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get single alert rule
 */
export const getAlertRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const rule = await prisma.alertRule.findUnique({
      where: { id },
      include: {
        channels: {
          include: {
            channel: true
          }
        }
      }
    });

    if (!rule) {
      res.status(404).json({
        success: false,
        message: 'Alert rule not found'
      });
      return;
    }

    // Transform to match frontend format
    const transformedRule = {
      id: rule.id,
      name: rule.name,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      enabled: rule.enabled,
      channels: rule.channels.map(rc => rc.channelId),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    };

    res.json({
      success: true,
      data: transformedRule
    });
  } catch (error) {
    logger.error('Get alert rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create alert rule
 */
export const createAlertRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, condition, threshold, severity, channels, enabled } = req.body;

    // Validation
    if (!name || !condition || threshold === undefined || !severity) {
      res.status(400).json({
        success: false,
        message: 'Name, condition, threshold, and severity are required'
      });
      return;
    }

    // Verify channels exist
    if (channels && channels.length > 0) {
      const existingChannels = await prisma.notificationChannel.findMany({
        where: {
          id: {
            in: channels
          }
        }
      });

      if (existingChannels.length !== channels.length) {
        res.status(400).json({
          success: false,
          message: 'One or more notification channels not found'
        });
        return;
      }
    }

    // Create rule with channels
    const rule = await prisma.alertRule.create({
      data: {
        name,
        condition,
        threshold,
        severity,
        enabled: enabled !== undefined ? enabled : true,
        channels: channels && channels.length > 0 ? {
          create: channels.map((channelId: string) => ({
            channelId
          }))
        } : undefined
      },
      include: {
        channels: {
          include: {
            channel: true
          }
        }
      }
    });

    logger.info(`User ${req.user?.username} created alert rule: ${rule.name}`);

    // Transform to match frontend format
    const transformedRule = {
      id: rule.id,
      name: rule.name,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      enabled: rule.enabled,
      channels: rule.channels.map(rc => rc.channelId),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    };

    res.status(201).json({
      success: true,
      data: transformedRule
    });
  } catch (error) {
    logger.error('Create alert rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update alert rule
 */
export const updateAlertRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, condition, threshold, severity, channels, enabled } = req.body;

    const existingRule = await prisma.alertRule.findUnique({
      where: { id }
    });

    if (!existingRule) {
      res.status(404).json({
        success: false,
        message: 'Alert rule not found'
      });
      return;
    }

    // If channels are being updated, verify they exist
    if (channels) {
      const existingChannels = await prisma.notificationChannel.findMany({
        where: {
          id: {
            in: channels
          }
        }
      });

      if (existingChannels.length !== channels.length) {
        res.status(400).json({
          success: false,
          message: 'One or more notification channels not found'
        });
        return;
      }

      // Delete existing channel associations
      await prisma.alertRuleChannel.deleteMany({
        where: { ruleId: id }
      });
    }

    // Update rule
    const rule = await prisma.alertRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(condition && { condition }),
        ...(threshold !== undefined && { threshold }),
        ...(severity && { severity }),
        ...(enabled !== undefined && { enabled }),
        ...(channels && {
          channels: {
            create: channels.map((channelId: string) => ({
              channelId
            }))
          }
        })
      },
      include: {
        channels: {
          include: {
            channel: true
          }
        }
      }
    });

    logger.info(`User ${req.user?.username} updated alert rule: ${rule.name}`);

    // Transform to match frontend format
    const transformedRule = {
      id: rule.id,
      name: rule.name,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      enabled: rule.enabled,
      channels: rule.channels.map(rc => rc.channelId),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    };

    res.json({
      success: true,
      data: transformedRule
    });
  } catch (error) {
    logger.error('Update alert rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete alert rule
 */
export const deleteAlertRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const rule = await prisma.alertRule.findUnique({
      where: { id }
    });

    if (!rule) {
      res.status(404).json({
        success: false,
        message: 'Alert rule not found'
      });
      return;
    }

    await prisma.alertRule.delete({
      where: { id }
    });

    logger.info(`User ${req.user?.username} deleted alert rule: ${rule.name}`);

    res.json({
      success: true,
      message: 'Alert rule deleted successfully'
    });
  } catch (error) {
    logger.error('Delete alert rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
