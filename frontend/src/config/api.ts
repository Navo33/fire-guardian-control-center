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
    CRITICAL_ALERTS: `${API_BASE_URL}/dashboard/critical-alerts`,
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
    CREATE_TYPE: `${API_BASE_URL}/equipment/types`,
    STATS: `${API_BASE_URL}/equipment/stats`,
    CLIENTS: `${API_BASE_URL}/equipment/clients`,
    BY_ID: (id: string | number) => `${API_BASE_URL}/equipment/${id}`,
    UPDATE: (id: string | number) => `${API_BASE_URL}/equipment/${id}`,
    DELETE: (id: string | number) => `${API_BASE_URL}/equipment/${id}`,
    RELATED: (id: string | number) => `${API_BASE_URL}/equipment/${id}/related`,
    ASSIGNMENTS: (id: string | number) => `${API_BASE_URL}/equipment/${id}/assignments`,
    MAINTENANCE: (id: string | number) => `${API_BASE_URL}/equipment/${id}/maintenance`,
    ASSIGN: `${API_BASE_URL}/equipment/assign`,
    ASSIGN_SINGLE: (id: string | number) => `${API_BASE_URL}/equipment/${id}/assign`,
  },

  // Clients (Vendor-specific)
  CLIENTS: {
    KPIS: `${API_BASE_URL}/vendor/clients/kpis`,
    LIST: `${API_BASE_URL}/vendor/clients`,
    CREATE: `${API_BASE_URL}/vendor/clients`,
    BY_ID: (id: string | number) => `${API_BASE_URL}/vendor/clients/${id}`,
    UPDATE: (id: string | number) => `${API_BASE_URL}/vendor/clients/${id}`,
    DELETE: (id: string | number) => `${API_BASE_URL}/vendor/clients/${id}`,
    EQUIPMENT: (id: string | number) => `${API_BASE_URL}/vendor/clients/${id}/equipment`,
    MAINTENANCE: (id: string | number) => `${API_BASE_URL}/vendor/clients/${id}/maintenance`,
  },

  // Maintenance Tickets (Vendor-specific)
  MAINTENANCE_TICKETS: {
    BASE: `${API_BASE_URL}/vendor/tickets`,
    KPIS: `${API_BASE_URL}/vendor/tickets/kpis`,
    LIST: `${API_BASE_URL}/vendor/tickets`,
    CREATE: `${API_BASE_URL}/vendor/tickets`,
    BY_ID: (id: string | number) => `${API_BASE_URL}/vendor/tickets/${id}`,
    UPDATE: (id: string | number) => `${API_BASE_URL}/vendor/tickets/${id}`,
    RESOLVE: (id: string | number) => `${API_BASE_URL}/vendor/tickets/${id}/resolve`,
    CLOSE: (id: string | number) => `${API_BASE_URL}/vendor/tickets/${id}/close`,
    RELATED: (id: string | number) => `${API_BASE_URL}/vendor/tickets/${id}/related`,
    CLIENTS: `${API_BASE_URL}/vendor/tickets/clients`,
    EQUIPMENT: `${API_BASE_URL}/vendor/tickets/equipment`,
    EQUIPMENT_FOR_CLIENT: (clientId: string | number) => `${API_BASE_URL}/vendor/tickets/equipment/${clientId}`,
    TECHNICIANS: `${API_BASE_URL}/vendor/tickets/technicians`,
  },

  // Reports and Analytics
  REPORTS: {
    KPIS: `${API_BASE_URL}/reports/kpis`,
    ENHANCED_KPIS: `${API_BASE_URL}/reports/enhanced-kpis`,
    DASHBOARD: `${API_BASE_URL}/reports/dashboard`,
    COMPLIANCE_CHART: `${API_BASE_URL}/reports/compliance-chart`,
    TICKETS_CHART: `${API_BASE_URL}/reports/tickets-chart`,
    // Enhanced Charts (NEW)
    EQUIPMENT_STATUS: `${API_BASE_URL}/reports/equipment-status`,
    MAINTENANCE_TRENDS: `${API_BASE_URL}/reports/maintenance-trends`,
    COMPLIANCE_OVERVIEW: `${API_BASE_URL}/reports/compliance-overview`,
    REVENUE_TRENDS: `${API_BASE_URL}/reports/revenue-trends`,
    EQUIPMENT_VALUE_CHART: `${API_BASE_URL}/reports/equipment-value-chart`,
    CLIENT_SATISFACTION_CHART: `${API_BASE_URL}/reports/client-satisfaction-chart`,
    COMPLIANCE_TRENDS_CHART: `${API_BASE_URL}/reports/compliance-trends-chart`,
    // Analytics Tables
    TOP_CLIENTS: `${API_BASE_URL}/reports/top-clients`,
    EQUIPMENT_PERFORMANCE: `${API_BASE_URL}/reports/equipment-performance`,
    MAINTENANCE_BACKLOG: `${API_BASE_URL}/reports/maintenance-backlog`,
    REVENUE_BY_CLIENT: `${API_BASE_URL}/reports/revenue-by-client`,
    COMPLIANCE_ISSUES: `${API_BASE_URL}/reports/compliance-issues`,
    UPCOMING_MAINTENANCE: `${API_BASE_URL}/reports/upcoming-maintenance`,
    CLIENTS_DROPDOWN: `${API_BASE_URL}/reports/clients-dropdown`,
    EQUIPMENT_TYPES_DROPDOWN: `${API_BASE_URL}/reports/equipment-types-dropdown`,
    EQUIPMENT_COMPLIANCE_REPORT: `${API_BASE_URL}/reports/equipment-compliance-report`,
    MAINTENANCE_REPORT: `${API_BASE_URL}/reports/maintenance-report`,
  },

  // Client Views (for client users)
  CLIENT: {
    DASHBOARD: {
      KPIS: `${API_BASE_URL}/client/dashboard/kpis`,
      ACTIVITY: `${API_BASE_URL}/client/dashboard/activity`,
    },
    EQUIPMENT: `${API_BASE_URL}/client/equipment`,
    TICKETS: `${API_BASE_URL}/client/tickets`,
    REPORTS: {
      KPIS: `${API_BASE_URL}/client/reports/kpis`,
      COMPLIANCE_CHART: `${API_BASE_URL}/client/reports/compliance-chart`,
      LIST: `${API_BASE_URL}/client/reports`,
      BY_ID: (id: string) => `${API_BASE_URL}/client/reports/${id}`,
      RELATED: (id: string) => `${API_BASE_URL}/client/reports/${id}/related`,
      EXPORT: (id: string) => `${API_BASE_URL}/client/reports/${id}/export`,
      EXPORT_ALL: `${API_BASE_URL}/client/reports/export-all`,
    },
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