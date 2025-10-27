'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  TrashIcon,
  PencilIcon,
  KeyIcon,
  CalendarIcon,
  ClockIcon,
  FireIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  GlobeAltIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface UserDetail {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  user_type: 'admin' | 'vendor' | 'client';
  is_locked: boolean;
  last_login: string | null;
  created_at: string;
  last_login_ip: string | null;
  role_name: string;
  
  // Vendor-specific fields
  company?: {
    company_name: string;
    business_type: string;
    license_number?: string;
    tax_id?: string;
    website?: string;
    established_year?: number;
    employee_count?: number;
    annual_revenue?: number;
  };
  contact?: {
    contact_person_name: string;
    contact_title: string;
    primary_email: string;
    primary_phone: string;
    secondary_phone: string;
    fax: string;
  };
  addresses?: Array<{
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  }>;
  specializations?: Array<{
    id: number;
    name: string;
    description: string;
    category: string;
  }>;
  equipment_count?: number;
  client_count?: number;
  
  // Client-specific fields
  vendor?: {
    id: number;
    display_name: string;
    email: string;
    vendor_company: string;
  };
  equipment?: Array<{
    equipment_name: string;
    equipment_code: string;
    equipment_type: string;
    serial_number: string;
    asset_tag: string;
    status: string;
    condition_rating: number;
    assigned_at: string;
    assignment_status: string;
    start_date: string;
    end_date: string;
    vendor_name: string;
    vendor_company: string;
  }>;
}

export default function UserDetailPage() {
  return (
    <RequireRole allowedRoles={['admin']}>
      <UserDetailContent />
    </RequireRole>
  );
}

