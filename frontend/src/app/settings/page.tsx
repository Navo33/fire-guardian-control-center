'use client';

import React, { useState, useEffect } from 'react';
import RequireRole from '@/components/auth/RequireRole';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useToast } from '@/components/providers/ToastProvider';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import {
  ShieldCheckIcon,
  ClockIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface SecuritySettings {
  sessionTimeoutMinutes: number;
  passwordExpiryDays: number;
  passwordMinLength: number;
  requirePasswordChangeOnFirstLogin: boolean;
  maxFailedLoginAttempts: number;
  accountLockDurationMinutes: number;
}

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('session');
  const toast = useToast();

  const [settings, setSettings] = useState<SecuritySettings>({
    sessionTimeoutMinutes: 30,
    passwordExpiryDays: 90,
    passwordMinLength: 8,
    requirePasswordChangeOnFirstLogin: false,
    maxFailedLoginAttempts: 5,
    accountLockDurationMinutes: 30
  });
  
  // Debug: Log whenever settings state changes
  useEffect(() => {
    console.log('🔄 DEBUG: Settings state changed:', settings);
  }, [settings]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      logApiCall('GET', API_ENDPOINTS.SETTINGS.SECURITY);
      
      const response = await fetch(API_ENDPOINTS.SETTINGS.SECURITY, {
        headers: getAuthHeaders() 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch settings');
      }

      const data = await response.json();
      
      console.log('📥 DEBUG: Fetched settings data:', data);
      
      if (data.success && data.data) {
        console.log('📥 DEBUG: Setting state with data:', data.data);
        setSettings(data.data);
      } else {
        console.error('❌ Invalid settings response format:', data);
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    // Prevent saving while loading or if there's an error
    if (loading || error) {
      console.warn('⚠️ Cannot save while loading or error state');
      toast.error('Cannot save while loading');
      return;
    }

    setSaving(true);

    try {
      console.log('🚀 Starting settings save process...');
      console.log('📊 Current settings state:', settings);

      // Create a clean settings object with only valid values
    const cleanSettings = {
      sessionTimeoutMinutes: Number(settings.sessionTimeoutMinutes) || 30,
      passwordExpiryDays: Number(settings.passwordExpiryDays) || 90,
      passwordMinLength: Number(settings.passwordMinLength) || 8,
      requirePasswordChangeOnFirstLogin: Boolean(settings.requirePasswordChangeOnFirstLogin),
      maxFailedLoginAttempts: Number(settings.maxFailedLoginAttempts) || 5,
      accountLockDurationMinutes: Number(settings.accountLockDurationMinutes) || 30
    };      console.log('🧹 Cleaned settings:', cleanSettings);

      // Validation with cleaned values
      const validationErrors: string[] = [];
      
      if (cleanSettings.sessionTimeoutMinutes < 1 || cleanSettings.sessionTimeoutMinutes > 1440) {
        validationErrors.push('Session timeout must be between 1 and 1440 minutes');
      }
      
      if (cleanSettings.passwordExpiryDays < 1 || cleanSettings.passwordExpiryDays > 365) {
        validationErrors.push('Password expiry must be between 1 and 365 days');
      }
      
      if (cleanSettings.passwordMinLength < 4 || cleanSettings.passwordMinLength > 50) {
        validationErrors.push('Password minimum length must be between 4 and 50 characters');
      }
      
      if (cleanSettings.maxFailedLoginAttempts < 1 || cleanSettings.maxFailedLoginAttempts > 100) {
        validationErrors.push('Max failed login attempts must be between 1 and 100');
      }
      
      if (cleanSettings.accountLockDurationMinutes < 1 || cleanSettings.accountLockDurationMinutes > 10080) {
        validationErrors.push('Account lock duration must be between 1 and 10080 minutes');
      }
      
      if (validationErrors.length > 0) {
        console.error('❌ Validation errors:', validationErrors);
        toast.error(`Invalid settings: ${validationErrors.join(', ')}`);
        return;
      }
      
      // Create settings array with guaranteed valid values
      const settingsArray = [
        { 
          key: 'session_timeout_minutes', 
          value: cleanSettings.sessionTimeoutMinutes.toString() 
        },
        { 
          key: 'password_expiry_days', 
          value: cleanSettings.passwordExpiryDays.toString() 
        },
        { 
          key: 'password_min_length', 
          value: cleanSettings.passwordMinLength.toString() 
        },
        { 
          key: 'require_password_change_on_first_login', 
          value: cleanSettings.requirePasswordChangeOnFirstLogin.toString() 
        },
        { 
          key: 'max_failed_login_attempts', 
          value: cleanSettings.maxFailedLoginAttempts.toString() 
        },
        { 
          key: 'account_lock_duration_minutes', 
          value: cleanSettings.accountLockDurationMinutes.toString() 
        }
      ];

      // Final validation - ensure no empty or undefined values
      const invalidSettings = settingsArray.filter(setting => 
        !setting.key || 
        setting.value === undefined || 
        setting.value === null || 
        setting.value === 'undefined' || 
        setting.value === 'null' ||
        setting.value.trim() === ''
      );

      if (invalidSettings.length > 0) {
        console.error('❌ Invalid settings found:', invalidSettings);
        toast.error('Invalid settings detected. Please refresh the page and try again.');
        return;
      }

      console.log('✅ Settings array validated:', settingsArray);
      
      const requestBody = { settings: settingsArray };
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      console.table(settingsArray);

      const response = await fetch(API_ENDPOINTS.SETTINGS.BULK_UPDATE, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        toast.error(data.message || 'Failed to save settings');
        return;
      }

      if (data.success) {
        console.log('✅ Settings saved successfully');
        toast.success('System settings saved successfully');
        // Refresh settings from server
        setTimeout(() => fetchSettings(), 1000);
      } else {
        console.error('❌ Save failed:', data);
        toast.error(data.message || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('❌ ERROR saving settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireRole allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center space-x-3">
              <Cog6ToothIcon className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Configure system-wide security policies and access controls
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'session', name: 'Session Management', icon: ClockIcon },
                  { id: 'password', name: 'Password Policy', icon: LockClosedIcon },
                  { id: 'security', name: 'Account Security', icon: ShieldCheckIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Loading State */}
              {loading && (
                <LoadingSpinner text="Loading settings..." />
              )}

              {/* Error State */}
              {error && !loading && (
                <ErrorDisplay 
                  message={error}
                  action={{
                    label: 'Try Again',
                    onClick: fetchSettings
                  }}
                />
              )}

              {/* Settings Content */}
              {!loading && !error && (
                <>
                  {/* Session Management Tab */}
                  {activeTab === 'session' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                          <ClockIcon className="h-5 w-5 text-red-600 mr-2" />
                          Session Management
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Session Timeout
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                value={settings.sessionTimeoutMinutes}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value) || 30;
                                  console.log('🎛️ DEBUG sessionTimeoutMinutes change:', e.target.value, '->', newValue);
                                  setSettings({ ...settings, sessionTimeoutMinutes: newValue });
                                }}
                                className="input-field pr-20"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                minutes
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Recommended timeout: 30-60 minutes for balance between security and user experience.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end border-t border-gray-200 pt-6">
                        <button
                          onClick={handleSaveSettings}
                          disabled={saving || loading}
                          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Saving...' : loading ? 'Loading...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Password Policy Tab */}
                  {activeTab === 'password' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                          <LockClosedIcon className="h-5 w-5 text-red-600 mr-2" />
                          Password Policy
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Password Expiry
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={settings.passwordExpiryDays}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value) || 0;
                                  console.log('🎛️ DEBUG passwordExpiryDays change:', e.target.value, '->', newValue);
                                  setSettings({ ...settings, passwordExpiryDays: newValue });
                                }}
                                className="input-field pr-16"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                days
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Days before passwords expire (0 = never expires)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Minimum Password Length
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="6"
                                max="32"
                                value={settings.passwordMinLength}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value) || 8;
                                  console.log('🎛️ DEBUG passwordMinLength change:', e.target.value, '->', newValue);
                                  setSettings({ ...settings, passwordMinLength: newValue });
                                }}
                                className="input-field pr-24"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                characters
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Minimum characters required (6-32)
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id="requirePasswordChange"
                                  checked={settings.requirePasswordChangeOnFirstLogin}
                                  onChange={(e) => {
                                    console.log('🎛️ DEBUG requirePasswordChangeOnFirstLogin change:', e.target.checked);
                                    setSettings({ ...settings, requirePasswordChangeOnFirstLogin: e.target.checked });
                                  }}
                                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                />
                                <label htmlFor="requirePasswordChange" className="ml-3">
                                  <span className="block text-sm font-medium text-gray-900">
                                    Require password change on first login
                                  </span>
                                  <span className="block text-xs text-gray-500 mt-0.5">
                                    Force new users to set their own password
                                  </span>
                                </label>
                              </div>
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                settings.requirePasswordChangeOnFirstLogin 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {settings.requirePasswordChangeOnFirstLogin ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </div>


                        </div>
                      </div>

                      <div className="flex justify-end border-t border-gray-200 pt-6">
                        <button
                          onClick={handleSaveSettings}
                          disabled={saving || loading}
                          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Saving...' : loading ? 'Loading...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Account Security Tab */}
                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                          <ShieldCheckIcon className="h-5 w-5 text-red-600 mr-2" />
                          Account Security
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Max Failed Login Attempts
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={settings.maxFailedLoginAttempts}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value) || 5;
                                  console.log('🎛️ DEBUG maxFailedLoginAttempts change:', e.target.value, '->', newValue);
                                  setSettings({ ...settings, maxFailedLoginAttempts: newValue });
                                }}
                                className="input-field pr-20"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                attempts
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Failed attempts before account is locked
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Account Lock Duration
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                value={settings.accountLockDurationMinutes}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value) || 30;
                                  console.log('🎛️ DEBUG accountLockDurationMinutes change:', e.target.value, '->', newValue);
                                  setSettings({ ...settings, accountLockDurationMinutes: newValue });
                                }}
                                className="input-field pr-20"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                minutes
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              How long accounts remain locked
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4">
                          <div className="flex">
                            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="ml-3">
                              <h4 className="text-sm font-medium text-amber-900">Security Notice</h4>
                              <p className="mt-1 text-sm text-amber-700">
                                These settings help protect against brute force attacks. Lower values increase security but may lock out legitimate users more frequently.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end border-t border-gray-200 pt-6">
                        <button
                          onClick={handleSaveSettings}
                          disabled={saving || loading}
                          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Saving...' : loading ? 'Loading...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}
