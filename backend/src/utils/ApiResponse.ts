import { Response } from 'express';
import { ApiResponse, ResponseMeta, HttpStatus } from '../types/api';

/**
 * Professional API Response Utility
 * Standardizes all API responses
 */
export class ApiResponseUtil {
  
  /**
   * Send success response with data
   */
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = HttpStatus.OK,
    meta?: Partial<ResponseMeta>
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    res: Response,
    data?: T,
    message: string = 'Resource created successfully'
  ): void {
    this.success(res, data, message, HttpStatus.CREATED);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response): void {
    res.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): void {
    const totalPages = Math.ceil(total / limit);
    
    this.success(res, data, message, HttpStatus.OK, {
      page,
      limit,
      total,
      totalPages
    });
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    code?: string,
    errors?: any[]
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    if (code) {
      (response as any).code = code;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(res: Response, errors: any[]): void {
    this.error(res, 'Validation failed', HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', errors);
  }

  /**
   * Send bad request response
   */
  static badRequest(res: Response, message: string = 'Bad request'): void {
    this.error(res, message, HttpStatus.BAD_REQUEST, 'BAD_REQUEST');
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Authentication required'): void {
    this.error(res, message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }

  /**
   * Send forbidden response
   */
  static forbidden(res: Response, message: string = 'Insufficient permissions'): void {
    this.error(res, message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }

  /**
   * Send not found response
   */
  static notFound(res: Response, message: string = 'Resource not found'): void {
    this.error(res, message, HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  /**
   * Send conflict response
   */
  static conflict(res: Response, message: string): void {
    this.error(res, message, HttpStatus.CONFLICT, 'CONFLICT');
  }

  /**
   * Send internal server error response
   */
  static internalError(res: Response, message: string = 'Internal server error'): void {
    this.error(res, message, HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR');
  }
}