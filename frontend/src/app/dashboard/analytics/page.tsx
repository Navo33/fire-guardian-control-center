'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_ENDPOINTS, getAuthHeaders, logApiCall, buildApiUrl } from '@/config/api';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  WrenchScrewdriverIcon,
  TruckIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

// Chart components - we'll use recharts for professional charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';

// Types for our analytics data
interface SystemMetrics {
  totalVendors: number;
  totalClients: number;
  totalEquipment: number;
  totalAssignments: number;
  activeAssignments: number;
  pendingReturns: number;
  criticalAlerts?: number;
  warningAlerts?: number;
  infoAlerts?: number;
}

interface VendorMetrics {
  vendorId: number;
  vendorName: string;
  companyName: string;
  totalEquipment: number;
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  totalClients: number;
  specializations: string[];
}

interface EquipmentMetrics {
  equipmentId: number;
  equipmentName: string;
  totalInstances: number;
  availableInstances: number;
  assignedInstances: number;
  maintenanceInstances: number;
  utilizationRate: number;
  totalAssignments: number;
}

interface ClientMetrics {
  clientId: number;
  clientName: string;
  totalAssignments: number;
  activeAssignments: number;
  totalEquipment: number;
  lastAssignmentDate: string | null;
}

interface TimeSeriesData {
  date: string;
  newVendors: number;
  newClients: number;
  newAssignments: number;
  completedAssignments: number;
}

interface Company {
  id: number;
  name: string;
  vendorCount: number;
}

interface AlertMetrics {
  alertId: number;
  alertType: string;
  alertLevel: 'critical' | 'warning' | 'info';
  message: string;
  count: number;
  lastOccurrence: string;
  affectedEntities: number;
}

interface AlertTrend {
  date: string;
  critical: number;
  warning: number;
  info: number;
  resolved: number;
}

interface AnalyticsData {
  systemMetrics: SystemMetrics;
  vendorMetrics: VendorMetrics[];
  equipmentMetrics: EquipmentMetrics[];
  clientMetrics: ClientMetrics[];
  timeSeriesData: TimeSeriesData[];
  companies: Company[];
  alertMetrics: AlertMetrics[];
  alertTrends: AlertTrend[];
}

interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  selectedCompanies: number[];
  selectedVendors: number[];
  selectedClients: number[];
  equipmentTypes: string[];
  specializations: string[];
}

// Professional color palette
const CHART_COLORS = ['#E65100', '#059669', '#7C3AED', '#DC6D00', '#0891B2', '#64748B'];

const COLORS = {
  primary: '#E65100',     // Blue
  secondary: '#059669',   // Green
  accent: '#7C3AED',      // Purple
  warning: '#DC6D00',     // Orange
  danger: '#DC2626',      // Red
  info: '#0891B2',        // Cyan
  neutral: '#64748B',     // Slate
  success: '#16A34A'      // Green success
};

