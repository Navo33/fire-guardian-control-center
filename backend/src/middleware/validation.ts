import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? (error as any).value : undefined
      }))
    });
    return;
  }
  
  next();
};

/**
 * Async wrapper to handle async route errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  // Database connection errors
  if (error.code === 'ECONNREFUSED') {
    res.status(503).json({
      success: false,
      message: 'Database connection failed'
    });
    return;
  }

  // PostgreSQL errors
  if (error.code && error.code.startsWith('23')) {
    let message = 'Database constraint violation';
    
    if (error.code === '23505') {
      message = 'Duplicate entry found';
    } else if (error.code === '23503') {
      message = 'Referenced record not found';
    } else if (error.code === '23502') {
      message = 'Required field missing';
    }

    res.status(400).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { details: error.detail })
    });
    return;
  }

  // Custom application errors
  if (error.statusCode) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
    return;
  }

  // Default error response
  const statusCode = error.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error 
    })
  });
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
};