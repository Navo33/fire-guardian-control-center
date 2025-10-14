/**
 * Debug Utility for Backend
 * Provides configurable logging that can be turned on/off via environment variables
 */

export class DebugLogger {
  private static isEnabled = process.env.DEBUG_ENABLED === 'true';
  private static isDatabaseDebug = process.env.DEBUG_DATABASE === 'true';
  private static isApiDebug = process.env.DEBUG_API === 'true';
  private static isAuthDebug = process.env.DEBUG_AUTH === 'true';

  /**
   * General debug logging
   */
  static log(message: string, data?: any, category: string = 'GENERAL'): void {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${category}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Database operation debugging
   */
  static database(operation: string, query?: string, params?: any[], result?: any): void {
    if (!this.isDatabaseDebug) return;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DATABASE] ${operation}`);
    
    if (query) {
      console.log(`  Query: ${query}`);
    }
    
    if (params && params.length > 0) {
      console.log(`  Params:`, params);
    }
    
    if (result) {
      console.log(`  Result: ${Array.isArray(result) ? `${result.length} rows` : 'Success'}`);
    }
  }

  /**
   * API request/response debugging
   */
  static api(method: string, path: string, data?: any, response?: any, statusCode?: number): void {
    if (!this.isApiDebug) return;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [API] ${method} ${path} ${statusCode || ''}`);
    
    if (data && Object.keys(data).length > 0) {
      console.log(`  Request:`, JSON.stringify(data, null, 2));
    }
    
    if (response) {
      console.log(`  Response:`, JSON.stringify(response, null, 2));
    }
  }

  /**
   * Authentication debugging
   */
  static auth(action: string, userId?: number, data?: any): void {
    if (!this.isAuthDebug) return;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [AUTH] ${action} ${userId ? `User: ${userId}` : ''}`);
    
    if (data) {
      console.log(`  Data:`, JSON.stringify(data, null, 2));
    }
  }

  /**
   * Error debugging
   */
  static error(message: string, error: any, context?: any): void {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`);
    
    if (error instanceof Error) {
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
    } else {
      console.error(`  Error:`, error);
    }
    
    if (context) {
      console.error(`  Context:`, JSON.stringify(context, null, 2));
    }
  }

  /**
   * Performance debugging
   */
  static performance(operation: string, startTime: number, data?: any): void {
    if (!this.isEnabled) return;

    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] [PERFORMANCE] ${operation} completed in ${duration}ms`);
    
    if (data) {
      console.log(`  Data:`, JSON.stringify(data, null, 2));
    }
  }

  /**
   * Create a performance timer
   */
  static startTimer(): number {
    return Date.now();
  }

  /**
   * Middleware for request logging
   */
  static requestMiddleware() {
    return (req: any, res: any, next: any) => {
      if (!this.isApiDebug) return next();

      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function(data: any) {
        const duration = Date.now() - startTime;
        const timestamp = new Date().toISOString();
        
        console.log(`[${timestamp}] [REQUEST] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        
        if (req.body && Object.keys(req.body).length > 0) {
          // Hide sensitive data
          const sanitizedBody = { ...req.body };
          if (sanitizedBody.password) sanitizedBody.password = '[HIDDEN]';
          console.log(`  Body:`, JSON.stringify(sanitizedBody, null, 2));
        }
        
        if (req.query && Object.keys(req.query).length > 0) {
          console.log(`  Query:`, JSON.stringify(req.query, null, 2));
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }
}