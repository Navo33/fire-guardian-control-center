/**
 * Frontend Debug Utility
 * Provides configurable logging that can be turned on/off via environment variables
 */

class FrontendDebugLogger {
  private static isEnabled = process.env.NEXT_PUBLIC_DEBUG_ENABLED === 'true';
  private static isApiDebug = process.env.NEXT_PUBLIC_DEBUG_API === 'true';
  private static isAuthDebug = process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true';
  private static isUIDebug = process.env.NEXT_PUBLIC_DEBUG_UI === 'true';

  /**
   * General debug logging
   */
  static log(message: string, data?: any, category: string = 'GENERAL'): void {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${category}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * API request/response debugging
   */
  static api(method: string, url: string, requestData?: any, response?: any, statusCode?: number): void {
    if (!this.isApiDebug) return;

    const timestamp = new Date().toISOString();
    console.group(`[${timestamp}] [API] ${method} ${url} ${statusCode || ''}`);
    
    if (requestData && Object.keys(requestData).length > 0) {
      console.log('Request Data:', requestData);
    }
    
    if (response) {
      console.log('Response:', response);
    }
    
    console.groupEnd();
  }

  /**
   * Authentication debugging
   */
  static auth(action: string, data?: any): void {
    if (!this.isAuthDebug) return;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [AUTH] ${action}`);
    
    if (data) {
      // Hide sensitive data
      const sanitizedData = { ...data };
      if (sanitizedData.password) sanitizedData.password = '[HIDDEN]';
      if (sanitizedData.token) sanitizedData.token = '[HIDDEN]';
      console.log('Data:', sanitizedData);
    }
  }

  /**
   * UI/Component debugging
   */
  static ui(component: string, action: string, data?: any): void {
    if (!this.isUIDebug) return;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [UI] ${component} - ${action}`);
    
    if (data) {
      console.log('Data:', data);
    }
  }

  /**
   * Error debugging
   */
  static error(message: string, error: any, context?: any): void {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    console.group(`[${timestamp}] [ERROR] ${message}`);
    
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Error:', error);
    }
    
    if (context) {
      console.log('Context:', context);
    }
    
    console.groupEnd();
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
      console.log('Data:', data);
    }
  }

  /**
   * Create a performance timer
   */
  static startTimer(): number {
    return Date.now();
  }

  /**
   * Table logging for structured data
   */
  static table(data: any[], label?: string): void {
    if (!this.isEnabled) return;

    if (label) {
      console.log(`[DEBUG] ${label}`);
    }
    console.table(data);
  }

  /**
   * Axios interceptor for automatic API logging
   */
  static setupAxiosInterceptors(axios: any): void {
    if (!this.isApiDebug) return;

    // Request interceptor
    axios.interceptors.request.use(
      (config: any) => {
        const startTime = Date.now();
        config.metadata = { startTime };
        
        this.api(
          config.method?.toUpperCase() || 'UNKNOWN',
          config.url || 'UNKNOWN',
          config.data
        );
        
        return config;
      },
      (error: any) => {
        this.error('API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    axios.interceptors.response.use(
      (response: any) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        
        this.api(
          response.config.method?.toUpperCase() || 'UNKNOWN',
          response.config.url || 'UNKNOWN',
          undefined,
          response.data,
          response.status
        );
        
        this.performance(`API ${response.config.method?.toUpperCase()} ${response.config.url}`, response.config.metadata?.startTime || Date.now());
        
        return response;
      },
      (error: any) => {
        this.error('API Response Error', error, {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch wrapper with automatic logging
   */
  static async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.isApiDebug) {
      return fetch(url, options);
    }

    const startTime = this.startTimer();
    const method = options.method || 'GET';
    
    try {
      this.api(method, url, options.body ? JSON.parse(options.body as string) : undefined);
      
      const response = await fetch(url, options);
      const responseData = await response.clone().json().catch(() => null);
      
      this.api(method, url, undefined, responseData, response.status);
      this.performance(`Fetch ${method} ${url}`, startTime);
      
      return response;
    } catch (error) {
      this.error('Fetch Error', error, { url, method, options });
      throw error;
    }
  }
}

export default FrontendDebugLogger;