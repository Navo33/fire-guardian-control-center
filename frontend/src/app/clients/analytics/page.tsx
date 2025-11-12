'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_BASE_URL } from '@/config/api';
import { 
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  FireIcon,
  BellIcon,
  CalendarIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  LockClosedIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

// Recharts components
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

// Helper function to safely convert values to numbers
const safeNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value));
  return isNaN(num) ? 0 : num;
};

// Interface definitions for client analytics data
interface ClientOverview {
  total_assigned: string;
  compliant: string;
  compliance_rate_pct: string;
  open_requests: string;
  upcoming_events: string;
  unread_notifications: string;
}

interface EquipmentStatus {
  status: string;
  count: number;
}

interface ComplianceTrend {
  month: string;
  total: number;
  compliant: number;
  compliance_rate_pct: number;
}

interface ComplianceByType {
  equipment_type: string;
  total: number;
  compliant: number;
  due_soon: number;
  overdue: number;
  expired: number;
  compliance_rate_pct: number;
}

interface RequestTrend {
  month: string;
  submitted: number;
  resolved: number;
  high_priority: number;
  avg_resolution_days: number;
}

interface RequestByType {
  support_type: string;
  count: number;
}

interface NonCompliantEquipment {
  equipment_name: string;
  serial_number: string;
  location: string;
  compliance_status: string;
  next_maintenance: string;
  days_until_maintenance: string;
  expiry_date: string;
  days_until_expiry: string;
}

interface UpcomingEvent {
  type: string;
  title: string;
  date: string;
  days_until: string;
  location: string;
}

interface RecentNotification {
  title: string;
  message: string;
  priority: string;
  created_at: string;
  is_read: boolean;
}

interface LoginHistory {
  week: string;
  sessions: number;
  external_logins: number;
}

// Professional color palette with client-friendly colors
const CHART_COLORS = ['#059669', '#E65100', '#DC2626', '#7C3AED', '#0891B2', '#64748B'];
const COMPLIANCE_COLORS = {
  compliant: '#059669',
  due_soon: '#F59E0B',
  overdue: '#EF4444', 
  expired: '#DC2626'
};

