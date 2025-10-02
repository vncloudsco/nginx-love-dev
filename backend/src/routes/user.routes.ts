import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as userController from '../controllers/user.controller';

const router = Router();

/**
 * User Management Routes
 * All routes require authentication
 * Permissions are specified for each route
 */

// Get user statistics
// Permission: Admin, Moderator
router.get(
  '/stats',
  authenticate,
  authorize('admin', 'moderator'),
  userController.getUserStats
);

// List all users
// Permission: Admin, Moderator (read-only)
router.get(
  '/',
  authenticate,
  authorize('admin', 'moderator'),
  userController.listUsers
);

// Get single user
// Permission: Admin, Moderator, or self
router.get(
  '/:id',
  authenticate,
  userController.getUser
);

// Create new user
// Permission: Admin only
router.post(
  '/',
  authenticate,
  authorize('admin'),
  userController.createUser
);

// Update user
// Permission: Admin (full update), or self (limited fields)
router.put(
  '/:id',
  authenticate,
  userController.updateUser
);

// Delete user
// Permission: Admin only
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  userController.deleteUser
);

// Toggle user status
// Permission: Admin only
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  userController.toggleUserStatus
);

// Reset user password
// Permission: Admin only
router.post(
  '/:id/reset-password',
  authenticate,
  authorize('admin'),
  userController.resetUserPassword
);

export default router;
