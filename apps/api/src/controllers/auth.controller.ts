import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const { username, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        twoFactor: true,
      },
    });

    if (!user) {
      // Log failed attempt
      await prisma.activityLog.create({
        data: {
          userId: 'system',
          action: `Failed login attempt for username: ${username}`,
          type: 'security',
          ip: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          details: 'Invalid username',
        } as any,
      });

      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Check if user is active
    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Account is inactive or suspended',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      // Log failed attempt
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'Failed login attempt',
          type: 'security',
          ip: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          details: 'Invalid password',
        },
      });

      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Check if 2FA is enabled
    if (user.twoFactor?.enabled) {
      // User has 2FA enabled, don't generate tokens yet
      logger.info(`User ${username} requires 2FA verification`);
      
      res.json({
        success: true,
        message: '2FA verification required',
        data: {
          requires2FA: true,
          userId: user.id,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
        },
      });
      return;
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log successful login
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'User logged in',
        type: 'login',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
      },
    });

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        device: 'Web Browser',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info(`User ${username} logged in successfully`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          timezone: user.timezone,
          language: user.language,
          lastLogin: user.lastLogin,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const userId = (req as any).user?.userId;

    if (refreshToken) {
      // Revoke refresh token
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    }

    if (userId) {
      // Log logout
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'User logged out',
          type: 'logout',
          ip: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: true,
        },
      });
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token exists and not revoked
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revokedAt) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    // Check if token expired
    if (new Date() > tokenRecord.expiresAt) {
      res.status(401).json({
        success: false,
        message: 'Refresh token expired',
      });
      return;
    }

    // Generate new access token
    const tokenPayload = {
      userId: tokenRecord.user.id,
      username: tokenRecord.user.username,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Verify 2FA during login
 */
export const verify2FALogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      res.status(400).json({
        success: false,
        message: 'User ID and 2FA token are required',
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
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

    // Check if 2FA is enabled
    if (!user.twoFactor || !user.twoFactor.enabled || !user.twoFactor.secret) {
      res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account',
      });
      return;
    }

    // Verify token
    const { verify2FAToken } = await import('../utils/twoFactor');
    const isValid = verify2FAToken(token, user.twoFactor.secret);

    if (!isValid) {
      // Log failed attempt
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'Failed 2FA verification',
          type: 'security',
          ip: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          details: 'Invalid 2FA token',
        },
      });

      res.status(401).json({
        success: false,
        message: 'Invalid 2FA token',
      });
      return;
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const { generateAccessToken, generateRefreshToken } = await import('../utils/jwt');
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log successful login
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'User logged in with 2FA',
        type: 'login',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
      },
    });

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        device: 'Web Browser',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info(`User ${user.username} logged in successfully with 2FA`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          timezone: user.timezone,
          language: user.language,
          lastLogin: user.lastLogin,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Verify 2FA login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
