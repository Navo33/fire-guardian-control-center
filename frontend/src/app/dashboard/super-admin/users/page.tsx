'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import { 
  UserGroupIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon,
  ChevronDownIcon,
  CheckBadgeIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  user_type: 'admin' | 'vendor' | 'client';
  is_locked: boolean;
  last_login: string | null;
  created_at: string;
  role_name: string;
  companies_count: number;
  equipment_count: number;
  status: 'Active' | 'Inactive' | 'Locked';
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  vendorUsers: number;
  clientUsers: number;
  adminUsers: number;
  recentlyJoined: number;
}

export default function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();

      logApiCall('GET', API_ENDPOINTS.USERS.LIST);
      const response = await fetch(API_ENDPOINTS.USERS.LIST, { headers });

      const result = await response.json();

      if (result.success) {
        setUsers(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user statistics
  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = getAuthHeaders();

      logApiCall('GET', API_ENDPOINTS.USERS.STATS);
      const response = await fetch(API_ENDPOINTS.USERS.STATS, { headers });

      const result = await response.json();

      if (result.success) {
        setUserStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

  // Toggle user lock status
  const toggleUserLock = async (userId: number, currentLockStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.USERS.UPDATE_STATUS(userId);

      logApiCall('PUT', url);
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          isLocked: !currentLockStatus
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh users list
        fetchUsers();
        fetchUserStats();
      } else {
        throw new Error(result.message || 'Failed to update user status');
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  // Delete user
  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
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

      if (result.success) {
        // Refresh users list
        fetchUsers();
        fetchUserStats();
      } else {
        throw new Error(result.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, []);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUserType = userTypeFilter === 'All' || user.user_type === userTypeFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;

    return matchesSearch && matchesUserType && matchesStatus;
  });

  // Get status badge component
  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'Active':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Active</span>;
      case 'Locked':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Locked</span>;
      case 'Inactive':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Inactive</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
    }
  };

  // Get user type badge
  const getUserTypeBadge = (userType: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (userType) {
      case 'admin':
        return <span className={`${baseClasses} bg-purple-100 text-purple-800`}>Admin</span>;
      case 'vendor':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Vendor</span>;
      case 'client':
        return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>Client</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{userType}</span>;
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <ErrorDisplay message={error} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500">Manage system users and permissions</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckBadgeIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.activeUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <LockClosedIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Locked Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.lockedUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Recently Joined</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.recentlyJoined}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="relative">
              <select
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value)}
                className="input-field appearance-none pr-8 min-w-[120px]"
              >
                <option value="All">All Types</option>
                <option value="admin">Admin</option>
                <option value="vendor">Vendor</option>
                <option value="client">Client</option>
              </select>
              <ChevronDownIcon className="h-5 w-5 absolute right-2 top-3 text-gray-400" />
            </div>
            
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field appearance-none pr-8 min-w-[120px]"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Locked">Locked</option>
              </select>
              <ChevronDownIcon className="h-5 w-5 absolute right-2 top-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-900">
              System Users ({filteredUsers.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.display_name || `${user.first_name} ${user.last_name}`}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getUserTypeBadge(user.user_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>Last Login:</div>
                          <div className="font-medium">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleDateString()
                              : 'Never'
                            }
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => toggleUserLock(user.id, user.is_locked)}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            user.is_locked
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          }`}
                        >
                          {user.is_locked ? (
                            <>
                              <LockOpenIcon className="h-4 w-4 mr-1" />
                              Unlock
                            </>
                          ) : (
                            <>
                              <LockClosedIcon className="h-4 w-4 mr-1" />
                              Lock
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}