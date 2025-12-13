'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import {
  DevicePhoneMobileIcon,
  BellAlertIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface SmsSettings {
  sms_enabled: boolean;
  sms_daily_limit: number;
  sms_compliance_warning_days: number;
  sms_maintenance_warning_days: number;
}

interface SmsBalance {
  success: boolean;
  balance?: number;
  message: string;
}

interface SmsStats {
  date: string;
  total_sent: number;
  total_failed: number;
  high_priority_tickets: number;
  compliance_alerts: number;
  maintenance_reminders: number;
}

export default function SmsSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [settings, setSettings] = useState<SmsSettings>({
    sms_enabled: false,
    sms_daily_limit: 1000,
    sms_compliance_warning_days: 7,
    sms_maintenance_warning_days: 3,
  });
  const [balance, setBalance] = useState<SmsBalance | null>(null);
  const [stats, setStats] = useState<SmsStats[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetchSettings();
    fetchBalance();
    fetchStats();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.SMS.SETTINGS, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch SMS settings');
      }

      const data = await response.json();
      if (data.success) {
        const apiSettings = data.data;
        setSettings({
          sms_enabled: apiSettings.sms_enabled === 'true',
          sms_daily_limit: parseInt(apiSettings.sms_daily_limit || '1000'),
          sms_compliance_warning_days: parseInt(apiSettings.sms_compliance_warning_days || '7'),
          sms_maintenance_warning_days: parseInt(apiSettings.sms_maintenance_warning_days || '3'),
        });
      }
    } catch (err) {
      console.error('Error fetching SMS settings:', err);
      toast.error('Failed to load SMS settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.SMS.BALANCE, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.data || data);
      }
    } catch (err) {
      console.error('Error fetching SMS balance:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.SMS.STATISTICS}?days=7`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching SMS stats:', err);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(API_ENDPOINTS.SMS.SETTINGS, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save settings');
      }

      toast.success('SMS settings saved successfully');
      fetchSettings();
    } catch (err: any) {
      console.error('Error saving SMS settings:', err);
      toast.error(err.message || 'Failed to save SMS settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const response = await fetch(API_ENDPOINTS.SMS.TEST, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send test SMS');
      }

      toast.success('Test SMS sent successfully! Check your phone.');
    } catch (err: any) {
      console.error('Error sending test SMS:', err);
      toast.error(err.message || 'Failed to send test SMS');
    } finally {
      setTesting(false);
    }
  };

  const handleCheckNow = async () => {
    try {
      setChecking(true);
      const response = await fetch(API_ENDPOINTS.SMS.CHECK_NOW, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to trigger check');
      }

      toast.success('Manual SMS check triggered successfully');
      setTimeout(() => fetchStats(), 2000);
    } catch (err: any) {
      console.error('Error triggering check:', err);
      toast.error(err.message || 'Failed to trigger check');
    } finally {
      setChecking(false);
    }
  };

  const totalSent = stats.reduce((sum, s) => sum + s.total_sent, 0);
  const totalFailed = stats.reduce((sum, s) => sum + s.total_failed, 0);
  const successRate = totalSent > 0 ? ((totalSent - totalFailed) / totalSent * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="h-8 w-8 text-red-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading SMS settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <DevicePhoneMobileIcon className="h-5 w-5 text-red-600 mr-2" />
          SMS Notifications
        </h3>

        {/* Balance & Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Account Balance</p>
                {balance?.success ? (
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    LKR {balance.balance?.toFixed(2) || '0.00'}
                  </p>
                ) : (
                  <p className="text-sm text-blue-600 mt-1">{balance?.message || 'Not configured'}</p>
                )}
              </div>
              <CurrencyDollarIcon className="h-10 w-10 text-blue-600 opacity-20" />
            </div>
          </div>

          {/* Success Rate Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Success Rate (7d)</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{successRate}%</p>
                <p className="text-xs text-green-600 mt-1">{totalSent} sent, {totalFailed} failed</p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-600 opacity-20" />
            </div>
          </div>

          {/* Daily Limit Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Daily Limit</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{settings.sms_daily_limit}</p>
                <p className="text-xs text-purple-600 mt-1">messages per day</p>
              </div>
              <ChartBarIcon className="h-10 w-10 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="space-y-6 bg-gray-50 rounded-xl p-6">
          {/* Global Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <BellAlertIcon className="h-6 w-6 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Enable SMS Notifications</p>
                <p className="text-sm text-gray-500">Master toggle for all SMS features</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sms_enabled}
                onChange={(e) => setSettings({ ...settings, sms_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Daily Limit */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Daily Message Limit
              </label>
              <input
                type="number"
                min="1"
                value={settings.sms_daily_limit}
                onChange={(e) => setSettings({ ...settings, sms_daily_limit: parseInt(e.target.value) || 1000 })}
                className="input-field"
              />
              <p className="text-xs text-gray-500">Maximum SMS per day</p>
            </div>

            {/* Compliance Warning Days */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Compliance Warning (Days)
              </label>
              <input
                type="number"
                min="1"
                value={settings.sms_compliance_warning_days}
                onChange={(e) => setSettings({ ...settings, sms_compliance_warning_days: parseInt(e.target.value) || 7 })}
                className="input-field"
              />
              <p className="text-xs text-gray-500">Days before expiry to alert</p>
            </div>

            {/* Maintenance Warning Days */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Maintenance Reminder (Days)
              </label>
              <input
                type="number"
                min="1"
                value={settings.sms_maintenance_warning_days}
                onChange={(e) => setSettings({ ...settings, sms_maintenance_warning_days: parseInt(e.target.value) || 3 })}
                className="input-field"
              />
              <p className="text-xs text-gray-500">Days before due to remind</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={handleTest}
              disabled={testing || !settings.sms_enabled}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <PlayIcon className="h-4 w-4" />
              <span>{testing ? 'Sending...' : 'Send Test SMS'}</span>
            </button>

            <button
              onClick={handleCheckNow}
              disabled={checking || !settings.sms_enabled}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <ArrowPathIcon className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : 'Run Manual Check'}</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
