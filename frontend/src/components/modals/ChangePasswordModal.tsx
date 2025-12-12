'use client';

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getAuthHeaders } from '@/config/api';
import { useToast } from '@/components/providers/ToastProvider';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: () => void;
  isFirstLogin: boolean; // Must explicitly specify - this modal is for first login only
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onPasswordChanged,
  isFirstLogin
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const currentPasswordRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setIsLoading(false);
      
      // Focus first input after modal animation
      setTimeout(() => {
        currentPasswordRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Password strength validation
  const validatePasswordStrength = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[@$!%*?&]/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    return null;
  };

  // Real-time validation
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (newPassword) {
      const strengthError = validatePasswordStrength(newPassword);
      if (strengthError) {
        newErrors.newPassword = strengthError;
      }
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const validationErrors: Record<string, string> = {};

    if (!isFirstLogin && !currentPassword) {
      validationErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      validationErrors.newPassword = 'New password is required';
    } else {
      const strengthError = validatePasswordStrength(newPassword);
      if (strengthError) {
        validationErrors.newPassword = strengthError;
      }
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }

    if (!isFirstLogin && currentPassword && newPassword && currentPassword === newPassword) {
      validationErrors.newPassword = 'New password must be different from current password';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      // For first login, we need to get the current password from localStorage
      const storedPassword = isFirstLogin ? localStorage.getItem('temp_password') : currentPassword;
      
      const response = await fetch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: storedPassword || currentPassword,
          newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setErrors({ currentPassword: 'Current password is incorrect' });
        } else {
          throw new Error(result.message || 'Failed to change password');
        }
        return;
      }

      showToast('success', 'Password changed successfully!');
      onPasswordChanged();
      onClose();

    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      showToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isFirstLogin) {
      // Don't allow closing if it's first login (must change password)
      showToast('warning', 'You must change your password before continuing');
      return;
    }
    onClose();
  };

  // This modal should ONLY be used for first login password changes
  if (!isOpen || !isFirstLogin) return null;

  return (
    <div className="modal-container">
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="modal-content max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <LockClosedIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Change Temporary Password
                </h2>
                <p className="text-sm text-gray-600">
                  You must change your temporary password to continue
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Security Requirement</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    For security reasons, you must create a new password before accessing your account. 
                    Your temporary password was sent to your email.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Password - Only show if NOT first login */}
            {!isFirstLogin && (
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password *
                </label>
                <input
                  ref={currentPasswordRef}
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`input-field ${errors.currentPassword ? 'border-red-500' : ''}`}
                  placeholder="Enter your current password"
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                )}
              </div>
            )}

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password *
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`input-field ${
                  errors.newPassword 
                    ? 'border-red-500' 
                    : newPassword && !errors.newPassword 
                      ? 'border-green-500' 
                      : ''
                }`}
                placeholder="Enter new password"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
              )}
              {newPassword && !errors.newPassword && (
                <p className="mt-1 text-sm text-green-600">✓ Password meets requirements</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password *
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`input-field ${
                  errors.confirmPassword 
                    ? 'border-red-500' 
                    : confirmPassword && newPassword === confirmPassword 
                      ? 'border-green-500' 
                      : ''
                }`}
                placeholder="Confirm new password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
              {confirmPassword && newPassword === confirmPassword && !errors.newPassword && (
                <p className="mt-1 text-sm text-green-600">✓ Passwords match</p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <span className={`mr-2 ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                    {newPassword.length >= 8 ? '✓' : '○'}
                  </span>
                  At least 8 characters
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '○'}
                  </span>
                  One uppercase letter
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[a-z]/.test(newPassword) ? '✓' : '○'}
                  </span>
                  One lowercase letter
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[0-9]/.test(newPassword) ? '✓' : '○'}
                  </span>
                  One number
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${/[@$!%*?&]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[@$!%*?&]/.test(newPassword) ? '✓' : '○'}
                  </span>
                  One special character (@$!%*?&)
                </li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
              {!isFirstLogin && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || Object.keys(errors).length > 0}
                className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