export default function SystemAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: '',
    endDate: '',
    selectedCompanies: [],
    selectedVendors: [],
    selectedClients: [],
    equipmentTypes: [],
    specializations: []
  });

  // Initialize date filters to last 14 days (2 weeks)
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14); // 2 weeks from today

    setFilters(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }));
  }, []);

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.selectedCompanies.length > 0) {
        filters.selectedCompanies.forEach(id => queryParams.append('vendorIds', id.toString()));
      }
      if (filters.selectedVendors.length > 0) {
        filters.selectedVendors.forEach(id => queryParams.append('vendorIds', id.toString()));
      }
      if (filters.selectedClients.length > 0) {
        filters.selectedClients.forEach(id => queryParams.append('clientIds', id.toString()));
      }

      const headers = getAuthHeaders();
      const url = `${API_ENDPOINTS.ANALYTICS.SYSTEM}?${queryParams}`;

      logApiCall('GET', url);
      const response = await fetch(url, { headers });

      console.log('Fetch response:', response);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchAnalyticsData();
    }
  }, [filters.startDate, filters.endDate, filters.selectedCompanies, filters.selectedVendors, filters.selectedClients]);

  // Apply filters
  const applyFilters = () => {
    fetchAnalyticsData();
  };

  // Reset filters
  const resetFilters = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14); // Reset to 2 weeks

    setFilters({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      selectedCompanies: [],
      selectedVendors: [],
      selectedClients: [],
      equipmentTypes: [],
      specializations: []
    });
  };

  // Export data function
  const exportData = () => {
    if (!analyticsData) return;
    
    const dataToExport = {
      generatedAt: new Date().toISOString(),
      filters: filters,
      systemMetrics: analyticsData.systemMetrics,
      vendorMetrics: analyticsData.vendorMetrics,
      equipmentMetrics: analyticsData.equipmentMetrics,
      clientMetrics: analyticsData.clientMetrics,
      timeSeriesData: analyticsData.timeSeriesData
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <RequireRole allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
              <p className="text-gray-600 mt-1">Comprehensive analytics and insights for Fire Guardian Control Center</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={exportData}
              className="btn-primary flex items-center space-x-2"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12">
            <LoadingSpinner text="Loading analytics data..." />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12">
            <ErrorDisplay 
              message={error}
              action={{
                label: 'Try Again',
                onClick: fetchAnalyticsData
              }}
            />
          </div>
        )}

        {/* Content - Only show when not loading and no error */}
        {!loading && !error && analyticsData && (
          <>
            {/* Filters Panel - Vendor-style Inline Layout */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Date Range Filters */}
                <div className="flex-1 relative">
                  <CalendarIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="input-field pl-10"
                    placeholder="Start Date"
                  />
                </div>

                <div className="flex-1 relative">
                  <CalendarIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="input-field pl-10"
                    placeholder="End Date"
                  />
                </div>

                {/* Company Filter - Inline Dropdown */}
                <div className="relative">
                  <select
                    value={filters.selectedCompanies.length === 1 ? filters.selectedCompanies[0] : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters(prev => ({
                        ...prev,
                        selectedCompanies: value ? [parseInt(value)] : []
                      }));
                    }}
                    className="input-field appearance-none pr-8 min-w-[180px]"
                  >
                    <option value="">All Companies</option>
                    {analyticsData.companies.map((company: any) => (
                      <option key={company.id} value={company.id}>
                        {company.name} ({company.vendorCount})
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="h-4 w-4 absolute right-2 top-3 text-gray-400 pointer-events-none" />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={applyFilters}
                    className="btn-primary px-6"
                  >
                    Apply
                  </button>
                  <button
                    onClick={resetFilters}
                    className="btn-secondary px-4"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Vendors</dt>
                      <dd className="text-2xl font-bold text-gray-900">{analyticsData.systemMetrics.totalVendors}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                  <dd className="text-2xl font-bold text-gray-900">{analyticsData.systemMetrics.totalClients}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Equipment</dt>
                  <dd className="text-2xl font-bold text-gray-900">{analyticsData.systemMetrics.totalEquipment}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Assignments</dt>
                  <dd className="text-2xl font-bold text-gray-900">{analyticsData.systemMetrics.activeAssignments}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Assignments</dt>
                  <dd className="text-2xl font-bold text-gray-900">{analyticsData.systemMetrics.totalAssignments}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Returns</dt>
                  <dd className="text-2xl font-bold text-gray-900">{analyticsData.systemMetrics.pendingReturns}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Trends Over Time</h3>
          {analyticsData.timeSeriesData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={analyticsData.timeSeriesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="vendorsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="assignmentsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    domain={[0, 'dataMax + 2']}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                    formatter={(value: any, name: any) => [value, name]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="newVendors" 
                    stroke={COLORS.primary}
                    fill="url(#vendorsGradient)"
                    strokeWidth={2}
                    name="New Vendors"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="newClients" 
                    stroke={COLORS.secondary}
                    fill="url(#clientsGradient)"
                    strokeWidth={2}
                    name="New Clients"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="newAssignments" 
                    stroke={COLORS.accent}
                    fill="url(#assignmentsGradient)"
                    strokeWidth={2}
                    name="New Assignments"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completedAssignments" 
                    stroke={COLORS.success}
                    fill="url(#completedGradient)"
                    strokeWidth={2}
                    name="Completed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium">No trend data available</div>
                <div className="text-sm">Data will appear as activity occurs over time</div>
              </div>
            </div>
          )}
        </div>

        {/* Vendor Performance Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Vendor Performance</h3>
          {analyticsData.vendorMetrics.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={analyticsData.vendorMetrics
                    .sort((a: any, b: any) => b.totalEquipment - a.totalEquipment)
                    .slice(0, 8)
                  }
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="companyName" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    domain={[0, 'dataMax + 5']}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="totalEquipment" 
                    fill={COLORS.primary} 
                    name="Total Equipment" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="activeAssignments" 
                    fill={COLORS.secondary} 
                    name="Active Assignments" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="totalClients" 
                    fill={COLORS.accent} 
                    name="Total Clients" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BuildingOfficeIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium">No vendor data available</div>
                <div className="text-sm">Add vendors to see performance metrics</div>
              </div>
            </div>
          )}
        </div>

        {/* System Alerts Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Alerts Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="text-3xl font-bold" style={{ color: COLORS.danger }}>{analyticsData.systemMetrics?.criticalAlerts || 0}</div>
              <div className="text-sm font-medium text-red-700">Critical Alerts</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="text-3xl font-bold" style={{ color: COLORS.warning }}>{analyticsData.systemMetrics?.warningAlerts || 0}</div>
              <div className="text-sm font-medium text-orange-700">Warning Alerts</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-3xl font-bold" style={{ color: COLORS.info }}>{analyticsData.systemMetrics?.infoAlerts || 0}</div>
              <div className="text-sm font-medium text-blue-700">Info Alerts</div>
            </div>
          </div>
          
          {analyticsData.alertTrends && analyticsData.alertTrends.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={analyticsData.alertTrends}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="infoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.info} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    domain={[0, 'dataMax + 1']}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="critical" 
                    stroke={COLORS.danger}
                    fill="url(#criticalGradient)"
                    strokeWidth={2}
                    name="Critical"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="warning" 
                    stroke={COLORS.warning}
                    fill="url(#warningGradient)"
                    strokeWidth={2}
                    name="Warning"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="info" 
                    stroke={COLORS.info}
                    fill="url(#infoGradient)"
                    strokeWidth={2}
                    name="Info"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium">No alert trends available</div>
                <div className="text-sm">Alert history will appear here as events occur</div>
              </div>
            </div>
          )}
        </div>

        {/* Equipment Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Equipment Status Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Available', value: analyticsData.equipmentMetrics.reduce((acc: number, eq: any) => acc + eq.availableInstances, 0) },
                      { name: 'Assigned', value: analyticsData.equipmentMetrics.reduce((acc: number, eq: any) => acc + eq.assignedInstances, 0) },
                      { name: 'Maintenance', value: analyticsData.equipmentMetrics.reduce((acc: number, eq: any) => acc + eq.maintenanceInstances, 0) }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Available', value: analyticsData.equipmentMetrics.reduce((acc: number, eq: any) => acc + eq.availableInstances, 0), color: COLORS.secondary },
                      { name: 'Assigned', value: analyticsData.equipmentMetrics.reduce((acc: number, eq: any) => acc + eq.assignedInstances, 0), color: COLORS.primary },
                      { name: 'Maintenance', value: analyticsData.equipmentMetrics.reduce((acc: number, eq: any) => acc + eq.maintenanceInstances, 0), color: COLORS.warning }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Most Active Vendor:</span>
                <span className="text-sm font-medium text-gray-900">
                  {analyticsData.vendorMetrics.length > 0 ? analyticsData.vendorMetrics[0].companyName : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Most Utilized Equipment:</span>
                <span className="text-sm font-medium text-gray-900">
                  {analyticsData.equipmentMetrics.length > 0 ? analyticsData.equipmentMetrics[0].equipmentName : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Average Utilization Rate:</span>
                <span className="text-sm font-medium text-gray-900">
                  {analyticsData.equipmentMetrics.length > 0 
                    ? `${(analyticsData.equipmentMetrics.reduce((acc: number, eq: any) => acc + eq.utilizationRate, 0) / analyticsData.equipmentMetrics.length).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Total Companies:</span>
                <span className="text-sm font-medium text-gray-900">{analyticsData.companies.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top Vendors Table */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Vendors</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 text-sm font-medium text-gray-500">
                      Company
                    </th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">
                      Equipment
                    </th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">
                      Assignments
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analyticsData.vendorMetrics.slice(0, 5).map((vendor: any) => (
                    <tr key={vendor.vendorId} className="hover:bg-gray-50">
                      <td className="py-3 text-sm font-medium text-gray-900">
                        {vendor.companyName}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {vendor.totalEquipment}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {vendor.totalAssignments}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Equipment Table */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Most Utilized Equipment</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 text-sm font-medium text-gray-500">
                      Equipment
                    </th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">
                      Utilization
                    </th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">
                      Assignments
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analyticsData.equipmentMetrics.slice(0, 5).map((equipment: any) => (
                    <tr key={equipment.equipmentId} className="hover:bg-gray-50">
                      <td className="py-3 text-sm font-medium text-gray-900">
                        {equipment.equipmentName}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          equipment.utilizationRate > 80 
                            ? 'bg-red-100 text-red-800' 
                            : equipment.utilizationRate > 60 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {equipment.utilizationRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {equipment.totalAssignments}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          </>
        )}

        </div>
      </DashboardLayout>
    </RequireRole>
  );
}