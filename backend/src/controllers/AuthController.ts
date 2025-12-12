import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BaseController } from './BaseController';
import { UserRepository } from '../models/UserRepository';
import { AuditRepository } from '../models/AuditRepository';
import { SystemSettingsRepository } from '../models/SystemSettingsRepository';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../types/api';
import { LoginRequest, CreateUserRequest } from '../types';
import { pool } from '../config/database';

/**
 * Authentication Controller
 * Handles all authentication-related operations
 */
export class AuthController extends BaseController {

  /**
   * POST /api/auth/login
   * User login endpoint
   */
  login = this.asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    if (!this.handleValidation(req, res)) return;

    const { email, password }: LoginRequest = req.body;
    const clientIP = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];

    try {
      // Find user by email
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return ApiResponseUtil.unauthorized(res, 'Invalid credentials');
      }

      // Check if account is locked
      const isLocked = await UserRepository.isAccountLocked(user.id);
      if (isLocked) {
        return ApiResponseUtil.error(
          res,
          'Account is temporarily locked due to multiple failed login attempts',
          423, // Locked
          'ACCOUNT_LOCKED'
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Increment failed attempts
        await UserRepository.incrementFailedAttempts(user.id);
        
        // Get dynamic settings for failed attempts and lock duration
        const maxFailedAttempts = await SystemSettingsRepository.getTypedValue<number>(
          'max_failed_login_attempts',
          5
        );
        const lockDurationMinutes = await SystemSettingsRepository.getTypedValue<number>(
          'account_lock_duration_minutes',
          30
        );
        
        // Lock account after max failed attempts (subtract 1 because we already incremented)
        if (user.failed_login_attempts >= (maxFailedAttempts - 1)) {
          await UserRepository.lockAccount(user.id, lockDurationMinutes);
        }

        return ApiResponseUtil.unauthorized(res, 'Invalid credentials');
      }

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        this.logAction('LOGIN_FAILED', user.id, { reason: 'JWT_SECRET not configured' });
        return ApiResponseUtil.internalError(res, 'Server configuration error');
      }
      
      // Get session timeout from settings
      const sessionTimeoutMinutes = await SystemSettingsRepository.getTypedValue<number>(
        'session_timeout_minutes',
        30
      );
      
      // Get vendor_id if user is a vendor
      let vendorId = null;
      if (user.user_type === 'vendor') {
        try {
          const vendorQuery = 'SELECT id FROM vendors WHERE user_id = $1';
          const vendorResult = await pool.query(vendorQuery, [user.id]);
          if (vendorResult.rows.length > 0) {
            vendorId = vendorResult.rows[0].id;
          }
        } catch (error) {
          console.error('Error fetching vendor_id:', error);
          // Continue without vendor_id - will be handled by authorization middleware
        }
      }
      
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          user_type: user.user_type,
          role_id: user.role_id,
          vendorId: vendorId
        },
        jwtSecret,
        { expiresIn: `${sessionTimeoutMinutes}m` }
      );

      // Update last login information
      await UserRepository.updateLastLogin(user.id, clientIP);

      // Log the login
      await AuditRepository.logLogin(user.id, clientIP, userAgent);

      this.logAction('LOGIN_SUCCESS', user.id, { clientIP });

      // Return success response
      ApiResponseUtil.success(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          user_type: user.user_type,
          role_id: user.role_id
        }
      }, 'Login successful');

    } catch (error) {
      this.logAction('LOGIN_ERROR', undefined, { error: error instanceof Error ? error.message : 'Unknown error', email });
      console.error('Error during login:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * POST /api/auth/register
   * User registration endpoint (admin only for creating vendor accounts)
   */
  register = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Validate request
    if (!this.handleValidation(req, res)) return;

    // Check if user is authenticated and is admin
    if (!this.requireRole(req, res, ['admin'])) return;

    const { email, password, first_name, last_name, user_type, role_id }: CreateUserRequest = req.body;
    const clientIP = this.getClientIP(req);

    try {
      // Check if user already exists
      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser) {
        return ApiResponseUtil.conflict(res, 'User with this email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await UserRepository.create({
        email,
        password: hashedPassword,
        first_name,
        last_name,
        user_type,
        role_id
      });

      // Log the registration
      await AuditRepository.createLog(
        'user',
        { user_id: newUser.id },
        'INSERT',
        { action: 'user_registered', user_type },
        { ip_address: clientIP, created_by: req.user?.userId }
      );

      this.logAction('USER_REGISTERED', req.user?.userId, { 
        newUserId: newUser.id, 
        userType: user_type,
        clientIP 
      });

      ApiResponseUtil.created(res, {
        id: newUser.id,
        email: newUser.email,
        display_name: newUser.display_name,
        user_type: newUser.user_type,
        role_id: newUser.role_id,
        created_at: newUser.created_at
      }, 'User registered successfully');

    } catch (error) {
      this.logAction('REGISTRATION_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        email 
      });
      console.error('Error during registration:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh JWT token
   */
  refresh = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return ApiResponseUtil.internalError(res, 'Server configuration error');
      }

      // Get session timeout from database settings
      const sessionTimeoutMinutes = await SystemSettingsRepository.getTypedValue<number>(
        'session_timeout_minutes',
        30
      );

      // Get vendor_id if user is a vendor (for token consistency)
      let vendorId = req.user!.vendorId;
      if (req.user!.user_type === 'vendor' && !vendorId) {
        try {
          const vendorQuery = 'SELECT id FROM vendors WHERE user_id = $1';
          const vendorResult = await pool.query(vendorQuery, [req.user!.userId]);
          if (vendorResult.rows.length > 0) {
            vendorId = vendorResult.rows[0].id;
          }
        } catch (error) {
          console.error('Error fetching vendor_id during refresh:', error);
        }
      }

      // Generate new token with database-configured expiration
      const token = jwt.sign(
        { 
          userId: req.user!.userId, 
          email: req.user!.email, 
          user_type: req.user!.user_type,
          role_id: req.user!.role_id,
          vendorId: vendorId
        },
        jwtSecret,
        { expiresIn: `${sessionTimeoutMinutes}m` }
      );

      // Update last activity
      await UserRepository.updateLastLogin(req.user!.userId, this.getClientIP(req));

      this.logAction('TOKEN_REFRESHED', req.user!.userId);

      ApiResponseUtil.success(res, { token }, 'Token refreshed successfully');

    } catch (error) {
      this.logAction('TOKEN_REFRESH_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error during token refresh:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * POST /api/auth/logout
   * User logout (for logging purposes)
   */
  logout = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    try {
      const clientIP = this.getClientIP(req);
      
      // Log the logout
      await AuditRepository.createLog(
        'user',
        { user_id: req.user!.userId },
        'LOGOUT',
        { action: 'user_logout' },
        { ip_address: clientIP }
      );

      this.logAction('LOGOUT_SUCCESS', req.user!.userId, { clientIP });

      ApiResponseUtil.success(res, null, 'Logout successful');

    } catch (error) {
      this.logAction('LOGOUT_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error during logout:', error);
      return ApiResponseUtil.internalError(res);
    }
  });
}