export default function ClientAnalyticsPage() {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // Get client ID from localStorage (set during login)
  const [clientId, setClientId] = useState<number | null>(null);

  // Data state
  const [clientOverview, setClientOverview] = useState<ClientOverview | null>(null);
  const [equipmentStatus, setEquipmentStatus] = useState<EquipmentStatus[]>([]);
  const [complianceTrend, setComplianceTrend] = useState<ComplianceTrend[]>([]);
  const [complianceByType, setComplianceByType] = useState<ComplianceByType[]>([]);
  const [requestTrends, setRequestTrends] = useState<RequestTrend[]>([]);
  const [requestsByType, setRequestsByType] = useState<RequestByType[]>([]);
  const [nonCompliantEquipment, setNonCompliantEquipment] = useState<NonCompliantEquipment[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);

  // Filter states
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string | null>(null);

  // Equipment types for filter
  const equipmentTypes = ['extinguisher', 'alarm', 'sprinkler', 'emergency_lighting', 'other'];

  // Initialize date filters and client ID
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // Default to last 90 days

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });

    // Get client ID from user info
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.user_type === 'client') {
          setClientId(user.id); // Use user.id for client users
        } else {
          setError('Access denied: Client access required');
        }
      } catch (e) {
        setError('Unable to determine client access');
      }
    } else {
      setError('Authentication required');
    }
  }, []);

  // Fetch analytics data when filters change
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchAnalyticsData();
    }
  }, [dateRange, selectedEquipmentType]);

  const fetchAnalyticsData = async () => {

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      console.log('Using token:', token);       
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Build query params for endpoints that need date range
      const dateParams = new URLSearchParams({
        start: dateRange.startDate,
        end: dateRange.endDate
      });

      if (selectedEquipmentType) {
        dateParams.set('equipment_type', selectedEquipmentType);
      }

      // Fetch all data in parallel
      console.log('Fetching client analytics data for client:', clientId);

      const [
        overviewRes,
        equipmentStatusRes,
        complianceTrendRes,
        complianceByTypeRes,
        requestTrendsRes,
        requestsByTypeRes,
        nonCompliantRes,
        upcomingEventsRes,
        notificationsRes,
        loginHistoryRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/client/analytics/overview?${dateParams}`, { headers }),
        fetch(`${API_BASE_URL}/client/analytics/equipment/status`, { headers }),
        fetch(`${API_BASE_URL}/client/analytics/compliance/trend?${dateParams}`, { headers }),
        fetch(`${API_BASE_URL}/client/analytics/compliance/by-type`, { headers }),
        fetch(`${API_BASE_URL}/client/analytics/requests/trend?${dateParams}`, { headers }),
        fetch(`${API_BASE_URL}/client/analytics/requests/by-type`, { headers }),
        fetch(`${API_BASE_URL}/client/analytics/equipment/non-compliant`, { headers }),
        fetch(`${API_BASE_URL}/client/analytics/events/upcoming`, { headers }),
        fetch(`${API_BASE_URL}/client/analytics/notifications/recent`, { headers }),
        fetch(`${API_BASE_URL}/client/analytics/account/logins?${dateParams}`, { headers })
      ]);

      console.log('API response statuses:', {
        overview: overviewRes.status,
        equipmentStatus: equipmentStatusRes.status,
        complianceTrend: complianceTrendRes.status,
        complianceByType: complianceByTypeRes.status,
        requestTrends: requestTrendsRes.status,
        requestsByType: requestsByTypeRes.status,
        nonCompliant: nonCompliantRes.status,
        upcomingEvents: upcomingEventsRes.status,
        notifications: notificationsRes.status,
        loginHistory: loginHistoryRes.status
      });

      // Parse responses
      const [
        overviewData,
        equipmentStatusData,
        complianceTrendData,
        complianceByTypeData,
        requestTrendsData,
        requestsByTypeData,
        nonCompliantData,
        upcomingEventsData,
        notificationsData,
        loginHistoryData
      ] = await Promise.all([
        overviewRes.ok ? overviewRes.json() : { data: null },
        equipmentStatusRes.ok ? equipmentStatusRes.json() : { data: [] },
        complianceTrendRes.ok ? complianceTrendRes.json() : { data: [] },
        complianceByTypeRes.ok ? complianceByTypeRes.json() : { data: [] },
        requestTrendsRes.ok ? requestTrendsRes.json() : { data: [] },
        requestsByTypeRes.ok ? requestsByTypeRes.json() : { data: [] },
        nonCompliantRes.ok ? nonCompliantRes.json() : { data: [] },
        upcomingEventsRes.ok ? upcomingEventsRes.json() : { data: [] },
        notificationsRes.ok ? notificationsRes.json() : { data: [] },
        loginHistoryRes.ok ? loginHistoryRes.json() : { data: [] }
      ]);

      // Set state
      setClientOverview(overviewData.data);
      setEquipmentStatus(equipmentStatusData.data || []);
      setComplianceTrend(complianceTrendData.data || []);
      setComplianceByType(complianceByTypeData.data || []);
      setRequestTrends(requestTrendsData.data || []);
      setRequestsByType(requestsByTypeData.data || []);
      setNonCompliantEquipment(nonCompliantData.data || []);
      setUpcomingEvents(upcomingEventsData.data || []);
      setRecentNotifications(notificationsData.data || []);
      setLoginHistory(loginHistoryData.data || []);

    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

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
      doc.text('Fire Safety Compliance Report', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text(`Report Period: ${dateRange.startDate} to ${dateRange.endDate}`, 20, 40);
      
      let y = 55;
      
      // Client Overview
      if (clientOverview) {
        doc.setFontSize(14);
        doc.text('Safety Overview', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.text(`Total Equipment: ${clientOverview.total_assigned}`, 20, y);
        y += 6;
        doc.text(`Compliant Equipment: ${clientOverview.compliant}`, 20, y);
        y += 6;
        doc.text(`Compliance Rate: ${clientOverview.compliance_rate_pct}%`, 20, y);
        y += 6;
        doc.text(`Open Service Requests: ${clientOverview.open_requests}`, 20, y);
        y += 6;
        doc.text(`Upcoming Events: ${clientOverview.upcoming_events}`, 20, y);
        y += 15;
      }
      
      // Non-Compliant Equipment (Critical for insurance/compliance)
      if (nonCompliantEquipment.length > 0 && y < 200) {
        doc.setFontSize(14);
        doc.text('Non-Compliant Equipment (Action Required)', 20, y);
        y += 10;
        
        const tableData = nonCompliantEquipment.slice(0, 10).map(eq => [
          eq.equipment_name,
          eq.serial_number,
          eq.location,
          eq.compliance_status,
          eq.next_maintenance || eq.expiry_date
        ]);
        
        // @ts-expect-error jsPDF autoTable plugin types not available
        doc.autoTable({
          startY: y,
          head: [['Equipment', 'Serial', 'Location', 'Status', 'Due Date']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 53, 69] } // Red for non-compliant items
        });
        
        // @ts-expect-error jsPDF autoTable plugin types not available
        y = doc.lastAutoTable.finalY + 15;
      }
      
      // Upcoming Events
      if (upcomingEvents.length > 0 && y < 240) {
        doc.setFontSize(14);
        doc.text('Upcoming Maintenance & Expiry Events', 20, y);
        y += 10;
        
        const eventsData = upcomingEvents.slice(0, 8).map(event => [
          event.type,
          event.title,
          event.date,
          event.days_until + ' days',
          event.location
        ]);
        
        // @ts-expect-error jsPDF autoTable plugin types not available
        doc.autoTable({
          startY: y,
          head: [['Type', 'Equipment', 'Date', 'Days Until', 'Location']],
          body: eventsData,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [245, 158, 11] } // Amber for upcoming events
        });
      }
      
      // Compliance note for insurance/regulatory purposes
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.text('This report is generated for compliance and insurance documentation purposes.', 20, pageHeight - 20);
      doc.text('Please contact your fire safety vendor for any non-compliant items requiring attention.', 20, pageHeight - 15);
      
      // Save the PDF
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Fire-Safety-Compliance-Report-${timestamp}.pdf`;
      
      doc.save(filename);
      
      // Success notification
      alert(`Compliance report generated successfully! File: ${filename}`);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error generating compliance report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Format data for charts
  const formatComplianceTrendForChart = (data: ComplianceTrend[]) => {
    return data.map(item => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      'Compliance %': safeNumber(item.compliance_rate_pct),
      'Total Equipment': safeNumber(item.total),
      'Compliant': safeNumber(item.compliant)
    }));
  };

  const formatRequestTrendsForChart = (data: RequestTrend[]) => {
    return data.map(item => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      'Submitted': safeNumber(item.submitted),
      'Resolved': safeNumber(item.resolved),
      'High Priority': safeNumber(item.high_priority)
    }));
  };

  const formatLoginHistoryForChart = (data: LoginHistory[]) => {
    return data.map(item => ({
      week: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      'Sessions': safeNumber(item.sessions),
      'External Logins': safeNumber(item.external_logins)
    }));
  };

  // Status colors for equipment
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant': return 'text-green-600';
      case 'due_soon': return 'text-yellow-600';
      case 'overdue': return 'text-red-600';
      case 'expired': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'due_soon': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <RequireRole allowedRoles={['client']}>
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
      <RequireRole allowedRoles={['client']}>
        <DashboardLayout>
          <ErrorDisplay message={error} />
        </DashboardLayout>
      </RequireRole>
    );
  }

  return (
    <RequireRole allowedRoles={['client']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ShieldCheckIcon className="h-7 w-7 text-red-600 mr-3" />
                Fire Safety Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Monitor compliance, track service requests, and stay safe</p>
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
                    Generating...
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Export Compliance Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center mb-4">
              <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Filters & Time Range</h2>
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
                  Equipment Type
                </label>
                <select
                  value={selectedEquipmentType || ''}
                  onChange={(e) => setSelectedEquipmentType(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All Equipment Types</option>
                  {equipmentTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Overview KPIs */}
          {clientOverview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FireIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                    <p className="text-xl font-bold text-gray-900">{clientOverview.total_assigned}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Compliant</p>
                    <p className="text-xl font-bold text-green-700">{clientOverview.compliant}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                    <p className="text-xl font-bold text-green-700">{safeNumber(clientOverview.compliance_rate_pct).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <WrenchScrewdriverIcon className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Open Requests</p>
                    <p className="text-xl font-bold text-yellow-700">{clientOverview.open_requests}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                    <p className="text-xl font-bold text-orange-700">{clientOverview.upcoming_events}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <BellIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Notifications</p>
                    <p className="text-xl font-bold text-indigo-700">{clientOverview.unread_notifications}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Equipment Status Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Equipment Status Pie Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FireIcon className="h-6 w-6 text-red-600 mr-2" />
                Equipment Status Overview
              </h2>
              {equipmentStatus.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={equipmentStatus.map(item => ({
                          name: item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                          value: item.count,
                          color: COMPLIANCE_COLORS[item.status as keyof typeof COMPLIANCE_COLORS] || '#64748B'
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {equipmentStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COMPLIANCE_COLORS[entry.status as keyof typeof COMPLIANCE_COLORS] || '#64748B'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No equipment data available</div>
              )}
            </div>

            {/* Compliance Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-6 w-6 text-red-600 mr-2" />
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
                      <Line type="monotone" dataKey="Compliance %" stroke="#059669" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No trend data available</div>
              )}
            </div>
          </div>

          {/* Compliance by Equipment Type */}
          {complianceByType.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
                Compliance Status by Equipment Type
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="equipment_type" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="compliant" stackId="a" fill="#059669" name="Compliant" />
                    <Bar dataKey="due_soon" stackId="a" fill="#F59E0B" name="Due Soon" />
                    <Bar dataKey="overdue" stackId="a" fill="#EF4444" name="Overdue" />
                    <Bar dataKey="expired" stackId="a" fill="#DC2626" name="Expired" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Critical Alerts - Non-Compliant Equipment */}
          {nonCompliantEquipment.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
                <h2 className="text-xl font-semibold text-red-900">
                  ⚠️ Action Required: Non-Compliant Equipment
                </h2>
                <button
                  className="ml-auto inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                >
                  <PhoneIcon className="h-4 w-4 mr-1" />
                  Contact Vendor
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-red-200">
                      <th className="text-left py-3 px-4 font-semibold text-red-900">Equipment</th>
                      <th className="text-left py-3 px-4 font-semibold text-red-900">Serial Number</th>
                      <th className="text-left py-3 px-4 font-semibold text-red-900">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-red-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-red-900">Due Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-red-900">Days Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonCompliantEquipment.slice(0, 10).map((equipment, index) => (
                      <tr key={index} className="border-b border-red-100 hover:bg-red-25">
                        <td className="py-3 px-4 font-medium text-red-900">{equipment.equipment_name}</td>
                        <td className="py-3 px-4 text-red-800 font-mono text-sm">{equipment.serial_number}</td>
                        <td className="py-3 px-4 text-red-800">{equipment.location}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(equipment.compliance_status)}`}>
                            {equipment.compliance_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-red-800">{equipment.next_maintenance || equipment.expiry_date}</td>
                        <td className="py-3 px-4 text-red-800 font-semibold">
                          {equipment.days_until_maintenance || equipment.days_until_expiry} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upcoming Events Calendar */}
          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <CalendarIcon className="h-6 w-6 text-red-600 mr-2" />
                Upcoming Maintenance & Events (Next 30 Days)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.slice(0, 9).map((event, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    parseInt(event.days_until) <= 7 
                      ? 'border-red-500 bg-red-50' 
                      : parseInt(event.days_until) <= 14 
                      ? 'border-yellow-500 bg-yellow-50' 
                      : 'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{event.title}</p>
                        <p className="text-sm text-gray-600">{event.location}</p>
                        <p className="text-sm text-gray-500">{event.date}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-bold rounded ${
                        parseInt(event.days_until) <= 7 
                          ? 'bg-red-100 text-red-800' 
                          : parseInt(event.days_until) <= 14 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {event.days_until} days
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 capitalize">{event.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Requests and Account Security */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Request Trends */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <WrenchScrewdriverIcon className="h-6 w-6 text-red-600 mr-2" />
                Service Request Activity
              </h2>
              {requestTrends.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatRequestTrendsForChart(requestTrends)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Submitted" stroke="#E65100" strokeWidth={2} />
                      <Line type="monotone" dataKey="Resolved" stroke="#059669" strokeWidth={2} />
                      <Line type="monotone" dataKey="High Priority" stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No service request data available</div>
              )}
            </div>

            {/* Account Security */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <LockClosedIcon className="h-6 w-6 text-red-600 mr-2" />
                Account Activity
              </h2>
              {loginHistory.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatLoginHistoryForChart(loginHistory)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Sessions" stroke="#4F46E5" strokeWidth={2} />
                      <Line type="monotone" dataKey="External Logins" stroke="#DC6D00" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No login activity data available</div>
              )}
            </div>
          </div>

          {/* Recent Notifications */}
          {recentNotifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <BellIcon className="h-6 w-6 text-red-600 mr-2" />
                Recent Notifications
              </h2>
              <div className="space-y-3">
                {recentNotifications.slice(0, 5).map((notification, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">{notification.created_at}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          notification.priority === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : notification.priority === 'medium' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {notification.priority}
                        </span>
                        {!notification.is_read && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}