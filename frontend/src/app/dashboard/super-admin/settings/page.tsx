'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  ShieldCheckIcon,
  ClockIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [settings, setSettings] = useState<SecuritySettings>({
    sessionTimeoutMinutes: 30,
    passwordExpiryDays: 90,
    passwordMinLength: 8,
    requirePasswordChangeOnFirstLogin: false,
    maxFailedLoginAttempts: 5,
    accountLockDurationMinutes: 30
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings/security', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      
      // Prepare settings array for bulk update
      const settingsArray = [
        { key: 'session_timeout_minutes', value: String(settings.sessionTimeoutMinutes) },
        { key: 'password_expiry_days', value: String(settings.passwordExpiryDays) },
        { key: 'password_min_length', value: String(settings.passwordMinLength) },
        { key: 'require_password_change_on_first_login', value: String(settings.requirePasswordChangeOnFirstLogin) },
        { key: 'max_failed_login_attempts', value: String(settings.maxFailedLoginAttempts) },
        { key: 'account_lock_duration_minutes', value: String(settings.accountLockDurationMinutes) }
      ];

      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings: settingsArray })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save settings');
      }

      setMessage({ type: 'success', text: 'System settings saved successfully' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center space-x-3">
            <Cog6ToothIcon className="h-8 w-8 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Configure system-wide security policies and access controls
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 space-y-8">
            {/* Session Management Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <ClockIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Session Management</h3>
              </div>
              <div className="space-y-4 pl-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Time in minutes before inactive users are automatically logged out
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Password Policy Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <LockClosedIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Password Policy</h3>
              </div>
              <div className="space-y-4 pl-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Expiry (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.passwordExpiryDays}
                    onChange={(e) => setSettings({ ...settings, passwordExpiryDays: parseInt(e.target.value) || 0 })}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of days before passwords expire (0 = never expires)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) || 8 })}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum number of characters required for passwords (6-32)
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requirePasswordChange"
                    checked={settings.requirePasswordChangeOnFirstLogin}
                    onChange={(e) => setSettings({ ...settings, requirePasswordChangeOnFirstLogin: e.target.checked })}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requirePasswordChange" className="ml-2 block text-sm text-gray-700">
                    Require password change on first login
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Account Security Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <ShieldCheckIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Account Security</h3>
              </div>
              <div className="space-y-4 pl-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Failed Login Attempts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxFailedLoginAttempts}
                    onChange={(e) => setSettings({ ...settings, maxFailedLoginAttempts: parseInt(e.target.value) || 5 })}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of failed login attempts before account is locked
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Lock Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.accountLockDurationMinutes}
                    onChange={(e) => setSettings({ ...settings, accountLockDurationMinutes: parseInt(e.target.value) || 30 })}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How long accounts remain locked after too many failed attempts
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end border-t border-gray-200 pt-6">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save System Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                About System Settings
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  These settings apply system-wide to all users. Changes take effect immediately for new sessions.
                  For personal profile settings, go to <strong>My Profile</strong> from the user menu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
