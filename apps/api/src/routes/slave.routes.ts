import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validateSlaveApiKey } from '../middleware/slaveAuth';
import {
  // Master API endpoints
  registerSlaveNode,
  getSlaveNodes,
  getSlaveNode,
  updateSlaveNode,
  deleteSlaveNode,
  syncConfigToNode,
  syncConfigToAllNodes,
  getNodeStatus,
  getNodeSyncHistory,
  regenerateApiKey,
  
  // Slave API endpoints
  pullConfig,
  reportStatus,
  healthCheck
} from '../controllers/slave.controller';

const router = Router();

// ==========================================
// MASTER API ENDPOINTS (Authenticated)
// ==========================================

/**
 * @route   POST /api/slave/nodes
 * @desc    Register new slave node
 * @access  Private (admin)
 */
router.post(
  '/nodes',
  authenticate,
  authorize('admin'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('host').notEmpty().withMessage('Host is required'),
    body('port').optional().isInt({ min: 1, max: 65535 }),
    body('syncInterval').optional().isInt({ min: 10 })
  ],
  registerSlaveNode
);

/**
 * @route   GET /api/slave/nodes
 * @desc    Get all slave nodes
 * @access  Private (all roles)
 */
router.get('/nodes', authenticate, getSlaveNodes);

/**
 * @route   GET /api/slave/nodes/:id
 * @desc    Get single slave node
 * @access  Private (all roles)
 */
router.get('/nodes/:id', authenticate, getSlaveNode);

/**
 * @route   PUT /api/slave/nodes/:id
 * @desc    Update slave node
 * @access  Private (admin, moderator)
 */
router.put(
  '/nodes/:id',
  authenticate,
  authorize('admin', 'moderator'),
  [
    body('name').optional().notEmpty(),
    body('host').optional().notEmpty(),
    body('port').optional().isInt({ min: 1, max: 65535 }),
    body('syncEnabled').optional().isBoolean(),
    body('syncInterval').optional().isInt({ min: 10 })
  ],
  updateSlaveNode
);

/**
 * @route   DELETE /api/slave/nodes/:id
 * @desc    Delete slave node
 * @access  Private (admin)
 */
router.delete('/nodes/:id', authenticate, authorize('admin'), deleteSlaveNode);

/**
 * @route   POST /api/slave/nodes/:id/sync
 * @desc    Sync configuration to specific node
 * @access  Private (admin, moderator)
 */
router.post(
  '/nodes/:id/sync',
  authenticate,
  authorize('admin', 'moderator'),
  [body('force').optional().isBoolean()],
  syncConfigToNode
);

/**
 * @route   POST /api/slave/nodes/sync-all
 * @desc    Sync configuration to all active nodes
 * @access  Private (admin, moderator)
 */
router.post(
  '/nodes/sync-all',
  authenticate,
  authorize('admin', 'moderator'),
  syncConfigToAllNodes
);

/**
 * @route   GET /api/slave/nodes/:id/status
 * @desc    Get node status (health check)
 * @access  Private (all roles)
 */
router.get('/nodes/:id/status', authenticate, getNodeStatus);

/**
 * @route   GET /api/slave/nodes/:id/sync-history
 * @desc    Get node sync history
 * @access  Private (all roles)
 */
router.get('/nodes/:id/sync-history', authenticate, getNodeSyncHistory);

/**
 * @route   POST /api/slave/nodes/:id/regenerate-key
 * @desc    Regenerate API key for slave node
 * @access  Private (admin)
 */
router.post(
  '/nodes/:id/regenerate-key',
  authenticate,
  authorize('admin'),
  regenerateApiKey
);

// ==========================================
// SLAVE API ENDPOINTS (API Key Authenticated)
// ==========================================

/**
 * @route   POST /api/slave/sync/pull-config
 * @desc    Pull configuration from master (called by slave)
 * @access  Slave API Key
 */
router.post('/sync/pull-config', validateSlaveApiKey, pullConfig);

/**
 * @route   POST /api/slave/sync/report-status
 * @desc    Report status to master (called by slave)
 * @access  Slave API Key
 */
router.post(
  '/sync/report-status',
  validateSlaveApiKey,
  [
    body('configHash').optional().isString(),
    body('metrics').optional().isObject()
  ],
  reportStatus
);

/**
 * @route   GET /api/slave/sync/health
 * @desc    Health check endpoint (called by master)
 * @access  Slave API Key
 */
router.get('/sync/health', validateSlaveApiKey, healthCheck);

export default router;
