import { Router } from 'express';
import {
  getDomains,
  getDomainById,
  createDomain,
  updateDomain,
  deleteDomain,
  reloadNginx,
  toggleSSL,
} from '../controllers/domain.controller';
import { authenticate, authorize } from '../middleware/auth';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createDomainValidation = [
  body('name')
    .notEmpty()
    .withMessage('Domain name is required')
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/)
    .withMessage('Invalid domain name format'),
  body('upstreams')
    .isArray({ min: 1 })
    .withMessage('At least one upstream is required'),
  body('upstreams.*.host')
    .notEmpty()
    .withMessage('Upstream host is required'),
  body('upstreams.*.port')
    .isInt({ min: 1, max: 65535 })
    .withMessage('Upstream port must be between 1 and 65535'),
];

const updateDomainValidation = [
  body('name')
    .optional()
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/)
    .withMessage('Invalid domain name format'),
];

/**
 * @route   GET /api/domains
 * @desc    Get all domains
 * @access  Private (all roles)
 */
router.get('/', getDomains);

/**
 * @route   GET /api/domains/:id
 * @desc    Get domain by ID
 * @access  Private (all roles)
 */
router.get('/:id', getDomainById);

/**
 * @route   POST /api/domains
 * @desc    Create new domain
 * @access  Private (admin, moderator)
 */
router.post('/', authorize('admin', 'moderator'), createDomainValidation, createDomain);

/**
 * @route   PUT /api/domains/:id
 * @desc    Update domain
 * @access  Private (admin, moderator)
 */
router.put('/:id', authorize('admin', 'moderator'), updateDomainValidation, updateDomain);

/**
 * @route   DELETE /api/domains/:id
 * @desc    Delete domain
 * @access  Private (admin only)
 */
router.delete('/:id', authorize('admin'), deleteDomain);

/**
 * @route   POST /api/domains/:id/toggle-ssl
 * @desc    Enable/Disable SSL for domain
 * @access  Private (admin, moderator)
 */
router.post('/:id/toggle-ssl', authorize('admin', 'moderator'), toggleSSL);

/**
 * @route   POST /api/domains/nginx/reload
 * @desc    Reload nginx configuration
 * @access  Private (admin only)
 */
router.post('/nginx/reload', authorize('admin'), reloadNginx);

export default router;
