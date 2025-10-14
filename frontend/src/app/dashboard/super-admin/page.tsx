'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AddVendorModal from '../../../components/modals/AddVendorModal';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorDisplay from '../../../components/ui/ErrorDisplay';
import DebugLogger from '../../../utils/DebugLogger';
import { 
  BuildingOfficeIcon, 
  ChartBarIcon,
  UserGroupIcon,
  FireIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  DocumentArrowDownIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  activeVendors: number;
  totalClients: number;
  criticalAlerts: number;
  totalEquipment: number;
  pendingInspections: number;
  overdueMaintenances: number;
}

interface RecentVendor {
  id: number;
  name: string;
  clients: number;
  equipment: number;
  status: string;
  joinDate: string;
  lastActivity: string;
  compliance: number;
}

export default function SuperAdminDashboard() {
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

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      const startTime = DebugLogger.startTimer();
      DebugLogger.ui('SuperAdminDashboard', 'fetchDashboardData started');
      
      try {
        setIsLoading(true);
        setError(null);

        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        DebugLogger.log('Fetching dashboard data with auth token', { hasToken: !!token }, 'DASHBOARD');

        // Fetch stats
        DebugLogger.api('GET', '/api/dashboard/stats (request)');
        const statsResponse = await fetch('http://localhost:5000/api/dashboard/stats', { headers });
        
        if (!statsResponse.ok) {
          throw new Error(`Failed to fetch dashboard stats: ${statsResponse.status} ${statsResponse.statusText}`);
        }
        const statsData = await statsResponse.json();
        DebugLogger.api('GET', '/api/dashboard/stats', undefined, statsData, statsResponse.status);
        
        // Fetch recent vendors
        DebugLogger.api('GET', '/api/dashboard/recent-vendors (request)');
        const vendorsResponse = await fetch('http://localhost:5000/api/dashboard/recent-vendors', { headers });
        
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
          throw new Error(`API returned success=false. Stats: ${statsData.message}, Vendors: ${vendorsData.message}`);
        }

        DebugLogger.performance('Dashboard data fetch', startTime);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
        DebugLogger.error('Dashboard data fetch failed', err, { errorMessage });
        setError(errorMessage);
        
        // Fallback to mock data if API fails
        setStats({
          activeVendors: 10,
          totalClients: 145,
          criticalAlerts: 3,
          totalEquipment: 1234,
          pendingInspections: 28,
          overdueMaintenances: 7
        });
        setRecentVendors([
          { id: 1, name: 'SafeGuard Fire Systems', clients: 23, equipment: 156, status: 'Active', joinDate: '2024-01-15', lastActivity: '2 hours ago', compliance: 98 },
          { id: 2, name: 'ProFire Solutions', clients: 18, equipment: 98, status: 'Active', joinDate: '2024-02-20', lastActivity: '1 day ago', compliance: 95 },
          { id: 3, name: 'FireTech Services', clients: 31, equipment: 201, status: 'Pending', joinDate: '2024-03-10', lastActivity: '3 days ago', compliance: 89 },
          { id: 4, name: 'Emergency Safety Co.', clients: 15, equipment: 87, status: 'Active', joinDate: '2024-03-25', lastActivity: '5 hours ago', compliance: 92 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor vendor activity and platform overview</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add New Vendor</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-700">
                {error} - Using fallback data. Please check if the backend server is running.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              <p className="text-blue-700">Loading dashboard data...</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-xl">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeVendors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-xl">
                <UserGroupIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-red-50 rounded-xl">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.criticalAlerts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-xl">
                <FireIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEquipment.toLocaleString()}</p>
              </div>
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
                    Vendor Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Clients & Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Compliance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Last Activity
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
                      <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.clients} clients</div>
                      <div className="text-sm text-gray-500">{vendor.equipment} equipment units</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3 max-w-[100px]">
                          <div 
                            className="h-2 rounded-full bg-red-500"
                            style={{ width: `${vendor.compliance}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{vendor.compliance}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        vendor.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{vendor.lastActivity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button className="text-red-600 hover:text-red-800 transition-colors">
                        View
                      </button>
                      <button className="text-gray-600 hover:text-gray-800 transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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