'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_ENDPOINTS } from '@/config/api';
import { 
  ChartBarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  FireIcon,
  LockClosedIcon,
  DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Chart components
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
  Bar
} from 'recharts';

// Helper function to safely convert database numeric strings to numbers
const safeNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value));
  return isNaN(num) ? 0 : num;
};

// Types
interface SystemOverview {
  active_vendors: string;
  active_clients: string;
  total_equipment_instances: string;
  assigned_equipment: string;
  tickets_in_period: string;
  user_logins_in_period: string;
  assignment_rate_pct: string;
  user_distribution: { [key: string]: number };
}

interface ComplianceSummary {
  total_eq: string;
  compliant_eq: string;
  expired_eq: string;
  overdue_eq: string;
  compliance_rate_pct: string;
  vendors_below_80_pct: string;
  avg_lifespan_years: string;
}

interface TicketsOverview {
  total_tickets: number;
  open_tickets: number;
  high_priority_tickets: number;
  avg_resolution_hours: number;
}

interface SecuritySummary {
  locked_users: string;
  failed_logins_last_7d: string;
  suspicious_ips_24h: string;
}

interface UserTrend {
  week: string;
  logins: number;
  vendor_logins: number;
  client_logins: number;
  failed_attempts: number;
  password_resets: number;
}

interface PasswordReset {
  reason: string;
  count: number;
}

interface Vendor {
  id: number;
  company_name: string;
}

// Professional color palette
const CHART_COLORS = ['#E65100', '#059669', '#7C3AED', '#DC6D00', '#0891B2', '#64748B'];

