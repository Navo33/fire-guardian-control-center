import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { UserRepository } from '../models/UserRepository';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to verify JWT token and authenticate user
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.url.includes('bulk')) {
      console.error('🔐🔐🔐 AUTH MIDDLEWARE - BULK REQUEST 🔐🔐🔐');
    }
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.error('❌ AUTH FAILED - No token provided');
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Check if user still exists and is not locked
    const user = await UserRepository.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if account is locked
    const isLocked = await UserRepository.isAccountLocked(user.id);
    if (isLocked) {
      res.status(423).json({
        success: false,
        message: 'Account is locked'
      });
      return;
    }

    // Add user info to request
    req.user = decoded;
    
    // If user is a vendor but doesn't have vendorId in token (legacy tokens), fetch it
    if (decoded.user_type === 'vendor' && !decoded.vendorId) {
      try {
        const { pool } = await import('../config/database');
        const vendorQuery = 'SELECT id FROM vendors WHERE user_id = $1';
        const vendorResult = await pool.query(vendorQuery, [decoded.userId]);
        if (vendorResult.rows.length > 0) {
          req.user.vendorId = vendorResult.rows[0].id;
        }
      } catch (error) {
        console.error('Error fetching vendor_id in auth middleware:', error);
        // Continue without vendor_id - will be handled by authorization middleware
      }
    }
    
    if (req.url.includes('bulk')) {
      console.error('✅ AUTH SUCCESS - User authenticated:', decoded.userId);
    }
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.user_type)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is super admin
 */
export const requireSuperAdmin = requireRole(['admin']);

/**
 * Middleware to check if user is vendor or admin
 */
export const requireVendorOrAdmin = requireRole(['admin', 'vendor']);

/**
 * Middleware to check if user is a client
 */
export const requireClient = requireRole(['client']);

/**
 * Middleware to extract IP address from request
 */
export const extractIPAddress = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};