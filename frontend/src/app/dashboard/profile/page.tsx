'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useToast } from '@/components/providers/ToastProvider';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  userType: 'admin' | 'vendor' | 'client';
  roleId?: number;
  roleName?: string;
  lastPasswordChange?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  vendorId?: number;
  vendorCompanyName?: string;
  clientId?: number;
  clientCompanyName?: string;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    fetchProfile();
    fetchPasswordPolicy();
    
    // Check for password expiry or required change from URL params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      const expired = urlParams.get('expired');
      const required = urlParams.get('required');
      
      if (tab === 'security') {
        setActiveTab('security');
      }
      
      if (expired === 'true') {
        toast.warning('Your password has expired. Please change it now to continue using the system.');
      }
      
      if (required === 'true') {
        toast.warning('You must change your password before you can access other features.');
      }
    }
  }, [toast]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data.data);
      setProfileForm({
        firstName: data.data.firstName || '',
        lastName: data.data.lastName || '',
        phone: data.data.phone || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchPasswordPolicy = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile/password-policy', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPasswordPolicy(data.data);
      }
    } catch (error) {
      console.error('Error fetching password policy:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setProfile(data.data);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setPasswordErrors([]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(passwordForm)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setPasswordErrors(data.errors);
        }
        throw new Error(data.message || 'Failed to change password');
      }

      toast.success('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = (password: string): string[] => {
    if (!passwordPolicy) return [];
    
    const errors: string[] = [];

    if (password.length < passwordPolicy.minLength) {
      errors.push(`At least ${passwordPolicy.minLength} characters`);
    }
    if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('One uppercase letter');
    }
    if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('One lowercase letter');
    }
    if (passwordPolicy.requireNumber && !/\d/.test(password)) {
      errors.push('One number');
    }
    if (passwordPolicy.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('One special character');
    }

    return errors;
  };

  const passwordRequirementsMet = (password: string): boolean => {
    return validatePassword(password).length === 0;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your personal information and security settings
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'profile'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <UserCircleIcon className="h-5 w-5 mr-2" />
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'security'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <ShieldCheckIcon className="h-5 w-5 mr-2" />
              Security
            </button>
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white shadow rounded-lg">
            {loading && (
              <div className="p-6">
                <LoadingSpinner text="Loading profile..." />
              </div>
            )}
            
            {error && !loading && (
              <div className="p-6">
                <ErrorDisplay 
                  message={error} 
                  action={{ 
                    label: 'Try Again', 
                    onClick: fetchProfile 
                  }} 
                />
              </div>
            )}
            
            {!loading && !error && profile && (
              <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.displayName}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-3xl font-medium text-red-600">
                        {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{profile.displayName}</h3>
                  <p className="text-sm text-gray-500 capitalize">{profile.userType} • {profile.roleName}</p>
                  {profile.vendorCompanyName && (
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">Company:</span> {profile.vendorCompanyName}
                    </p>
                  )}
                  {profile.clientCompanyName && (
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">Company:</span> {profile.clientCompanyName}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6"></div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              {/* Account Info */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Account Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Account Created:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Login:</span>
                    <span className="ml-2 text-gray-900">
                      {profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  {profile.lastPasswordChange && (
                    <div>
                      <span className="text-gray-500">Password Changed:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(profile.lastPasswordChange).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
                <div className="flex justify-end border-t border-gray-200 pt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white shadow rounded-lg">
            {loading && (
              <div className="p-6">
                <LoadingSpinner text="Loading security settings..." />
              </div>
            )}
            
            {error && !loading && (
              <div className="p-6">
                <ErrorDisplay 
                  message={error} 
                  action={{ 
                    label: 'Try Again', 
                    onClick: fetchProfile 
                  }} 
                />
              </div>
            )}
            
            {!loading && !error && profile && (
              <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Ensure your account is using a long, random password to stay secure.
                </p>

                {passwordErrors.length > 0 && (
                  <div className="mb-6 rounded-md bg-yellow-50 p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Password requirements not met:
                        </h3>
                        <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                          {passwordErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.current ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Requirements */}
                {passwordPolicy && (
                  <div className="mt-6 rounded-md bg-gray-50 p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Password Requirements:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm">
                        {passwordForm.newPassword.length >= passwordPolicy.minLength ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-gray-300 mr-2" />
                        )}
                        <span className={passwordForm.newPassword.length >= passwordPolicy.minLength ? 'text-green-700' : 'text-gray-600'}>
                          At least {passwordPolicy.minLength} characters
                        </span>
                      </li>
                      {passwordPolicy.requireUppercase && (
                        <li className="flex items-center text-sm">
                          {/[A-Z]/.test(passwordForm.newPassword) ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-300 mr-2" />
                          )}
                          <span className={/[A-Z]/.test(passwordForm.newPassword) ? 'text-green-700' : 'text-gray-600'}>
                            One uppercase letter
                          </span>
                        </li>
                      )}
                      {passwordPolicy.requireLowercase && (
                        <li className="flex items-center text-sm">
                          {/[a-z]/.test(passwordForm.newPassword) ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-300 mr-2" />
                          )}
                          <span className={/[a-z]/.test(passwordForm.newPassword) ? 'text-green-700' : 'text-gray-600'}>
                            One lowercase letter
                          </span>
                        </li>
                      )}
                      {passwordPolicy.requireNumber && (
                        <li className="flex items-center text-sm">
                          {/\d/.test(passwordForm.newPassword) ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-300 mr-2" />
                          )}
                          <span className={/\d/.test(passwordForm.newPassword) ? 'text-green-700' : 'text-gray-600'}>
                            One number
                          </span>
                        </li>
                      )}
                      {passwordPolicy.requireSpecialChar && (
                        <li className="flex items-center text-sm">
                          {/[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword) ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-300 mr-2" />
                          )}
                          <span className={/[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword) ? 'text-green-700' : 'text-gray-600'}>
                            One special character (!@#$%^&*...)
                          </span>
                        </li>
                      )}
                      <li className="flex items-center text-sm">
                        {passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-gray-300 mr-2" />
                        )}
                        <span className={passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword ? 'text-green-700' : 'text-gray-600'}>
                          Passwords match
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

                {/* Submit Button */}
                <div className="flex justify-end border-t border-gray-200 pt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
