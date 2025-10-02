import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generate2FASecret, generateQRCode, verify2FAToken, generateBackupCodes } from '../utils/twoFactor';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        twoFactor: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        timezone: user.timezone,
        language: user.language,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        twoFactorEnabled: user.twoFactor?.enabled || false,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const userId = req.user?.userId;
    const { fullName, email, phone, timezone, language } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Check if email already exists (if changing)
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(timezone && { timezone }),
        ...(language && { language }),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'Updated profile information',
        type: 'user_action',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
      },
    });

    logger.info(`User ${userId} updated profile`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        timezone: updatedUser.timezone,
        language: updatedUser.language,
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      // Log failed attempt
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'Failed password change attempt',
          type: 'security',
          ip: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          details: 'Invalid current password',
        },
      });

      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    // Log successful password change
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'Changed account password',
        type: 'security',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
      },
    });

    logger.info(`User ${userId} changed password`);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const get2FAStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    res.json({
      success: true,
      data: {
        enabled: twoFactor?.enabled || false,
        method: twoFactor?.method || 'totp',
      },
    });
  } catch (error) {
    logger.error('Get 2FA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const setup2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const username = req.user?.username;

    if (!userId || !username) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Generate secret
    const { secret, otpauth_url } = generate2FASecret(username);
    const qrCode = await generateQRCode(otpauth_url);

    // Generate backup codes
    const backupCodes = generateBackupCodes(5);

    // Save to database (not enabled yet)
    await prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        enabled: false,
        secret,
        backupCodes,
      },
      update: {
        secret,
        backupCodes,
      },
    });

    res.json({
      success: true,
      message: '2FA setup initiated',
      data: {
        secret,
        qrCode,
        backupCodes,
      },
    });
  } catch (error) {
    logger.error('Setup 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const enable2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const userId = req.user?.userId;
    const { token } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.secret) {
      res.status(400).json({
        success: false,
        message: 'Please setup 2FA first',
      });
      return;
    }

    // Verify token
    const isValid = verify2FAToken(token, twoFactor.secret);
    if (!isValid) {
      res.status(400).json({
        success: false,
        message: 'Invalid 2FA token',
      });
      return;
    }

    // Enable 2FA
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: true },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'Enabled 2FA authentication',
        type: 'security',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
      },
    });

    logger.info(`User ${userId} enabled 2FA`);

    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error) {
    logger.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const disable2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: false },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'Disabled 2FA authentication',
        type: 'security',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
      },
    });

    logger.info(`User ${userId} disabled 2FA`);

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    logger.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.activityLog.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActive: 'desc' },
    });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const revokeSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    await prisma.userSession.delete({
      where: {
        sessionId,
        userId, // Ensure user can only revoke their own sessions
      },
    });

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    logger.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
