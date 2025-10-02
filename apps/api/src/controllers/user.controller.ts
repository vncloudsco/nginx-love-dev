import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import logger from '../utils/logger';

/**
 * Get all users
 * GET /api/users
 * Permission: Admin, Moderator (read-only)
 */
export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, status, search } = req.query;

    // Build where clause
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { fullName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        avatar: true,
        phone: true,
        timezone: true,
        language: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
        // Exclude password
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get single user by ID
 * GET /api/users/:id
 * Permission: Admin, Moderator (read-only), or self
 */
export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Check if user is viewing their own profile or has permission
    if (currentUser?.role === 'viewer' && currentUser.userId !== id) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        avatar: true,
        phone: true,
        timezone: true,
        language: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        twoFactor: {
          select: {
            enabled: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create new user
 * POST /api/users
 * Permission: Admin only
 */
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, fullName, role, status, phone, timezone, language } = req.body;

    // Validate required fields
    if (!username || !email || !password || !fullName) {
      res.status(400).json({
        success: false,
        message: 'Username, email, password, and full name are required'
      });
      return;
    }

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: existingUser.username === username 
          ? 'Username already exists' 
          : 'Email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        fullName,
        role: role || 'viewer',
        status: status || 'active',
        phone,
        timezone: timezone || 'Asia/Ho_Chi_Minh',
        language: language || 'en'
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        phone: true,
        timezone: true,
        language: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user?.userId || 'system',
        action: `Created user: ${username}`,
        type: 'user_action',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
        details: JSON.stringify({ userId: user.id, role: user.role })
      }
    });

    logger.info(`User created: ${username} by ${req.user?.username}`);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update user
 * PUT /api/users/:id
 * Permission: Admin only, or self (limited fields)
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const { username, email, fullName, role, status, phone, timezone, language, avatar } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Self update: Only allow updating own profile with limited fields
    const isSelfUpdate = currentUser?.userId === id;
    if (isSelfUpdate && currentUser?.role !== 'admin') {
      // Non-admin users can only update their own profile with limited fields
      const allowedFields: any = {};
      if (fullName !== undefined) allowedFields.fullName = fullName;
      if (phone !== undefined) allowedFields.phone = phone;
      if (timezone !== undefined) allowedFields.timezone = timezone;
      if (language !== undefined) allowedFields.language = language;
      if (avatar !== undefined) allowedFields.avatar = avatar;

      const updatedUser = await prisma.user.update({
        where: { id },
        data: allowedFields,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          avatar: true,
          phone: true,
          timezone: true,
          language: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
      });
      return;
    }

    // Admin update: Can update all fields except password
    if (currentUser?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    // Check if username/email is being changed and already exists
    if (username && username !== existingUser.username) {
      const duplicateUsername = await prisma.user.findUnique({
        where: { username }
      });
      if (duplicateUsername) {
        res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
        return;
      }
    }

    if (email && email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email }
      });
      if (duplicateEmail) {
        res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
        return;
      }
    }

    // Build update data
    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (phone !== undefined) updateData.phone = phone;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (language !== undefined) updateData.language = language;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        avatar: true,
        phone: true,
        timezone: true,
        language: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser?.userId || 'system',
        action: `Updated user: ${updatedUser.username}`,
        type: 'user_action',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
        details: JSON.stringify({ userId: id, changes: Object.keys(updateData) })
      }
    });

    logger.info(`User updated: ${updatedUser.username} by ${currentUser?.username}`);

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete user
 * DELETE /api/users/:id
 * Permission: Admin only
 */
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Prevent deleting self
    if (currentUser?.userId === id) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Delete user (cascade will delete related records)
    await prisma.user.delete({
      where: { id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser?.userId || 'system',
        action: `Deleted user: ${user.username}`,
        type: 'user_action',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
        details: JSON.stringify({ userId: id, username: user.username })
      }
    });

    logger.info(`User deleted: ${user.username} by ${currentUser?.username}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Toggle user status (active/inactive)
 * PATCH /api/users/:id/status
 * Permission: Admin only
 */
export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUser = req.user;

    // Prevent changing own status
    if (currentUser?.userId === id) {
      res.status(400).json({
        success: false,
        message: 'Cannot change your own status'
      });
      return;
    }

    // Validate status
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or suspended'
      });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Update status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser?.userId || 'system',
        action: `Changed user status: ${user.username} to ${status}`,
        type: 'user_action',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
        details: JSON.stringify({ userId: id, oldStatus: user.status, newStatus: status })
      }
    });

    logger.info(`User status changed: ${user.username} to ${status} by ${currentUser?.username}`);

    res.json({
      success: true,
      data: updatedUser,
      message: 'User status updated successfully'
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Reset user password (send reset email or generate temporary password)
 * POST /api/users/:id/reset-password
 * Permission: Admin only
 */
export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Generate temporary password (8 characters, alphanumeric)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    const hashedPassword = await hashPassword(tempPassword);

    // Update user password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser?.userId || 'system',
        action: `Reset password for user: ${user.username}`,
        type: 'security',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
        details: JSON.stringify({ userId: id, username: user.username })
      }
    });

    logger.info(`Password reset for user: ${user.username} by ${currentUser?.username}`);

    // In production, send email with temp password
    // For now, return temp password in response (ONLY FOR DEVELOPMENT)
    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        temporaryPassword: tempPassword,
        note: 'Send this password to user securely. In production, this would be sent via email.'
      }
    });
  } catch (error) {
    logger.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get user statistics
 * GET /api/users/stats
 * Permission: Admin, Moderator
 */
export const getUserStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: 'active' } });
    const inactiveUsers = await prisma.user.count({ where: { status: 'inactive' } });
    const suspendedUsers = await prisma.user.count({ where: { status: 'suspended' } });
    
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    const moderatorCount = await prisma.user.count({ where: { role: 'moderator' } });
    const viewerCount = await prisma.user.count({ where: { role: 'viewer' } });

    // Get recent login count (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogins = await prisma.user.count({
      where: {
        lastLogin: {
          gte: yesterday
        }
      }
    });

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        suspended: suspendedUsers,
        byRole: {
          admin: adminCount,
          moderator: moderatorCount,
          viewer: viewerCount
        },
        recentLogins
      }
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
