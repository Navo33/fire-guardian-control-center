'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AddVendorModal from '../../components/modals/AddVendorModal';
import CreateClientTicketModal from '../../components/modals/CreateClientTicketModal';
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
    toast.success('Vendor added successfully');
    // Refresh dashboard data after adding vendor
    fetchDashboardData();
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
                  <span className="text-xs text-green-600 font-medium">+12% this month</span>
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
                  <span className="text-xs text-green-600 font-medium">+8% this month</span>
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
                href="/analytics"
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
                href="/users"
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
                href="/settings"
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
                      <Link href="/analytics" className="text-xs text-red-600 hover:text-red-700 font-medium mt-2 inline-block">
                        View Details
                      </Link>
                    </div>
                  </div>
                  
                  {(stats.pendingInspections ?? 0) > 5 && (
                    <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <ClockIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Pending Inspections</p>
                        <p className="text-xs text-gray-600 mt-1">{stats.pendingInspections} inspections scheduled this week</p>
                        <Link href="/analytics" className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-2 inline-block">
                          View Schedule
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
                </tr>
              </thead>
              <tbody className="bg-white">
                {recentVendors.map((vendor, index) => (
                  <tr 
                    key={vendor.id} 
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${index !== recentVendors.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onClick={() => router.push(`/vendors/${vendor.id}`)}
                  >
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
// VENDOR DASHBOARD - Full implementation with API integration according to specification
// ============================================================================
function VendorDashboardComponent({ user }: { user: User }) {
  const [kpiData, setKpiData] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Fetch vendor dashboard data from API
  const fetchVendorDashboardData = async () => {
    const startTime = DebugLogger.startTimer();
    DebugLogger.ui('VendorDashboard', 'fetchVendorDashboardData started');
    
    try {
      setIsLoading(true);
      setError(null);

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();

      DebugLogger.log('Fetching vendor dashboard data with auth token', { hasToken: !!token }, 'VENDOR_DASHBOARD');

      // Fetch KPIs
      logApiCall('GET', API_ENDPOINTS.DASHBOARD.VENDOR_KPIS);
      const kpiResponse = await fetch(API_ENDPOINTS.DASHBOARD.VENDOR_KPIS, { headers });
      
      if (!kpiResponse.ok) {
        throw new Error(`Failed to fetch vendor KPIs: ${kpiResponse.status} ${kpiResponse.statusText}`);
      }
      const kpiData = await kpiResponse.json();
      DebugLogger.api('GET', '/api/dashboard/vendor-kpis', undefined, kpiData, kpiResponse.status);
      
      // Fetch recent activity
      logApiCall('GET', API_ENDPOINTS.DASHBOARD.VENDOR_ACTIVITY);
      const activityResponse = await fetch(`${API_ENDPOINTS.DASHBOARD.VENDOR_ACTIVITY}?limit=10`, { headers });
      
      if (!activityResponse.ok) {
        throw new Error(`Failed to fetch vendor activity: ${activityResponse.status} ${activityResponse.statusText}`);
      }
      const activityData = await activityResponse.json();
      DebugLogger.api('GET', '/api/dashboard/vendor-activity', undefined, activityData, activityResponse.status);

      if (kpiData.success && activityData.success) {
        DebugLogger.log('Vendor dashboard data fetched successfully', {
          kpiKeys: Object.keys(kpiData.data?.kpis || {}),
          activityCount: activityData.data?.length || 0
        }, 'VENDOR_DASHBOARD');
        
        setKpiData(kpiData.data);
        setRecentActivity(activityData.data);
      } else {
        throw new Error(kpiData.message || activityData.message || 'Failed to load vendor dashboard data');
      }

      DebugLogger.performance('Vendor dashboard data fetch', startTime);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load vendor dashboard data';
      DebugLogger.error('Vendor dashboard data fetch failed', err, { errorMessage });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorDashboardData();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Audit':
        return <ClipboardDocumentListIcon className="h-4 w-4" />;
      case 'Notification':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'Audit':
        return 'text-blue-600 bg-blue-50';
      case 'Notification':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
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
              <h1 className="text-2xl font-bold text-gray-900">
                {kpiData?.vendorInfo?.companyName || 'Vendor Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome, {kpiData?.vendorInfo?.displayName || user.display_name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {kpiData?.vendorInfo?.avatarUrl && (
              <Image 
                src={kpiData.vendorInfo.avatarUrl} 
                alt="Avatar"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full"
              />
            )}
            <button className="btn-primary flex items-center space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>Add Equipment</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <LoadingSpinner text="Loading vendor dashboard..." />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorDisplay 
            message={error}
            action={{
              label: 'Try Again',
              onClick: fetchVendorDashboardData
            }}
          />
        )}

        {/* Dashboard Content */}
        {!isLoading && !error && kpiData && (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{kpiData.kpis.totalEquipment}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-blue-600 font-medium">All devices</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <FireIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Compliant Equipment</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{kpiData.kpis.compliantEquipment}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-green-600 font-medium">✓ Up to standard</span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expired Equipment</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{kpiData.kpis.expiredEquipment}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-red-600 font-medium">Needs renewal</span>
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
                    <p className="text-sm font-medium text-gray-600">Overdue Equipment</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{kpiData.kpis.overdueEquipment}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-red-600 font-medium">! Past due</span>
                    </div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl">
                    <WrenchIcon className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Due Soon Equipment</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{kpiData.kpis.dueSoonEquipment}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-amber-600 font-medium">Due soon</span>
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
                    <p className="text-sm font-medium text-gray-600">Active Clients</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{kpiData.kpis.activeClients}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-green-600 font-medium">Clients Managed</span>
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
                    <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{kpiData.kpis.openTickets}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-orange-600 font-medium">Active Tickets</span>
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <WrenchScrewdriverIcon className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity Table */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Timestamp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {recentActivity.length > 0 ? (
                        recentActivity.map((activity, index) => (
                          <tr key={index} className={`hover:bg-gray-50 transition-colors ${index !== recentActivity.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`flex-shrink-0 p-2 rounded-lg ${getActivityTypeColor(activity.type)}`}>
                                  {getActivityIcon(activity.type)}
                                </div>
                                <div className="ml-3">
                                  <span className="text-sm font-medium text-gray-900">{activity.type}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{activity.description}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {activity.formattedTimestamp}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                            No recent activity
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link 
                    href="/equipment"
                    className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <PlusIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Add Equipment</p>
                      <p className="text-xs text-gray-500">Register new equipment</p>
                    </div>
                  </Link>
                  
                  <Link 
                    href="/maintenance-tickets"
                    className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <WrenchScrewdriverIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Create Ticket</p>
                      <p className="text-xs text-gray-500">New maintenance ticket</p>
                    </div>
                  </Link>
                  
                  <Link 
                    href="/clients"
                    className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-2 bg-green-50 rounded-lg">
                      <UserGroupIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">View Clients</p>
                      <p className="text-xs text-gray-500">Manage client accounts</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// CLIENT DASHBOARD - Enhanced implementation with comprehensive data
// ============================================================================
interface ClientDashboardData {
  client_info: {
    client_id?: number;
    display_name?: string;
    email?: string;
    company_name?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    vendor_id?: number;
    vendor_company_name?: string;
  };
  equipment_stats: {
    total_equipment: number;
    compliant_equipment: number;
    expired_equipment: number;
    overdue_equipment: number;
    due_soon_equipment: number;
    maintenance_overdue: number;
    maintenance_due_soon: number;
    compliance_rate: number;
  };
  ticket_stats: {
    total_tickets: number;
    open_tickets: number;
    closed_tickets: number;
    critical_tickets: number;
    recent_tickets: number;
    avg_resolution_days: number;
  };
  upcoming_events: Array<{
    event_type: string;
    serial_number: string;
    equipment_name: string;
    event_date: string;
    description: string;
    urgency: 'overdue' | 'urgent' | 'upcoming' | 'scheduled';
  }>;
}

function ClientDashboardComponent({ user }: { user: User }) {
  const [dashboardData, setDashboardData] = useState<ClientDashboardData>({
    client_info: {},
    equipment_stats: {
      total_equipment: 0,
      compliant_equipment: 0,
      expired_equipment: 0,
      overdue_equipment: 0,
      due_soon_equipment: 0,
      maintenance_overdue: 0,
      maintenance_due_soon: 0,
      compliance_rate: 0
    },
    ticket_stats: {
      total_tickets: 0,
      open_tickets: 0,
      closed_tickets: 0,
      critical_tickets: 0,
      recent_tickets: 0,
      avg_resolution_days: 0
    },
    upcoming_events: []
  });
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchClientDashboard();
  }, []);

  const fetchClientDashboard = async () => {
    const startTime = DebugLogger.startTimer();
    DebugLogger.ui('ClientDashboard', 'fetchClientDashboard started');
    
    try {
      setIsLoading(true);
      setError(null);
      const headers = getAuthHeaders();

      // Fetch comprehensive dashboard data
      logApiCall('GET', API_ENDPOINTS.CLIENT.DASHBOARD.KPIS);
      const kpisResponse = await fetch(API_ENDPOINTS.CLIENT.DASHBOARD.KPIS, { headers });
      
      if (!kpisResponse.ok) {
        throw new Error(`Failed to fetch dashboard data: ${kpisResponse.status} ${kpisResponse.statusText}`);
      }
      const kpisData = await kpisResponse.json();
      DebugLogger.api('GET', '/api/client-views/dashboard-kpis', undefined, kpisData, kpisResponse.status);

      // Fetch recent activity
      logApiCall('GET', API_ENDPOINTS.CLIENT.DASHBOARD.ACTIVITY);
      const activityResponse = await fetch(API_ENDPOINTS.CLIENT.DASHBOARD.ACTIVITY, { headers });
      
      if (!activityResponse.ok) {
        throw new Error(`Failed to fetch activity: ${activityResponse.status} ${activityResponse.statusText}`);
      }
      const activityData = await activityResponse.json();
      DebugLogger.api('GET', '/api/client-views/activity', undefined, activityData, activityResponse.status);

      if (kpisData.success) {
        DebugLogger.log('Client dashboard data fetched successfully', {
          equipmentTotal: kpisData.data?.equipment_stats?.total_equipment || 0,
          upcomingEvents: kpisData.data?.upcoming_events?.length || 0
        }, 'CLIENT_DASHBOARD');
        
        setDashboardData(kpisData.data);
        setActivity(activityData.success ? activityData.data : []);
      } else {
        throw new Error(kpisData.message || 'Failed to load dashboard data');
      }

      DebugLogger.performance('Client dashboard data fetch', startTime);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      DebugLogger.error('Client dashboard data fetch failed', err, { errorMessage });
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Loading client dashboard..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorDisplay 
          message={error}
          action={{
            label: 'Try Again',
            onClick: fetchClientDashboard
          }}
        />
      </DashboardLayout>
    );
  }

  const { client_info, equipment_stats, ticket_stats, upcoming_events } = dashboardData;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'upcoming': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'urgent': return <ClockIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {client_info.company_name || 'Client Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {client_info.display_name || user.display_name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {client_info.vendor_company_name && `Managed by ${client_info.vendor_company_name}`}
              </p>
            </div>
            <button 
              onClick={() => setIsCreateTicketModalOpen(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <ClipboardDocumentListIcon className="h-5 w-5" />
              <span>Create Service Request</span>
            </button>
          </div>
        </div>

        {/* Equipment Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{equipment_stats.total_equipment}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-blue-600 font-medium">All devices</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <FireIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliant Equipment</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{equipment_stats.compliant_equipment}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-green-600 font-medium">✓ Up to standard</span>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{equipment_stats.compliance_rate}%</p>
                <div className="flex items-center mt-2">
                  <span className={`text-xs font-medium ${
                    equipment_stats.compliance_rate >= 90 ? 'text-green-600' :
                    equipment_stats.compliance_rate >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {equipment_stats.compliance_rate >= 90 ? '✓ Excellent' :
                     equipment_stats.compliance_rate >= 70 ? '⚠ Good' : '⚠ Needs attention'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{ticket_stats.open_tickets}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-xs font-medium ${
                    ticket_stats.critical_tickets > 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {ticket_stats.critical_tickets > 0 ? `${ticket_stats.critical_tickets} critical` : 'No critical'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <ClipboardDocumentListIcon className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Additional Equipment Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expired Equipment</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{equipment_stats.expired_equipment}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-red-600 font-medium">Needs renewal</span>
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
                <p className="text-sm font-medium text-gray-600">Due Soon</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{equipment_stats.due_soon_equipment}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-amber-600 font-medium">Upcoming renewals</span>
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
                <p className="text-sm font-medium text-gray-600">Maintenance Overdue</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{equipment_stats.maintenance_overdue}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-red-600 font-medium">Past due</span>
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <WrenchIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{ticket_stats.avg_resolution_days}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-gray-600 font-medium">Days average</span>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <ClockIcon className="h-8 w-8 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Events Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Maintenance Events</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Equipment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {upcoming_events.length > 0 ? (
                    upcoming_events.map((event, index) => (
                      <tr key={index} className={`hover:bg-gray-50 transition-colors ${index !== upcoming_events.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{event.equipment_name}</div>
                            <div className="text-sm text-gray-500">{event.serial_number}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 p-2 rounded-lg ${getUrgencyColor(event.urgency).replace('text-', 'text-').replace('bg-', 'bg-').slice(0, -3)}50`}>
                              {getUrgencyIcon(event.urgency)}
                            </div>
                            <div className="ml-3">
                              <span className="text-sm text-gray-900">{event.description}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(event.event_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(event.urgency)}`}>
                            {event.urgency.charAt(0).toUpperCase() + event.urgency.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No upcoming maintenance events
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setIsCreateTicketModalOpen(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="p-2 bg-red-50 rounded-lg">
                  <PlusIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Create Service Request</p>
                  <p className="text-xs text-gray-500">Request equipment maintenance</p>
                </div>
              </button>
              
              <Link 
                href="/client-equipment"
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FireIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">View Equipment</p>
                  <p className="text-xs text-gray-500">See all your equipment</p>
                </div>
              </Link>
              
              <Link 
                href="/service-requests"
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-orange-50 rounded-lg">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">View Service Requests</p>
                  <p className="text-xs text-gray-500">Track your requests</p>
                </div>
              </Link>
              
              <Link 
                href="/clients/analytics"
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-purple-50 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Analytics & Compliance</p>
                  <p className="text-xs text-gray-500">Track performance & compliance</p>
                </div>
              </Link>
              
              <Link 
                href="/reports"
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-green-50 rounded-lg">
                  <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Safety Reports</p>
                  <p className="text-xs text-gray-500">Compliance reports</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {activity.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {activity.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      item.event_type === 'Ticket' ? 'bg-orange-50' : 'bg-blue-50'
                    }`}>
                      {item.event_type === 'Ticket' ? (
                        <ClipboardDocumentListIcon className="h-5 w-5 text-orange-600" />
                      ) : (
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.event}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.status === 'open' || item.status === 'Unread' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Service Request Modal */}
      <CreateClientTicketModal
        isOpen={isCreateTicketModalOpen}
        onClose={() => setIsCreateTicketModalOpen(false)}
        onSuccess={() => {
          fetchClientDashboard(); // Refresh dashboard data
          toast.success('Service request created successfully!');
        }}
      />
    </DashboardLayout>
  );
}
