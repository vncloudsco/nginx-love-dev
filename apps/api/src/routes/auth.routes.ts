import { Router } from 'express';
import { login, logout, refreshAccessToken, verify2FALogin } from '../controllers/auth.controller';
import { loginValidation } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, login);

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify 2FA code during login
 * @access  Public
 */
router.post('/verify-2fa', verify2FALogin);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshAccessToken);

export default router;
