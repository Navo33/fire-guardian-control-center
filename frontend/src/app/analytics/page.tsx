'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  WrenchScrewdriverIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
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
} from 'recharts';

// Types for vendor analytics data
interface SystemMetrics {
  totalVendors: number;
  totalClients: number;
  totalEquipment: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTime?: number;
  criticalAlerts?: number;
  warningAlerts?: number;
  infoAlerts?: number;
}

interface TicketTrend {
  month: string;
  created_tickets: number;
  resolved_tickets: number;
  avg_resolution_hours: number;
}

interface ComplianceTrend {
  month: string;
  compliant: number;
  expired: number;
  overdue: number;
  compliant_pct: number;
}

interface ClientPerformanceData {
  company_name: string;
  ticket_count: number;
  avg_resolution_hours: number;
  client_id: number;
}

interface EquipmentHealthData {
  status: string;
  count: number;
  percentage: number;
}

interface VendorAnalyticsData {
  systemMetrics: SystemMetrics;
  ticketTrends: TicketTrend[];
  complianceTrends: ComplianceTrend[];
  clientPerformance: ClientPerformanceData[];
  equipmentHealth: EquipmentHealthData[];
}

interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  clientId?: number;
}

// Professional color palette
const CHART_COLORS = ['#E65100', '#059669', '#7C3AED', '#DC6D00', '#0891B2', '#64748B'];

const COLORS = {
  primary: '#E65100',     // Orange
  secondary: '#059669',   // Green
  accent: '#7C3AED',      // Purple
  warning: '#DC6D00',     // Orange
  danger: '#DC2626',      // Red
  info: '#0891B2',        // Cyan
  neutral: '#64748B',     // Slate
  success: '#16A34A'      // Green success
};

export default function VendorAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<VendorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Filter states
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: '',
    endDate: '',
    clientId: undefined
  });

  // Initialize date filters to last 90 days
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // 90 days from today

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
      if (filters.clientId) queryParams.append('clientId', filters.clientId.toString());

      const headers = getAuthHeaders();
      const url = `${API_ENDPOINTS.ANALYTICS.VENDOR}?${queryParams.toString()}`;
      
      logApiCall('GET', url);
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when filters change
  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchAnalyticsData();
    }
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AnalyticsFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Export to PDF functionality
  const exportToPDF = async () => {
    try {
      setExportingPDF(true);
      // TODO: Implement PDF export functionality
      console.log('PDF export functionality will be implemented');
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExportingPDF(false);
    }
  };

  // Format data for charts
  const formatTicketTrendsForChart = (trends: TicketTrend[]) => {
    return trends.map(trend => ({
      month: new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      'Created Tickets': trend.created_tickets,
      'Resolved Tickets': trend.resolved_tickets,
      'Avg Resolution Hours': parseFloat(trend.avg_resolution_hours.toFixed(1))
    }));
  };

  const formatComplianceTrendsForChart = (trends: ComplianceTrend[]) => {
    return trends.map(trend => ({
      month: new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      'Compliant %': trend.compliant_pct,
      Compliant: trend.compliant,
      Expired: trend.expired,
      Overdue: trend.overdue
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorDisplay message={error} />
      </DashboardLayout>
    );
  }

  return (
    <RequireRole allowedRoles={['vendor']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <ChartBarIcon className="h-7 w-7 text-orange-600 mr-3" />
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Monitor your performance, track trends, and analyze client relationships
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={exportToPDF}
                  disabled={exportingPDF}
                  className="btn-secondary flex items-center space-x-2"
                >
                  {exportingPDF ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  )}
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center mb-4">
              <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client (Optional)
                </label>
                <select
                  value={filters.clientId || ''}
                  onChange={(e) => handleFilterChange('clientId', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Clients</option>
                  {/* TODO: Add client options from API */}
                </select>
              </div>
            </div>
          </div>

          {analyticsData && (
            <>
              {/* Key Performance Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <WrenchScrewdriverIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                      <p className="text-2xl font-bold text-gray-900">{analyticsData.systemMetrics.totalTickets}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-50 rounded-xl">
                      <ClockIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                      <p className="text-2xl font-bold text-gray-900">{analyticsData.systemMetrics.openTickets}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-50 rounded-xl">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Resolved Tickets</p>
                      <p className="text-2xl font-bold text-gray-900">{analyticsData.systemMetrics.resolvedTickets}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <CalendarIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Resolution Time</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.systemMetrics.avgResolutionTime ? 
                          `${analyticsData.systemMetrics.avgResolutionTime.toFixed(1)}h` : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket Trends Chart */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <ChartBarIcon className="h-6 w-6 text-orange-600 mr-2" />
                  Ticket Trends
                </h2>
                {analyticsData.ticketTrends.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={formatTicketTrendsForChart(analyticsData.ticketTrends)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="Created Tickets" 
                          stroke={COLORS.primary} 
                          strokeWidth={2}
                          dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Resolved Tickets" 
                          stroke={COLORS.secondary} 
                          strokeWidth={2}
                          dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No ticket trend data available</p>
                  </div>
                )}
              </div>

              {/* Two Column Layout for Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Compliance Trends */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-2" />
                    Compliance Trends
                  </h2>
                  {analyticsData.complianceTrends.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={formatComplianceTrendsForChart(analyticsData.complianceTrends)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Compliant %" fill={COLORS.secondary} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No compliance data available</p>
                    </div>
                  )}
                </div>

                {/* Equipment Health */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-orange-600 mr-2" />
                    Equipment Health
                  </h2>
                  {analyticsData.equipmentHealth.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.equipmentHealth.map(item => ({
                              name: item.status,
                              value: item.count,
                              percentage: item.percentage
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name}: ${percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {analyticsData.equipmentHealth.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No equipment data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Performance Table */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <UserGroupIcon className="h-6 w-6 text-orange-600 mr-2" />
                  Top Client Performance
                </h2>
                {analyticsData.clientPerformance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Client</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Tickets</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Avg Resolution Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.clientPerformance.map((client, index) => (
                          <tr key={client.client_id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">{client.company_name}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{client.ticket_count}</td>
                            <td className="py-3 px-4 text-gray-600">
                              {client.avg_resolution_hours.toFixed(1)} hours
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No client performance data available</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}