function UserDetailContent() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });

  // Fetch user details
  const fetchUserDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.USER_DETAILS.BY_ID(userId);

      logApiCall('GET', url);
      const response = await fetch(url, { headers });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch user details');
      }

      setUser(result.data);
      setEditForm({
        first_name: result.data.first_name,
        last_name: result.data.last_name,
        email: result.data.email
      });
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user details');
    } finally {
      setIsLoading(false);
    }
  };

  // Update user details
  const handleUpdateUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.USER_DETAILS.UPDATE(userId);

      logApiCall('PUT', url);
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update user');
      }

      // Refresh user data
      fetchUserDetails();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  // Request password reset
  const handlePasswordReset = async () => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.USER_DETAILS.RESET_PASSWORD(userId);

      logApiCall('POST', url);
      const response = await fetch(url, {
        method: 'POST',
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset password');
      }

      alert('Password reset link has been generated successfully');
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  // Delete user account
  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete this user account? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.USERS.BY_ID(userId);

      logApiCall('DELETE', url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete user');
      }

      // Redirect to users list
      router.push('/users');
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  if (error && !user) {
    return (
      <DashboardLayout>
        <ErrorDisplay message={error} />
      </DashboardLayout>
    );
  }

  if (isLoading || !user) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    if (user?.is_locked) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/users"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user?.display_name}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(user?.is_locked ? 'Inactive' : 'Active')}`}>
                  {user?.is_locked ? 'Inactive' : 'Active'}
                </span>
                <span className="text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary flex items-center space-x-2"
            >
              <PencilIcon className="h-4 w-4" />
              <span>{isEditing ? 'Cancel' : 'Edit'}</span>
            </button>
            <button
              onClick={handlePasswordReset}
              className="btn-primary flex items-center space-x-2"
            >
              <ShieldCheckIcon className="h-4 w-4" />
              <span>Reset Password</span>
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-xl">
                <UserIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">User Type</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">{user?.user_type}</p>
              </div>
            </div>
          </div>

          {user?.user_type === 'vendor' && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <FireIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Equipment</p>
                    <p className="text-2xl font-bold text-gray-900">{user?.equipment_count || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <UserGroupIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Clients</p>
                    <p className="text-2xl font-bold text-gray-900">{user?.client_count || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <CheckCircleIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Specializations</p>
                    <p className="text-2xl font-bold text-gray-900">{user?.specializations?.length || 0}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {user?.user_type === 'client' && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <FireIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Equipment</p>
                    <p className="text-2xl font-bold text-gray-900">{user?.equipment?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <UserGroupIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Created By</p>
                    <p className="text-2xl font-bold text-gray-900">{user?.vendor ? 'Vendor' : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <ChartBarIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className="text-2xl font-bold text-gray-900">{user?.is_locked ? 'Locked' : 'Active'}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: BuildingOfficeIcon },
                ...(user?.user_type === 'vendor' ? [{ id: 'specializations', name: 'Specializations', icon: WrenchScrewdriverIcon }] : []),
                ...(user?.user_type === 'client' ? [
                  { id: 'vendor', name: 'Vendor', icon: UserGroupIcon },
                  { id: 'equipment', name: 'Equipment', icon: FireIcon }
                ] : [])
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <UserIcon className="h-5 w-5 text-red-600 mr-2" />
                    Basic Information
                  </h3>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={editForm.first_name}
                            onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={editForm.last_name}
                            onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button onClick={handleUpdateUser} className="btn-primary">
                          Save Changes
                        </button>
                        <button onClick={() => setIsEditing(false)} className="btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <p className="text-sm text-gray-900">{user?.display_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="text-sm text-gray-900">{user?.email}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">User Type</label>
                        <p className="text-sm text-gray-900 capitalize">{user?.user_type}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Status</label>
                        <p className="text-sm text-gray-900">{user?.is_locked ? 'Locked' : 'Active'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Joined</label>
                        <p className="text-sm text-gray-900">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Login</label>
                        <p className="text-sm text-gray-900">
                          {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>


                {/* Company Information */}
                {user?.company && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-red-600 mr-2" />
                      Company Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Company Name</label>
                        <p className="text-sm text-gray-900">{user.company.company_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Business Type</label>
                        <p className="text-sm text-gray-900">{user.company.business_type}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">License Number</label>
                        <p className="text-sm text-gray-900">{user.company.license_number || 'N/A'}</p>
                      </div>
                      {user.company.website && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Website</label>
                          <a 
                            href={user.company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {user.company.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {user?.contact && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <PhoneIcon className="h-5 w-5 text-red-600 mr-2" />
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                          <p className="text-sm text-gray-900">{user.contact.contact_person_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{user.contact.contact_title || ''}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Primary Email</label>
                          <p className="text-sm text-gray-900">{user.contact.primary_email || user.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Primary Phone</label>
                          <p className="text-sm text-gray-900">{user.contact.primary_phone || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {user.addresses && user.addresses.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            {user.addresses.map((address, index) => (
                              <div key={index}>
                                <p className="text-sm text-gray-900">{address.street_address}</p>
                                <p className="text-sm text-gray-900">{address.city}, {address.state} {address.zip_code}</p>
                                <p className="text-sm text-gray-900">{address.country}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Specializations Tab (Vendor Only) */}
            {activeTab === 'specializations' && user?.user_type === 'vendor' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 text-red-600 mr-2" />
                  Specializations
                </h3>
                {user.specializations && user.specializations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user.specializations.map((spec) => (
                      <div 
                        key={spec.id} 
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <p className="font-medium text-gray-900">{spec.name}</p>
                        <p className="text-sm text-gray-500">{spec.category}</p>
                        {spec.description && (
                          <p className="text-xs text-gray-400 mt-1">
                            {spec.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No specializations specified</p>
                )}
              </div>
            )}


            {/* Vendor Tab (Client Only) */}
            {activeTab === 'vendor' && user?.user_type === 'client' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <UserGroupIcon className="h-5 w-5 text-red-600 mr-2" />
                  Vendor Information
                </h3>
                {user.vendor ? (
                  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                        <div className="flex items-center space-x-2">
                          <BuildingOfficeIcon className="h-5 w-5 text-red-600" />
                          <p className="text-base font-medium text-gray-900">{user.vendor.vendor_company || user.vendor.display_name}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                        <p className="text-base text-gray-900">{user.vendor.display_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <div className="flex items-center space-x-2">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                          <p className="text-base text-gray-900">{user.vendor.email}</p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-200">
                        <Link
                          href={`/users/${user.vendor.id}`}
                          className="inline-flex items-center space-x-2 text-red-600 hover:text-red-800 font-medium"
                        >
                          <span>View Vendor Details</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No vendor information available</p>
                  </div>
                )}
              </div>
            )}

            {/* Equipment Tab (Client Only) */}
            {activeTab === 'equipment' && user?.user_type === 'client' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Equipment Borrowed ({user.equipment?.length || 0})
                  </h3>
                </div>
                
                {user.equipment && user.equipment.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Equipment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Serial No.
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Vendor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Assigned Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {user.equipment.map((equipment, index) => (
                          <tr key={index} className={`hover:bg-gray-50 transition-colors ${index !== user.equipment!.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{equipment.equipment_name}</div>
                                <div className="text-sm text-gray-500">{equipment.equipment_type}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {equipment.serial_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                equipment.status === 'assigned' ? 'bg-green-100 text-green-800' :
                                equipment.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {equipment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {equipment.vendor_company || equipment.vendor_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(equipment.assigned_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FireIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No equipment borrowed yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
