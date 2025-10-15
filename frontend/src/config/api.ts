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
    STATS: `${API_BASE_URL}/dashboard/stats`,
    RECENT_VENDORS: `${API_BASE_URL}/dashboard/recent-vendors`,
  },
  
  // Vendors
  VENDORS: {
    LIST: `${API_BASE_URL}/vendors`,
    CREATE: `${API_BASE_URL}/vendors`,
    BY_ID: (id: string | number) => `${API_BASE_URL}/vendors/${id}`,
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
  
  // Analytics
  ANALYTICS: {
    SYSTEM: `${API_BASE_URL}/analytics/system`,
    METRICS: `${API_BASE_URL}/analytics/metrics`,
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