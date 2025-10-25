/**
 * API Configuration utility
 * Handles environment-specific API endpoints and configuration
 */

// Get the API base URL from environment variables
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Debug flags
export const DEBUG_CONFIG = {
  frontend: process.env.NEXT_PUBLIC_DEBUG_FRONTEND === 'true',
  api: process.env.NEXT_PUBLIC_DEBUG_API === 'true',
  auth: process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    VERIFY: `${API_BASE_URL}/auth/verify`,
  },
  
  // Dashboard
  DASHBOARD: {
    OVERVIEW: `${API_BASE_URL}/dashboard/overview`,
    STATS: `${API_BASE_URL}/dashboard/stats`,
    RECENT_VENDORS: `${API_BASE_URL}/dashboard/recent-vendors`,
    RECENT_ACTIVITY: `${API_BASE_URL}/dashboard/recent-activity`,
    INSIGHTS: `${API_BASE_URL}/dashboard/insights`,
    VENDOR_KPIS: `${API_BASE_URL}/dashboard/vendor-kpis`,
    VENDOR_ACTIVITY: `${API_BASE_URL}/dashboard/vendor-activity`,
  },
  
  // Vendors
  VENDORS: {
    LIST: `${API_BASE_URL}/vendors`,
    CREATE: `${API_BASE_URL}/vendors`,
    BY_ID: (id: string | number) => `${API_BASE_URL}/vendors/${id}`,
    EQUIPMENT: (id: string | number) => `${API_BASE_URL}/vendors/${id}/equipment`,
    SPECIALIZATIONS: `${API_BASE_URL}/vendors/specializations`,
    STATS: `${API_BASE_URL}/users/vendors/stats`,
  },
  
  // Users
  USERS: {
    LIST: `${API_BASE_URL}/users`,
    STATS: `${API_BASE_URL}/users/stats`,
    BY_ID: (id: string | number) => `${API_BASE_URL}/users/${id}`,
    UPDATE_STATUS: (id: string | number) => `${API_BASE_URL}/users/${id}/status`,
  },
  
  // User Details
  USER_DETAILS: {
    BY_ID: (id: string | number) => `${API_BASE_URL}/user-details/${id}`,
    UPDATE: (id: string | number) => `${API_BASE_URL}/user-details/${id}`,
    RESET_PASSWORD: (id: string | number) => `${API_BASE_URL}/user-details/${id}/reset-password`,
  },
  
  // Profile
  PROFILE: {
    GET: `${API_BASE_URL}/profile`,
    UPDATE: `${API_BASE_URL}/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/profile/change-password`,
    PASSWORD_POLICY: `${API_BASE_URL}/profile/password-policy`,
    PASSWORD_EXPIRED: `${API_BASE_URL}/profile/password-expired`,
  },
  
  // Settings
  SETTINGS: {
    ALL: `${API_BASE_URL}/settings`,
    SECURITY: `${API_BASE_URL}/settings/security`,
    BY_KEY: (key: string) => `${API_BASE_URL}/settings/${key}`,
    UPDATE: `${API_BASE_URL}/settings`,
    BULK_UPDATE: `${API_BASE_URL}/settings/bulk`,
  },
  
  // Analytics
  ANALYTICS: {
    SYSTEM: `${API_BASE_URL}/analytics/system`,
    METRICS: `${API_BASE_URL}/analytics/metrics`,
  },
  
  // Equipment
  EQUIPMENT: {
    LIST: `${API_BASE_URL}/equipment`,
    CREATE: `${API_BASE_URL}/equipment`,
    TYPES: `${API_BASE_URL}/equipment/types`,
    CLIENTS: `${API_BASE_URL}/equipment/clients`,
    BY_ID: (id: string | number) => `${API_BASE_URL}/equipment/${id}`,
    UPDATE: (id: string | number) => `${API_BASE_URL}/equipment/${id}`,
    DELETE: (id: string | number) => `${API_BASE_URL}/equipment/${id}`,
    RELATED: (id: string | number) => `${API_BASE_URL}/equipment/${id}/related`,
    ASSIGNMENTS: (id: string | number) => `${API_BASE_URL}/equipment/${id}/assignments`,
    MAINTENANCE: (id: string | number) => `${API_BASE_URL}/equipment/${id}/maintenance`,
    ASSIGN: (id: string | number) => `${API_BASE_URL}/equipment/${id}/assign`,
  },
};

/**
 * Helper function to build API URLs with query parameters
 */
export const buildApiUrl = (baseUrl: string, params?: Record<string, string | number>): string => {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Log API calls for debugging
 */
export const logApiCall = (method: string, url: string, data?: any): void => {
  if (DEBUG_CONFIG.api) {
    console.log(`[API] ${method.toUpperCase()} ${url}`, data || '');
  }
};

/**
 * Get auth headers with token
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

/**
 * Environment info
 */
export const ENV_INFO = {
  NODE_ENV: process.env.NODE_ENV,
  API_BASE_URL,
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  DEBUG_ENABLED: DEBUG_CONFIG.frontend || DEBUG_CONFIG.api || DEBUG_CONFIG.auth,
};

// Log environment info in development
if (typeof window !== 'undefined' && ENV_INFO.IS_DEVELOPMENT && DEBUG_CONFIG.frontend) {
  console.log('[ENV] Fire Guardian Frontend Configuration:', ENV_INFO);
}

/**
 * Secure fetch wrapper with automatic handling of security errors
 */
export const secureFetch = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options?.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle security-related errors
  if (!response.ok) {
    try {
      const data = await response.clone().json();
      
      // Handle password expiry
      if (data.code === 'PASSWORD_EXPIRED') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('password_expired', 'true');
          window.location.href = '/dashboard/profile?tab=security&expired=true';
        }
        throw new Error(data.message);
      }
      
      // Handle session expiry
      if (data.code === 'SESSION_EXPIRED' || data.code === 'SESSION_INVALID') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login?expired=true';
        }
        throw new Error(data.message);
      }
      
      // Handle required password change
      if (data.code === 'PASSWORD_CHANGE_REQUIRED') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('password_change_required', 'true');
          window.location.href = '/dashboard/profile?tab=security&required=true';
        }
        throw new Error(data.message);
      }
    } catch (error) {
      // If JSON parsing fails, continue with normal error handling
      if (error instanceof Error && error.message.includes('expired')) {
        throw error;
      }
    }
  }

  return response;
};