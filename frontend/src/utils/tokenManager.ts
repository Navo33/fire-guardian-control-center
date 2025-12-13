/**
 * Token Management Utility
 * Handles automatic token refresh and expiration detection
 */

import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

interface TokenPayload {
  userId: number;
  email: string;
  user_type: string;
  role_id?: number;
  vendorId?: number;
  iat: number;  // Issued at (seconds since epoch)
  exp: number;  // Expiration (seconds since epoch)
}

/**
 * Decode JWT token without verification (client-side only for checking expiration)
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

/**
 * Get token expiration time in minutes
 */
export const getTokenExpirationMinutes = (token: string): number | null => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const expiresIn = decoded.exp - now;
  return Math.floor(expiresIn / 60); // Convert to minutes
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const expirationMinutes = getTokenExpirationMinutes(token);
  return expirationMinutes === null || expirationMinutes <= 0;
};

/**
 * Check if token should be refreshed (expires within threshold)
 */
export const shouldRefreshToken = (
  token: string,
  thresholdMinutes: number = 5
): boolean => {
  const expirationMinutes = getTokenExpirationMinutes(token);
  if (expirationMinutes === null) {
    return false;
  }
  return expirationMinutes > 0 && expirationMinutes <= thresholdMinutes;
};

/**
 * Refresh the authentication token
 */
export const refreshAuthToken = async (): Promise<string | null> => {
  try {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      return null;
    }

    // Make refresh request
    const response = await axios.post(
      API_ENDPOINTS.AUTH.REFRESH,
      {},
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      }
    );

    if (response.data.success && response.data.data.token) {
      const newToken = response.data.data.token;
      localStorage.setItem('token', newToken);
      console.log('✅ Token refreshed successfully');
      return newToken;
    }

    return null;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    
    // If refresh fails with 401, token is invalid - redirect to login
    if ((error as any).response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login?expired=true';
    }
    
    return null;
  }
};

/**
 * Auto-refresh token if needed
 * Returns the current valid token (refreshed if needed)
 */
export const ensureValidToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    console.warn('⚠️ Token expired, redirecting to login');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login?expired=true';
    return null;
  }

  // Check if token should be refreshed (within 5 minutes of expiration)
  if (shouldRefreshToken(token, 5)) {
    console.log('🔄 Token expiring soon, refreshing...');
    const newToken = await refreshAuthToken();
    return newToken || token;
  }

  return token;
};

/**
 * Start automatic token refresh interval
 * Checks every minute and refreshes if needed
 */
let refreshInterval: NodeJS.Timeout | null = null;

export const startTokenRefreshMonitor = () => {
  // Clear existing interval if any
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // Check token every minute
  refreshInterval = setInterval(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
      return;
    }

    // Auto-refresh if needed
    await ensureValidToken();
  }, 60000); // Check every 60 seconds

  console.log('✅ Token refresh monitor started');
};

/**
 * Stop automatic token refresh monitoring
 */
export const stopTokenRefreshMonitor = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('⏹️ Token refresh monitor stopped');
  }
};

/**
 * Get time until token expiration (human-readable)
 */
export const getTokenExpirationTimeString = (token: string): string => {
  const minutes = getTokenExpirationMinutes(token);
  
  if (minutes === null || minutes <= 0) {
    return 'Expired';
  }

  if (minutes < 1) {
    return 'Less than a minute';
  }

  if (minutes === 1) {
    return '1 minute';
  }

  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 1) {
    return remainingMinutes > 0 ? `1 hour ${remainingMinutes} minutes` : '1 hour';
  }

  return remainingMinutes > 0 
    ? `${hours} hours ${remainingMinutes} minutes` 
    : `${hours} hours`;
};
