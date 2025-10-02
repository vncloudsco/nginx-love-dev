import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';
import { applyAclRules } from '../utils/acl-nginx';

/**
 * Get all ACL rules
 */
export const getAclRules = async (req: Request, res: Response) => {
  try {
    const rules = await prisma.aclRule.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: rules
    });
  } catch (error: any) {
    logger.error('Failed to fetch ACL rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ACL rules',
      error: error.message
    });
  }
};

/**
 * Get single ACL rule by ID
 */
export const getAclRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rule = await prisma.aclRule.findUnique({
      where: { id }
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'ACL rule not found'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error: any) {
    logger.error('Failed to fetch ACL rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ACL rule',
      error: error.message
    });
  }
};

/**
 * Create new ACL rule
 */
export const createAclRule = async (req: Request, res: Response) => {
  try {
    const {
      name,
      type,
      conditionField,
      conditionOperator,
      conditionValue,
      action,
      enabled
    } = req.body;

    // Validation
    if (!name || !type || !conditionField || !conditionOperator || !conditionValue || !action) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const rule = await prisma.aclRule.create({
      data: {
        name,
        type,
        conditionField,
        conditionOperator,
        conditionValue,
        action,
        enabled: enabled !== undefined ? enabled : true
      }
    });

    logger.info(`ACL rule created: ${rule.name} (${rule.id})`);

    // Auto-apply ACL rules to Nginx
    await applyAclRules();

    res.status(201).json({
      success: true,
      message: 'ACL rule created successfully',
      data: rule
    });
  } catch (error: any) {
    logger.error('Failed to create ACL rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ACL rule',
      error: error.message
    });
  }
};

/**
 * Update ACL rule
 */
export const updateAclRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      conditionField,
      conditionOperator,
      conditionValue,
      action,
      enabled
    } = req.body;

    // Check if rule exists
    const existingRule = await prisma.aclRule.findUnique({
      where: { id }
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'ACL rule not found'
      });
    }

    const rule = await prisma.aclRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(conditionField && { conditionField }),
        ...(conditionOperator && { conditionOperator }),
        ...(conditionValue && { conditionValue }),
        ...(action && { action }),
        ...(enabled !== undefined && { enabled })
      }
    });

    logger.info(`ACL rule updated: ${rule.name} (${rule.id})`);

    // Auto-apply ACL rules to Nginx
    await applyAclRules();

    res.json({
      success: true,
      message: 'ACL rule updated successfully',
      data: rule
    });
  } catch (error: any) {
    logger.error('Failed to update ACL rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ACL rule',
      error: error.message
    });
  }
};

/**
 * Delete ACL rule
 */
export const deleteAclRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if rule exists
    const existingRule = await prisma.aclRule.findUnique({
      where: { id }
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'ACL rule not found'
      });
    }

    await prisma.aclRule.delete({
      where: { id }
    });

    logger.info(`ACL rule deleted: ${existingRule.name} (${id})`);

    // Auto-apply ACL rules to Nginx
    await applyAclRules();

    res.json({
      success: true,
      message: 'ACL rule deleted successfully'
    });
  } catch (error: any) {
    logger.error('Failed to delete ACL rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ACL rule',
      error: error.message
    });
  }
};

/**
 * Toggle ACL rule enabled status
 */
export const toggleAclRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if rule exists
    const existingRule = await prisma.aclRule.findUnique({
      where: { id }
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'ACL rule not found'
      });
    }

    const rule = await prisma.aclRule.update({
      where: { id },
      data: {
        enabled: !existingRule.enabled
      }
    });

    logger.info(`ACL rule toggled: ${rule.name} (${rule.id}) - enabled: ${rule.enabled}`);

    // Auto-apply ACL rules to Nginx
    await applyAclRules();

    res.json({
      success: true,
      message: `ACL rule ${rule.enabled ? 'enabled' : 'disabled'} successfully`,
      data: rule
    });
  } catch (error: any) {
    logger.error('Failed to toggle ACL rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle ACL rule',
      error: error.message
    });
  }
};

/**
 * Apply ACL rules to Nginx
 */
export const applyAclToNginx = async (req: Request, res: Response) => {
  try {
    logger.info('Manual ACL rules application triggered');

    const result = await applyAclRules();

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    logger.error('Failed to apply ACL rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply ACL rules',
      error: error.message
    });
  }
};
