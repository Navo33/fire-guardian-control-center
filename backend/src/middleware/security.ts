/**
 * Session and Security Middleware
 * Handles session timeout, password expiry, and security enforcement
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { SystemSettingsRepository } from '../models/SystemSettingsRepository';
import { ProfileRepository } from '../models/ProfileRepository';

/**
 * Check if user's password has expired
 */
export const checkPasswordExpiry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.userId) {
      return next();
    }

    // Skip check for password change endpoint
    if (req.path === '/api/profile/change-password') {
      return next();
    }

    // Check if password is expired
    const isExpired = await ProfileRepository.isPasswordExpired(user.userId);

    if (isExpired) {
      return res.status(403).json({
        success: false,
        message: 'Your password has expired. Please change your password.',
        code: 'PASSWORD_EXPIRED',
        redirectTo: '/dashboard/profile?tab=security'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking password expiry:', error);
    // Don't block request on error, just log it
    next();
  }
};

/**
 * Check session timeout based on last activity
 */
export const checkSessionTimeout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.userId) {
      return next();
    }

    // Get session timeout setting
    const timeoutMinutes = await SystemSettingsRepository.getTypedValue<number>(
      'session_timeout_minutes',
      30
    );

    // Get user's last activity
    const userQuery = await pool.query(
      `SELECT last_login FROM "user" WHERE id = $1 AND deleted_at IS NULL`,
      [user.userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Session invalid. Please login again.',
        code: 'SESSION_INVALID'
      });
    }

    const lastLogin = userQuery.rows[0].last_login;
    
    if (!lastLogin) {
      // No last login recorded, allow but update it
      await pool.query(
        `UPDATE "user" SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
        [user.userId]
      );
      return next();
    }

    // Calculate time since last activity
    const lastLoginTime = new Date(lastLogin).getTime();
    const now = new Date().getTime();
    const minutesSinceLastActivity = Math.floor((now - lastLoginTime) / (1000 * 60));

    if (minutesSinceLastActivity >= timeoutMinutes) {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired due to inactivity. Please login again.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Update last activity time
    await pool.query(
      `UPDATE "user" SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.userId]
    );

    next();
  } catch (error) {
    console.error('Error checking session timeout:', error);
    // Don't block request on error, just log it
    next();
  }
};

/**
 * Check if user needs to change password on first login
 */
export const checkFirstLoginPasswordChange = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.userId) {
      return next();
    }

    // Skip check for password change endpoint
    if (req.path === '/api/profile/change-password') {
      return next();
    }

    // Get the setting
    const requireChange = await SystemSettingsRepository.getTypedValue<boolean>(
      'require_password_change_on_first_login',
      false
    );

    if (!requireChange) {
      return next();
    }

    // Check if user has changed password since account creation
    const userQuery = await pool.query(
      `SELECT created_at, last_password_change FROM "user" 
       WHERE id = $1 AND deleted_at IS NULL`,
      [user.userId]
    );

    if (userQuery.rows.length === 0) {
      return next();
    }

    const { created_at, last_password_change } = userQuery.rows[0];

    // If last_password_change is null or equals created_at, force password change
    if (!last_password_change) {
      return res.status(403).json({
        success: false,
        message: 'You must change your password before continuing.',
        code: 'PASSWORD_CHANGE_REQUIRED',
        redirectTo: '/dashboard/profile?tab=security'
      });
    }

    const createdTime = new Date(created_at).getTime();
    const passwordChangeTime = new Date(last_password_change).getTime();

    // Allow a 1-second tolerance for timing differences
    if (Math.abs(passwordChangeTime - createdTime) < 1000) {
      return res.status(403).json({
        success: false,
        message: 'You must change your password before continuing.',
        code: 'PASSWORD_CHANGE_REQUIRED',
        redirectTo: '/dashboard/profile?tab=security'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking first login password change:', error);
    // Don't block request on error, just log it
    next();
  }
};

/**
 * Clean up expired sessions from user_sessions table
 * This should be called periodically (e.g., via cron job or on login)
 */
export const cleanupExpiredSessions = async (): Promise<void> => {
  try {
    await pool.query(`
      DELETE FROM user_sessions 
      WHERE expires_at < CURRENT_TIMESTAMP 
      OR (is_active = false AND last_activity < CURRENT_TIMESTAMP - INTERVAL '7 days')
    `);
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
};

/**
 * Combined security middleware
 * Checks session timeout, password expiry, and first login password change
 */
export const securityMiddleware = [
  checkSessionTimeout,
  checkPasswordExpiry,
  checkFirstLoginPasswordChange
];
