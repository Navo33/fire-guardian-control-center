'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AddVendorModal from '../../components/modals/AddVendorModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import DebugLogger from '../../utils/DebugLogger';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '../../config/api';
import { useToast } from '../../components/providers/ToastProvider';
import { 
  BuildingOfficeIcon, 
  ChartBarIcon,
  UserGroupIcon,
  FireIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { WrenchIcon } from '@heroicons/react/24/solid';

interface User {
  id: number;
  email: string;
  display_name: string;
  user_type: 'admin' | 'vendor' | 'client';
  role_id?: number;
}

interface DashboardStats {
  activeVendors: number;
  totalClients: number;
  criticalAlerts: number;
  totalEquipment: number;
  pendingInspections?: number;
  overdueMaintenances?: number;
}

interface RecentVendor {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  category: string;
  clients: number;
  equipment: number;
  status: string;
  joinDate: string;
  lastActivity: string;
  compliance: number;
  display_name?: string;
  company_name?: string;
  primary_phone?: string;
  city?: string;
  state?: string;
  equipment_count?: number;
  client_count?: number;
  specializations?: string;
  is_locked?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
      }
    } else {
      // Redirect to login if no user data
      router.push('/login');
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading || !user) {
    return (
      <DashboardLayout>
        <LoadingSpinner fullPage text="Loading dashboard..." />
      </DashboardLayout>
    );
  }

  // Render different dashboard based on user type
  if (user.user_type === 'admin') {
    return <AdminDashboard user={user} />;
  }

  if (user.user_type === 'vendor') {
    return <VendorDashboardComponent user={user} />;
  }

  if (user.user_type === 'client') {
    return <ClientDashboardComponent user={user} />;
  }

  // Fallback
  return (
    <DashboardLayout>
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Unknown User Type</h2>
        <p className="text-gray-600 mt-2">Please contact support.</p>
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// ADMIN DASHBOARD - Full implementation with API integration
// ============================================================================
function AdminDashboard({ user }: { user: User }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    activeVendors: 0,
    totalClients: 0,
    criticalAlerts: 0,
    totalEquipment: 0,
    pendingInspections: 0,
    overdueMaintenances: 0
  });
  const [recentVendors, setRecentVendors] = useState<RecentVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    const startTime = DebugLogger.startTimer();
    DebugLogger.ui('AdminDashboard', 'fetchDashboardData started');
    
    try {
      setIsLoading(true);
      setError(null);

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();

      DebugLogger.log('Fetching dashboard data with auth token', { hasToken: !!token }, 'DASHBOARD');

      // Fetch stats
      logApiCall('GET', API_ENDPOINTS.DASHBOARD.STATS);
      const statsResponse = await fetch(API_ENDPOINTS.DASHBOARD.STATS, { headers });
      
      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${statsResponse.status} ${statsResponse.statusText}`);
      }
      const statsData = await statsResponse.json();
      DebugLogger.api('GET', '/api/dashboard/stats', undefined, statsData, statsResponse.status);
      
      // Fetch recent vendors
      logApiCall('GET', API_ENDPOINTS.DASHBOARD.RECENT_VENDORS);
      const vendorsResponse = await fetch(API_ENDPOINTS.DASHBOARD.RECENT_VENDORS, { headers });
      
      if (!vendorsResponse.ok) {
        throw new Error(`Failed to fetch recent vendors: ${vendorsResponse.status} ${vendorsResponse.statusText}`);
      }
      const vendorsData = await vendorsResponse.json();
      DebugLogger.api('GET', '/api/dashboard/recent-vendors', undefined, vendorsData, vendorsResponse.status);

      if (statsData.success && vendorsData.success) {
        DebugLogger.log('Dashboard data fetched successfully', {
          statsKeys: Object.keys(statsData.data || {}),
          vendorsCount: vendorsData.data?.length || 0
        }, 'DASHBOARD');
        
        setStats(statsData.data);
        setRecentVendors(vendorsData.data);
      } else {
        throw new Error(statsData.message || vendorsData.message || 'Failed to load dashboard data');
      }

      DebugLogger.performance('Dashboard data fetch', startTime);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      DebugLogger.error('Dashboard data fetch failed', err, { errorMessage });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAddVendor = (vendorData: any) => {
    console.log('New vendor added from dashboard:', vendorData);
    // Refresh dashboard data after adding vendor
    window.location.reload();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor vendor activity and platform overview</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add New Vendor</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <LoadingSpinner text="Loading dashboard data..." />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorDisplay 
            message={error}
            action={{
              label: 'Try Again',
              onClick: fetchDashboardData
            }}
          />
        )}

        {/* Dashboard Content */}
        {!isLoading && !error && (
          <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Vendors</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeVendors}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-green-600 font-medium">↗ 12% this month</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-green-600 font-medium">↗ 8% this month</span>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <UserGroupIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.criticalAlerts}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-red-600 font-medium">Needs attention</span>
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEquipment.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-gray-600 font-medium">Across all vendors</span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <FireIcon className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Inspections</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingInspections}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-amber-600 font-medium">Due this week</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <ClockIcon className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Maintenance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.overdueMaintenances}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-red-600 font-medium">Requires action</span>
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <WrenchIcon className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="p-2 bg-blue-50 rounded-lg">
                  <PlusIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Add New Vendor</p>
                  <p className="text-xs text-gray-500">Register a new vendor</p>
                </div>
              </button>
              
              <Link 
                href="/dashboard/analytics"
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-purple-50 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">View Analytics</p>
                  <p className="text-xs text-gray-500">System performance insights</p>
                </div>
              </Link>
              
              <Link 
                href="/dashboard/users"
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-green-50 rounded-lg">
                  <UserGroupIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Manage Users</p>
                  <p className="text-xs text-gray-500">User accounts & permissions</p>
                </div>
              </Link>
              
              <Link 
                href="/dashboard/settings"
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-gray-50 rounded-lg">
                  <CogIcon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">System Settings</p>
                  <p className="text-xs text-gray-500">Configure security & policies</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Critical Alerts</h3>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                {stats.criticalAlerts} Active
              </span>
            </div>
            <div className="space-y-3">
              {stats.criticalAlerts > 0 ? (
                <>
                  <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-xl border border-red-100">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Overdue Maintenance Items</p>
                      <p className="text-xs text-gray-600 mt-1">{stats.overdueMaintenances} equipment items require immediate attention</p>
                      <Link href="/dashboard/analytics" className="text-xs text-red-600 hover:text-red-700 font-medium mt-2 inline-block">
                        View Details →
                      </Link>
                    </div>
                  </div>
                  
                  {(stats.pendingInspections ?? 0) > 5 && (
                    <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <ClockIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Pending Inspections</p>
                        <p className="text-xs text-gray-600 mt-1">{stats.pendingInspections} inspections scheduled this week</p>
                        <Link href="/dashboard/analytics" className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-2 inline-block">
                          View Schedule →
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl mb-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">All Clear!</p>
                  <p className="text-xs text-gray-500 mt-1">No critical alerts at this time</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Vendors Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900" style={{fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'}}>
                Recent Vendors
              </h2>
              <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                Export Report
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Vendor Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {recentVendors.map((vendor, index) => (
                  <tr key={vendor.id} className={`hover:bg-gray-50 transition-colors ${index !== recentVendors.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                            <BuildingOfficeIcon className="h-5 w-5 text-red-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                          <div className="text-sm text-gray-500">{vendor.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.email}</div>
                      <div className="text-sm text-gray-500">{vendor.phone}</div>
                      <div className="text-sm text-gray-500">{vendor.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.clients} clients</div>
                      <div className="text-sm text-gray-500">{vendor.equipment} equipment</div>
                      <div className="flex items-center mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-[80px]">
                          <div 
                            className="h-2 rounded-full bg-red-500"
                            style={{ width: `${vendor.compliance}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600">{vendor.compliance}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        vendor.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : vendor.status === 'Inactive'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {vendor.status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{vendor.lastActivity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <Link 
                        href={`/dashboard/vendors/${vendor.id}`}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        View
                      </Link>
                      <Link 
                        href={`/dashboard/vendors/${vendor.id}/edit`}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Add Vendor Modal */}
      <AddVendorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddVendor}
      />
    </DashboardLayout>
  );
}

// ============================================================================
// VENDOR DASHBOARD - Placeholder for future implementation
// ============================================================================
function VendorDashboardComponent({ user }: { user: User }) {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user.display_name}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-xl">
                <UserGroupIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Clients</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-xl">
                <FireIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Equipment Managed</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-xl">
                <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Service Requests</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-50 rounded-xl">
                <ClockIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Message */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-green-800">
            <strong>Vendor Dashboard:</strong> Client management, equipment tracking, and service request features are coming soon!
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// CLIENT DASHBOARD - Placeholder for future implementation
// ============================================================================
function ClientDashboardComponent({ user }: { user: User }) {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user.display_name}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-xl">
                <FireIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Equipment</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-xl">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Equipment</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-50 rounded-xl">
                <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Due for Service</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-xl">
                <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Requests</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Message */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <p className="text-purple-800">
            <strong>Client Dashboard:</strong> Equipment overview, service request management, and maintenance history features are coming soon!
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
