'use client';

import React, { useState, useEffect } from 'react';
import RequireRole from '@/components/auth/RequireRole';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import { useToast } from '@/components/providers/ToastProvider';
import { useConfirmModal } from '@/components/providers/ConfirmModalProvider';
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
  client_count: number;
  equipment_count: number;
  assignments_count: number;
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(10);
  
  const toast = useToast();
  const confirmModal = useConfirmModal();
  
  // Fetch users from API with pagination
  const fetchUsers = async (page: number = currentPage) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = `${API_ENDPOINTS.USERS.LIST}?page=${page}&limit=${itemsPerPage}`;

      logApiCall('GET', url);
      const response = await fetch(url, { headers });

      const result = await response.json();

      if (result.success) {
        setUsers(result.data);
        setCurrentPage(result.pagination.currentPage);
        setTotalPages(result.pagination.totalPages);
        setTotalCount(result.pagination.totalCount);
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
  const toggleUserLock = async (userId: number, currentLockStatus: boolean, userName: string) => {
    const action = currentLockStatus ? 'unlock' : 'lock';
    
    const confirmed = await confirmModal.confirm({
      title: `${currentLockStatus ? 'Unlock' : 'Lock'} User Account`,
      message: `Are you sure you want to ${action} ${userName}'s account?`,
      confirmText: currentLockStatus ? 'Unlock Account' : 'Lock Account',
      cancelText: 'Cancel',
      type: currentLockStatus ? 'confirm' : 'danger'
    });

    if (!confirmed) return;

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
        toast.success(`User account ${currentLockStatus ? 'unlocked' : 'locked'} successfully`);
        // Refresh users list
        fetchUsers();
        fetchUserStats();
      } else {
        throw new Error(result.message || 'Failed to update user status');
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  // Delete user with constraint checking
  const deleteUser = async (userId: number, userName: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // First check deletion constraints
      const headers = getAuthHeaders();
      const checkUrl = API_ENDPOINTS.USER_DETAILS.DELETION_CHECK(userId);
      
      logApiCall('GET', checkUrl);
      const checkResponse = await fetch(checkUrl, { headers });
      const checkResult = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkResult.message || 'Failed to check deletion constraints');
      }

      const deletionCheck = checkResult.data;
      
      // Determine modal type and content based on constraints
      let modalConfig;
      if (deletionCheck.canDelete) {
        modalConfig = {
          type: 'danger' as const,
          title: 'Delete User',
          message: `Are you sure you want to delete "${userName}"? This action cannot be undone.`,
          confirmText: 'Delete User'
        };
      } else {
        const issues = [];
        
        if (deletionCheck.userType === 'vendor') {
          if (deletionCheck.constraints.clientsCount > 0) {
            issues.push(`${deletionCheck.constraints.clientsCount} client${deletionCheck.constraints.clientsCount > 1 ? 's' : ''}`);
          }
          if (deletionCheck.constraints.equipmentCount > 0) {
            issues.push(`${deletionCheck.constraints.equipmentCount} equipment instance${deletionCheck.constraints.equipmentCount > 1 ? 's' : ''}`);
          }
          if (deletionCheck.constraints.assignmentsCount > 0) {
            issues.push(`${deletionCheck.constraints.assignmentsCount} active assignment${deletionCheck.constraints.assignmentsCount > 1 ? 's' : ''}`);
          }
          if (deletionCheck.constraints.activeTicketsCount > 0) {
            issues.push(`${deletionCheck.constraints.activeTicketsCount} active ticket${deletionCheck.constraints.activeTicketsCount > 1 ? 's' : ''}`);
          }
        } else if (deletionCheck.userType === 'client') {
          if (deletionCheck.constraints.equipmentCount > 0) {
            issues.push(`${deletionCheck.constraints.equipmentCount} assigned equipment`);
          }
          if (deletionCheck.constraints.activeTicketsCount > 0) {
            issues.push(`${deletionCheck.constraints.activeTicketsCount} active ticket${deletionCheck.constraints.activeTicketsCount > 1 ? 's' : ''}`);
          }
        }

        modalConfig = {
          type: 'alert' as const,
          title: 'Cannot Delete User',
          message: `"${userName}" cannot be deleted because they have ${issues.join(', ')}. Please reassign or remove these items first.`,
          confirmText: 'OK'
        };
      }

      // Show appropriate modal
      if (!deletionCheck.canDelete) {
        // Show warning modal for constraints
        await confirmModal.alert({
          title: modalConfig.title,
          message: modalConfig.message,
          confirmText: modalConfig.confirmText
        });
        return; // Stop here - cannot delete
      }

      // Show confirmation modal for deletion
      const confirmed = await confirmModal.danger({
        title: modalConfig.title,
        message: modalConfig.message,
        confirmText: modalConfig.confirmText,
        cancelText: 'Cancel'
      });

      if (!confirmed) return;

      // Proceed with deletion
      const deleteUrl = API_ENDPOINTS.USER_DETAILS.DELETE(userId);
      
      logApiCall('DELETE', deleteUrl);
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers
      });

      const deleteResult = await deleteResponse.json();

      if (!deleteResponse.ok) {
        throw new Error(deleteResult.message || 'Failed to delete user');
      }

      toast.success(`${userName} has been deleted successfully`);
      // Refresh users list
      fetchUsers();
      fetchUserStats();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Pagination control functions
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchUsers(page);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, []);

  // Filter users based on search and filters (applied to current page data)
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

  return (
    <RequireRole allowedRoles={['admin']}>
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
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              System Users ({filteredUsers.length})
            </h3>
          </div>

          {/* Loading State */}
          {isLoading && (
            <LoadingSpinner text="Loading users..." />
          )}

          {/* Error State */}
          {error && !isLoading && (
            <ErrorDisplay 
              message={error}
              action={{
                label: 'Try Again',
                onClick: fetchUsers
              }}
            />
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}

          {/* Users Table Content */}
          {!isLoading && !error && filteredUsers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      User Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Role & Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Business Metrics
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      onClick={() => window.location.href = `/users/${user.id}`}
                      className="hover:bg-red-50/30 cursor-pointer transition-all duration-150"
                    >
                      {/* User Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-semibold text-sm">
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {user.display_name || `${user.first_name} ${user.last_name}`}
                            </div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Status */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          {getUserTypeBadge(user.user_type)}
                          <div className="flex items-center space-x-1">
                            {getStatusBadge(user.status)}
                          </div>
                        </div>
                      </td>

                      {/* Business Metrics */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {user.user_type === 'vendor' && (
                            <>
                              <div className="flex items-center text-xs text-gray-600">
                                <span className="font-medium mr-1">{user.client_count || 0}</span>
                                <span className="text-gray-500">Clients</span>
                              </div>
                              <div className="flex items-center text-xs text-gray-600">
                                <span className="font-medium mr-1">{user.equipment_count || 0}</span>
                                <span className="text-gray-500">Equipment</span>
                              </div>
                            </>
                          )}
                          {user.user_type === 'client' && (
                            <>
                              <div className="flex items-center text-xs text-gray-600" title="Total equipment units assigned to this client">
                                <span className="font-medium mr-1">{user.equipment_count || 0}</span>
                                <span className="text-gray-500">Equipment Units</span>
                              </div>
                              <div className="flex items-center text-xs text-gray-500" title="Number of formal assignment documents (each assignment can contain multiple equipment units)">
                                <span>{user.assignments_count || 0} Assignment{user.assignments_count === 1 ? '' : 's'}</span>
                              </div>
                            </>
                          )}
                          {user.user_type === 'admin' && (
                            <div className="text-xs text-gray-500">
                              System Administrator
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Last Activity */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-gray-700">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'Never logged in'
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.last_login 
                              ? `${Math.floor((Date.now() - new Date(user.last_login).getTime()) / (1000 * 60 * 60 * 24))} days ago`
                              : 'No activity'
                            }
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-3 text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleUserLock(user.id, user.is_locked, user.display_name);
                            }}
                            className={`transition-colors ${
                              user.is_locked
                                ? 'text-green-600 hover:text-green-800'
                                : 'text-yellow-600 hover:text-yellow-800'
                            }`}
                          >
                            {user.is_locked ? 'Unlock' : 'Lock'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteUser(user.id, user.display_name);
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-6 py-4 border border-gray-100 rounded-2xl">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, totalCount)} of{' '}
                {totalCount} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
    </RequireRole>
  );
}