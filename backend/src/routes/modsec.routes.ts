import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import {
  getCRSRules,
  toggleCRSRule,
  getModSecRules,
  getModSecRule,
  toggleModSecRule,
  addCustomRule,
  updateModSecRule,
  deleteModSecRule,
  getGlobalModSecSettings,
  setGlobalModSec,
} from '../controllers/modsec.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRS Rules (OWASP Core Rule Set)
router.get('/crs/rules', getCRSRules);
router.patch('/crs/rules/:ruleFile/toggle', authorize('admin', 'moderator'), toggleCRSRule);

// Custom Rules
router.get('/rules', getModSecRules);

// Get single rule
router.get('/rules/:id', getModSecRule);

// Toggle rule enabled/disabled
router.patch('/rules/:id/toggle', authorize('admin', 'moderator'), toggleModSecRule);

// Add custom rule
router.post(
  '/rules',
  authorize('admin', 'moderator'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('ruleContent').notEmpty().withMessage('Rule content is required'),
    body('description').optional().isString(),
    body('domainId').optional().isString(),
    body('enabled').optional().isBoolean(),
  ],
  addCustomRule
);

// Update rule
router.put(
  '/rules/:id',
  authorize('admin', 'moderator'),
  [
    body('name').optional().isString(),
    body('category').optional().isString(),
    body('ruleContent').optional().isString(),
    body('description').optional().isString(),
    body('enabled').optional().isBoolean(),
  ],
  updateModSecRule
);

// Delete rule
router.delete('/rules/:id', authorize('admin', 'moderator'), deleteModSecRule);

// Get global ModSecurity settings
router.get('/global', getGlobalModSecSettings);

// Set global ModSecurity enabled/disabled
router.post(
  '/global',
  authorize('admin', 'moderator'),
  [body('enabled').isBoolean().withMessage('Enabled must be a boolean')],
  setGlobalModSec
);

export default router;
