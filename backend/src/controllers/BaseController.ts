import { Request, Response, NextFunction } from 'express';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthenticatedRequest, PaginationQuery } from '../types/api';
import { validationResult } from 'express-validator';

/**
 * Base Controller Class
 * Provides common functionality for all controllers
 */
export abstract class BaseController {

  /**
   * Handle validation errors from express-validator
   */
  protected handleValidation(req: Request, res: Response): boolean {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        code: 'VALIDATION_ERROR'
      }));
      
      ApiResponseUtil.validationError(res, validationErrors);
      return false;
    }
    return true;
  }

  /**
   * Check if user is authenticated
   */
  protected requireAuth(req: AuthenticatedRequest, res: Response): boolean {
    if (!req.user) {
      ApiResponseUtil.unauthorized(res);
      return false;
    }
    return true;
  }

  /**
   * Check if user has required role
   */
  protected requireRole(
    req: AuthenticatedRequest, 
    res: Response, 
    allowedRoles: string[]
  ): boolean {
    if (!this.requireAuth(req, res)) {
      return false;
    }

    if (!allowedRoles.includes(req.user!.user_type)) {
      ApiResponseUtil.forbidden(res);
      return false;
    }
    return true;
  }

  /**
   * Get pagination parameters from query
   */
  protected getPagination(req: Request): PaginationQuery {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const sort = req.query.sort as string || 'created_at';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    const search = req.query.search as string || '';

    return { page, limit, sort, order, search };
  }

  /**
   * Async handler wrapper to catch errors
   */
  protected asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Get client IP address
   */
  protected getClientIP(req: Request): string {
    // Get the IP from various headers, prioritizing x-forwarded-for
    let ip = (req.headers['x-forwarded-for'] as string) ||
             (req.headers['x-real-ip'] as string) ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             'unknown';

    // x-forwarded-for can contain multiple IPs, take the first one
    if (typeof ip === 'string' && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // Ensure IP doesn't exceed database column limit (VARCHAR(255))
    if (ip.length > 255) {
      ip = ip.substring(0, 255);
    }

    return ip;
  }

  /**
   * Log controller action
   */
  protected logAction(action: string, userId?: number, details?: any): void {
    console.log(`[${new Date().toISOString()}] ${action}`, {
      userId,
      details
    });
  }
}