export default function AdminAnalyticsPage() {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // Data state
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);
  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary | null>(null);
  const [ticketsOverview, setTicketsOverview] = useState<TicketsOverview | null>(null);
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);
  const [complianceTrend, setComplianceTrend] = useState<any[]>([]);
  const [ticketTrends, setTicketTrends] = useState<any[]>([]);
  const [equipmentCategories, setEquipmentCategories] = useState<any[]>([]);
  const [vendorRankings, setVendorRankings] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  
  // NEW: User & Security Analytics
  const [userTrends, setUserTrends] = useState<UserTrend[]>([]);
  const [passwordResets, setPasswordResets] = useState<PasswordReset[]>([]);
  
  // NEW: Vendor data for dropdown
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Filter states (ENHANCED with vendor filtering)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedVendor, setSelectedVendor] = useState<number | null>(null);

  // Initialize date filters and fetch vendors
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });

    // Fetch vendors for dropdown
    fetchVendors();
  }, []);

  // Fetch vendors for dropdown filter
  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(API_ENDPOINTS.VENDORS.LIST, { headers });
      if (response.ok) {
        const data = await response.json();
        setVendors(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  // ENHANCED: Fetch all analytics data with vendor filtering
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Build query params with date range and optional vendor filter
      const queryParams = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      if (selectedVendor) {
        queryParams.set('vendorId', selectedVendor.toString());
      }

      // Query params for vendor-filterable endpoints
      const vendorQueryParams = new URLSearchParams();
      if (selectedVendor) {
        vendorQueryParams.set('vendorId', selectedVendor.toString());
      }

      // Fetch all data in parallel - ENHANCED with vendor filtering and new endpoints
      const [
        overviewRes,
        complianceRes,
        ticketsOverviewRes,
        securityRes,
        complianceTrendRes,
        ticketTrendsRes,
        equipmentCategoriesRes,
        vendorRankingsRes,
        recentTicketsRes,
        auditEventsRes,
        userTrendsRes,
        passwordResetsRes
      ] = await Promise.all([
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.OVERVIEW}?${queryParams}`, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.COMPLIANCE.SUMMARY}?${vendorQueryParams}`, { headers }),
        fetch(API_ENDPOINTS.ADMIN_ANALYTICS.TICKETS.OVERVIEW, { headers }),
        fetch(API_ENDPOINTS.ADMIN_ANALYTICS.SECURITY.SUMMARY, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.COMPLIANCE.TREND}?${queryParams}`, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.TICKETS.TRENDS}?${queryParams}`, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.EQUIPMENT.CATEGORIES}?${vendorQueryParams}`, { headers }),
        fetch(API_ENDPOINTS.ADMIN_ANALYTICS.VENDORS.RANKINGS, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.TICKETS.RECENT_HIGH_PRIORITY}?${vendorQueryParams}`, { headers }),
        fetch(API_ENDPOINTS.ADMIN_ANALYTICS.AUDIT.RECENT, { headers }),
        // NEW: User & Security Analytics
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.USERS.TRENDS}?${new URLSearchParams({ startDate: dateRange.startDate, endDate: dateRange.endDate })}`, { headers }),
        fetch(API_ENDPOINTS.ADMIN_ANALYTICS.USERS.PASSWORD_RESETS, { headers })
      ]);

      // Check for critical errors (allow some to fail gracefully)
      if (!overviewRes.ok) throw new Error('Failed to fetch system overview');
      if (!complianceRes.ok) throw new Error('Failed to fetch compliance data');
      if (!ticketsOverviewRes.ok) throw new Error('Failed to fetch tickets overview');

      // Parse responses
      const [
        overviewData,
        complianceData,
        ticketsOverviewData,
        securityData,
        complianceTrendData,
        ticketTrendsData,
        equipmentCategoriesData,
        vendorRankingsData,
        recentTicketsData,
        auditEventsData,
        userTrendsData,
        passwordResetsData
      ] = await Promise.all([
        overviewRes.json(),
        complianceRes.json(),
        ticketsOverviewRes.json(),
        securityRes.json(),
        complianceTrendRes.json(),
        ticketTrendsRes.json(),
        equipmentCategoriesRes.json(),
        vendorRankingsRes.json(),
        recentTicketsRes.json(),
        auditEventsRes.json(),
        userTrendsRes.json(),
        passwordResetsRes.json()
      ]);

      // Set state
      setSystemOverview(overviewData.data);
      setComplianceSummary(complianceData.data);
      setTicketsOverview(ticketsOverviewData.data);
      setSecuritySummary(securityData.data);
      setComplianceTrend(complianceTrendData.data || []);
      setTicketTrends(ticketTrendsData.data || []);
      setEquipmentCategories(equipmentCategoriesData.data || []);
      setVendorRankings(vendorRankingsData.data || []);
      setRecentTickets(recentTicketsData.data || []);
      setAuditEvents(auditEventsData.data || []);
      // NEW: User & Security Analytics
      setUserTrends(userTrendsData.data || []);
      setPasswordResets(passwordResetsData.data || []);

    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when date range or selected vendor changes
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchAnalyticsData();
    }
  }, [dateRange, selectedVendor]);

  // Export to PDF functionality
  const exportToPDF = async () => {
    try {
      setExportingPDF(true);
      
      // Import jsPDF and autoTable plugin
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // Title and header
      doc.setFontSize(20);
      doc.text('Fire Guardian Analytics Report', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
      
      // Filter information
      let y = 40;
      doc.setFontSize(14);
      doc.text('Applied Filters:', 20, y);
      y += 10;
      
      doc.setFontSize(11);
      if (selectedVendor) {
        const vendor = vendors.find(v => v.id === selectedVendor);
        doc.text(`Vendor: ${vendor?.company_name || 'Unknown'}`, 20, y);
        y += 8;
      } else {
        doc.text('Vendor: All Vendors', 20, y);
        y += 8;
      }
      
      doc.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 20, y);
      y += 15;
      
      // System Overview KPIs
      doc.setFontSize(14);
      doc.text('System Overview', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      if (systemOverview) {
        doc.text(`Total Vendors: ${systemOverview.total_vendors || 0}`, 20, y);
        y += 6;
        doc.text(`Total Clients: ${systemOverview.total_clients || 0}`, 20, y);
        y += 6;
        doc.text(`Total Equipment: ${systemOverview.total_equipment || 0}`, 20, y);
        y += 6;
        doc.text(`Active Tickets: ${systemOverview.active_tickets || 0}`, 20, y);
        y += 6;
        doc.text(`User Logins (30d): ${systemOverview.user_logins_30d || 0}`, 20, y);
        y += 15;
      }
      
      // Compliance Status
      doc.setFontSize(14);
      doc.text('Compliance Status', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      if (complianceSummary) {
        doc.text(`Compliant Equipment: ${complianceSummary.compliant_equipment || 0}`, 20, y);
        y += 6;
        doc.text(`Non-Compliant Equipment: ${complianceSummary.non_compliant_equipment || 0}`, 20, y);
        y += 6;
        doc.text(`Compliance Rate: ${complianceSummary.compliance_rate}%`, 20, y);
        y += 6;
        doc.text(`Overdue Inspections: ${complianceSummary.overdue_inspections || 0}`, 20, y);
        y += 6;
      }
      
      y += 10;
      
      // Equipment Categories
      if (y < 200 && equipmentCategories && equipmentCategories.length > 0) {
        doc.setFontSize(14);
        doc.text('Equipment by Category', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        equipmentCategories.forEach(item => {
          doc.text(`${item.category}: ${item.count}`, 20, y);
          y += 6;
        });
        y += 10;
      }
      
      // Tickets Overview
      if (y < 220 && ticketsOverview) {
        doc.setFontSize(14);
        doc.text('Tickets Overview', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.text(`Total Tickets: ${ticketsOverview.total_tickets || 0}`, 20, y);
        y += 6;
        doc.text(`Open Tickets: ${ticketsOverview.open_tickets || 0}`, 20, y);
        y += 6;
        doc.text(`High Priority: ${ticketsOverview.high_priority_tickets || 0}`, 20, y);
        y += 6;
        doc.text(`Avg Resolution: ${Math.round(ticketsOverview.avg_resolution_hours || 0)}h`, 20, y);
        y += 10;
      }
      
      // Security Summary
      if (y < 240 && securitySummary) {
        doc.setFontSize(14);
        doc.text('Security Status', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.text(`Locked Users: ${securitySummary.locked_users || 0}`, 20, y);
        y += 6;
        doc.text(`Failed Logins (7d): ${securitySummary.failed_logins_last_7d || 0}`, 20, y);
        y += 6;
        doc.text(`Suspicious IPs (24h): ${securitySummary.suspicious_ips_24h || 0}`, 20, y);
        y += 10;
      }
      
      // Save the PDF
      const timestamp = new Date().toISOString().slice(0, 10);
      const vendorName = selectedVendor 
        ? vendors.find(v => v.id === selectedVendor)?.company_name || 'Unknown' 
        : 'All-Vendors';
      const filename = `Fire-Guardian-Report-${vendorName.replace(/\s+/g, '-')}-${timestamp}.pdf`;
      
      doc.save(filename);
      
      // Success notification
      alert(`Report generated successfully! File: ${filename}`);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Format data for charts
  const formatComplianceTrendForChart = (data: any[]) => {
    return data.map(item => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      'Compliance Rate %': safeNumber(item.compliance_rate_pct),
      'Total Equipment': safeNumber(item.total),
      'Compliant': safeNumber(item.compliant)
    }));
  };

  const formatTicketTrendsForChart = (data: any[]) => {
    return data.map(item => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      'Created': safeNumber(item.created),
      'Resolved': safeNumber(item.resolved),
      'High Priority': safeNumber(item.high_priority)
    }));
  };

  // NEW: Format user trends data for line chart
  const formatUserTrendsForChart = (data: UserTrend[]) => {
    return data.map(item => ({
      week: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'Total Logins': safeNumber(item.logins),
      'Vendor Logins': safeNumber(item.vendor_logins),
      'Client Logins': safeNumber(item.client_logins),
      'Failed Attempts': safeNumber(item.failed_attempts),
      'Password Resets': safeNumber(item.password_resets)
    }));
  };

  // NEW: Format password resets for pie chart
  const formatPasswordResetsForChart = (data: PasswordReset[]) => {
    return data.map((item, index) => ({
      name: item.reason,
      value: safeNumber(item.count),
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  };

  if (loading) {
    return (
      <RequireRole allowedRoles={['admin']}>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-64">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      </RequireRole>
    );
  }

  if (error) {
    return (
      <RequireRole allowedRoles={['admin']}>
        <DashboardLayout>
          <ErrorDisplay message={error} />
        </DashboardLayout>
      </RequireRole>
    );
  }

  return (
    <RequireRole allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="h-7 w-7 text-red-600 mr-3" />
                System Analytics & Reports
              </h1>
              <p className="text-gray-600 mt-1">Monitor system performance, compliance, and operational health</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportToPDF}
                disabled={exportingPDF}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingPDF ? (
                  <>
                    <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export PDF Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ENHANCED: Filters with Vendor Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center mb-4">
              <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Filters & Data Scope</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Filter
                </label>
                <select
                  value={selectedVendor || ''}
                  onChange={(e) => setSelectedVendor(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.company_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedVendor && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Filtered View:</span> Showing data for {vendors.find(v => v.id === selectedVendor)?.company_name} only.
                  Select "All Vendors" to view system-wide analytics.
                </p>
              </div>
            )}
          </div>

          {/* ENHANCED: System Overview KPIs with User Metrics */}
          {systemOverview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Vendors</p>
                    <p className="text-2xl font-bold text-gray-900">{systemOverview.active_vendors}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <UserGroupIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Clients</p>
                    <p className="text-2xl font-bold text-gray-900">{systemOverview.active_clients}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <FireIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                    <p className="text-2xl font-bold text-gray-900">{systemOverview.total_equipment_instances}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <WrenchScrewdriverIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tickets (Period)</p>
                    <p className="text-2xl font-bold text-gray-900">{systemOverview.tickets_in_period}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <LockClosedIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">User Logins</p>
                    <p className="text-2xl font-bold text-gray-900">{systemOverview.user_logins_in_period}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compliance & Tickets Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Summary */}
            {complianceSummary && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <ShieldCheckIcon className="h-6 w-6 text-red-600 mr-2" />
                  Compliance Overview
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{safeNumber(complianceSummary.compliance_rate_pct).toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Compliance Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{complianceSummary.vendors_below_80_pct}</div>
                    <div className="text-sm text-gray-600">Low Compliance Vendors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{complianceSummary.expired_eq}</div>
                    <div className="text-sm text-gray-600">Expired Equipment</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{complianceSummary.overdue_eq}</div>
                    <div className="text-sm text-gray-600">Overdue Equipment</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tickets Summary */}
            {ticketsOverview && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-red-600 mr-2" />
                  Tickets Overview
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{ticketsOverview.total_tickets}</div>
                    <div className="text-sm text-gray-600">Total Tickets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{ticketsOverview.open_tickets}</div>
                    <div className="text-sm text-gray-600">Open Tickets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{ticketsOverview.high_priority_tickets}</div>
                    <div className="text-sm text-gray-600">High Priority</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{safeNumber(ticketsOverview.avg_resolution_hours).toFixed(1)}h</div>
                    <div className="text-sm text-gray-600">Avg Resolution</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
                Compliance Trend
              </h2>
              {complianceTrend.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatComplianceTrendForChart(complianceTrend)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Compliance Rate %" stroke="#059669" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No trend data available</div>
              )}
            </div>

            {/* Ticket Trends */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-6 w-6 text-red-600 mr-2" />
                Ticket Trends
              </h2>
              {ticketTrends.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatTicketTrendsForChart(ticketTrends)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Created" stroke="#E65100" strokeWidth={2} />
                      <Line type="monotone" dataKey="Resolved" stroke="#059669" strokeWidth={2} />
                      <Line type="monotone" dataKey="High Priority" stroke="#DC2626" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No trend data available</div>
              )}
            </div>
          </div>

          {/* NEW: User & Security Trends Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Engagement Trends */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <UserGroupIcon className="h-6 w-6 text-indigo-600 mr-2" />
                User Engagement Trends
              </h2>
              {userTrends.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatUserTrendsForChart(userTrends)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Total Logins" stroke="#4F46E5" strokeWidth={2} />
                      <Line type="monotone" dataKey="Vendor Logins" stroke="#059669" strokeWidth={2} />
                      <Line type="monotone" dataKey="Client Logins" stroke="#DC6D00" strokeWidth={2} />
                      <Line type="monotone" dataKey="Failed Attempts" stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No user trend data available</div>
              )}
            </div>

            {/* Password Reset Reasons */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <LockClosedIcon className="h-6 w-6 text-amber-600 mr-2" />
                Password Reset Reasons
              </h2>
              {passwordResets.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formatPasswordResetsForChart(passwordResets)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {passwordResets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No password reset data available</div>
              )}
            </div>
          </div>

          {/* Equipment Categories */}
          {equipmentCategories.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FireIcon className="h-6 w-6 text-red-600 mr-2" />
                Equipment Categories
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={equipmentCategories.map(cat => ({
                        name: cat.equipment_type,
                        value: cat.instance_count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {equipmentCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Vendor Rankings */}
          {vendorRankings.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <BuildingOfficeIcon className="h-6 w-6 text-red-600 mr-2" />
                Top Vendor Performance
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Vendor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Clients</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Equipment</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Tickets</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorRankings.slice(0, 10).map((vendor, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{vendor.company_name}</td>
                        <td className="py-3 px-4 text-gray-600">{vendor.client_count}</td>
                        <td className="py-3 px-4 text-gray-600">{vendor.equipment_assigned}</td>
                        <td className="py-3 px-4 text-gray-600">{vendor.tickets_raised}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            vendor.avg_compliance_pct >= 80 
                              ? 'bg-green-100 text-green-800' 
                              : vendor.avg_compliance_pct >= 60 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {vendor.avg_compliance_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent High-Priority Tickets */}
          {recentTickets.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
                Recent High-Priority Tickets
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Ticket #</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Vendor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Client</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Equipment</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.slice(0, 10).map((ticket) => (
                      <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-blue-600">{ticket.ticket_number}</td>
                        <td className="py-3 px-4 text-gray-900">{ticket.vendor || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-900">{ticket.client || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-600">{ticket.equipment_name || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            ticket.ticket_status === 'open' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : ticket.ticket_status === 'resolved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.ticket_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{ticket.created}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Security Summary */}
          {securitySummary && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <LockClosedIcon className="h-6 w-6 text-red-600 mr-2" />
                Security Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{securitySummary.locked_users}</div>
                  <div className="text-sm text-gray-600">Locked Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{securitySummary.failed_logins_last_7d}</div>
                  <div className="text-sm text-gray-600">Failed Logins (7d)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{securitySummary.suspicious_ips_24h}</div>
                  <div className="text-sm text-gray-600">Suspicious IPs (24h)</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Audit Events */}
          {auditEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <DocumentMagnifyingGlassIcon className="h-6 w-6 text-red-600 mr-2" />
                Recent Audit Events
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Table</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Action</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">IP Address</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEvents.slice(0, 10).map((event, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{event.table_name}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            event.action_type === 'insert' 
                              ? 'bg-green-100 text-green-800' 
                              : event.action_type === 'update' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {event.action_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900">{event.changed_by || 'System'}</td>
                        <td className="py-3 px-4 text-gray-600 font-mono text-sm">{event.ip_address}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{event.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}