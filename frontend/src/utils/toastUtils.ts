/**
 * Toast Utilities
 * Utility functions for handling API responses with toast notifications
 */

import { ToastType } from '../components/ui/Toast';

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

/**
 * Handle API success response with toast
 */
export const handleApiSuccess = (
  toast: ToastContextType,
  message: string,
  duration?: number
) => {
  toast.success(message, duration);
};

/**
 * Handle API error response with toast
 */
export const handleApiError = (
  toast: ToastContextType,
  error: any,
  fallbackMessage = 'An error occurred. Please try again.'
) => {
  const errorMessage = 
    error?.response?.data?.message || 
    error?.message || 
    fallbackMessage;
  
  toast.error(errorMessage);
};

/**
 * Handle form validation errors
 */
export const handleValidationErrors = (
  toast: ToastContextType,
  errors: Record<string, any>
) => {
  const firstError = Object.values(errors)[0];
  if (firstError?.message) {
    toast.error(firstError.message as string);
  }
};

/**
 * Show session expired warning
 */
export const showSessionExpired = (toast: ToastContextType) => {
  toast.warning('Your session has expired. Please log in again.', 5000);
};

/**
 * Show permission denied error
 */
export const showPermissionDenied = (toast: ToastContextType) => {
  toast.error('You do not have permission to perform this action.', 5000);
};

/**
 * Generic success messages
 */
export const TOAST_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful! Redirecting...',
  LOGOUT_SUCCESS: 'Logged out successfully',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Vendors
  VENDOR_CREATED: 'Vendor created successfully',
  VENDOR_UPDATED: 'Vendor updated successfully',
  VENDOR_DELETED: 'Vendor deleted successfully',
  
  // Users
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  USER_STATUS_UPDATED: 'User status updated successfully',
  
  // Profile
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  
  // Settings
  SETTINGS_UPDATED: 'Settings updated successfully',
  
  // Generic
  SAVE_SUCCESS: 'Changes saved successfully',
  DELETE_SUCCESS: 'Deleted successfully',
  COPY_SUCCESS: 'Copied to clipboard',
  
  // Errors
  GENERIC_ERROR: 'An error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
};
