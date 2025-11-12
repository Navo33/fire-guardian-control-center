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

  // Export to PDF functionality using React-PDF
  const exportToPDF = async () => {
    try {
      setExportingPDF(true);
      
      // Import React-PDF dependencies
      const { Document, Page, Text, View, StyleSheet, pdf, Font } = await import('@react-pdf/renderer');
      
      // Define styles for the PDF
      const styles = StyleSheet.create({
        page: {
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          padding: 30,
          fontFamily: 'Helvetica'
        },
        header: {
          backgroundColor: '#1e40af',
          color: 'white',
          padding: 20,
          marginBottom: 20,
          borderRadius: 5
        },
        title: {
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 8
        },
        subtitle: {
          fontSize: 12,
          marginBottom: 4
        },
        section: {
          marginBottom: 20
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#1e40af',
          marginBottom: 10,
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: 5
        },
        kpiContainer: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginBottom: 15
        },
        kpiBox: {
          width: '30%',
          marginRight: '5%',
          marginBottom: 10,
          padding: 10,
          border: '1px solid #e5e7eb',
          borderRadius: 5,
          textAlign: 'center'
        },
        kpiValue: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#1e40af',
          marginBottom: 4
        },
        kpiLabel: {
          fontSize: 10,
          color: '#6b7280'
        },
        table: {
          display: 'table',
          width: 'auto',
          borderStyle: 'solid',
          borderWidth: 1,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderColor: '#e5e7eb'
        },
        tableRow: {
          margin: 'auto',
          flexDirection: 'row'
        },
        tableColHeader: {
          width: '20%',
          borderStyle: 'solid',
          borderWidth: 1,
          borderLeftWidth: 0,
          borderTopWidth: 0,
          borderColor: '#e5e7eb',
          backgroundColor: '#ef4444',
          padding: 8
        },
        tableCol: {
          width: '20%',
          borderStyle: 'solid',
          borderWidth: 1,
          borderLeftWidth: 0,
          borderTopWidth: 0,
          borderColor: '#e5e7eb',
          padding: 8
        },
        tableCellHeader: {
          fontSize: 10,
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center'
        },
        tableCell: {
          fontSize: 8,
          color: '#374151'
        },
        criticalSection: {
          backgroundColor: '#fef2f2',
          padding: 15,
          borderLeft: '4px solid #ef4444',
          marginBottom: 15
        },
        criticalTitle: {
          fontSize: 14,
          fontWeight: 'bold',
          color: '#dc2626',
          marginBottom: 8
        },
        criticalText: {
          fontSize: 10,
          color: '#7f1d1d',
          marginBottom: 10
        },
        upcomingSection: {
          backgroundColor: '#fffbeb',
          padding: 15,
          borderLeft: '4px solid #f59e0b',
          marginBottom: 15
        },
        upcomingTitle: {
          fontSize: 14,
          fontWeight: 'bold',
          color: '#d97706',
          marginBottom: 8
        },
        footer: {
          position: 'absolute',
          bottom: 30,
          left: 30,
          right: 30,
          borderTop: '1px solid #e5e7eb',
          paddingTop: 10
        },
        footerText: {
          fontSize: 8,
          color: '#6b7280',
          textAlign: 'center',
          marginBottom: 4
        }
      });

      // Create PDF Document Component
      const PDFDocument = () => (
        <Document>
          <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Fire Safety Analytics Report</Text>
              <Text style={styles.subtitle}>
                Generated: {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <Text style={styles.subtitle}>
                Report Period: {dateRange.startDate} to {dateRange.endDate}
              </Text>
            </View>

            {/* Executive Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Executive Summary</Text>
              {clientOverview && (
                <View style={styles.kpiContainer}>
                  <View style={styles.kpiBox}>
                    <Text style={styles.kpiValue}>{clientOverview.total_assigned}</Text>
                    <Text style={styles.kpiLabel}>Total Equipment</Text>
                  </View>
                  <View style={styles.kpiBox}>
                    <Text style={styles.kpiValue}>{clientOverview.compliance_rate_pct}%</Text>
                    <Text style={styles.kpiLabel}>Compliance Rate</Text>
                  </View>
                  <View style={styles.kpiBox}>
                    <Text style={styles.kpiValue}>{clientOverview.compliant}</Text>
                    <Text style={styles.kpiLabel}>Compliant Units</Text>
                  </View>
                  <View style={styles.kpiBox}>
                    <Text style={styles.kpiValue}>{clientOverview.open_requests}</Text>
                    <Text style={styles.kpiLabel}>Open Requests</Text>
                  </View>
                  <View style={styles.kpiBox}>
                    <Text style={styles.kpiValue}>{clientOverview.unread_notifications}</Text>
                    <Text style={styles.kpiLabel}>Notifications</Text>
                  </View>
                  <View style={styles.kpiBox}>
                    <Text style={styles.kpiValue}>{clientOverview.upcoming_events}</Text>
                    <Text style={styles.kpiLabel}>Upcoming Events</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Compliance Status Overview */}
            {equipmentStatus.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Compliance Overview</Text>
                {equipmentStatus.map((status: EquipmentStatus, index: number) => (
                  <Text key={index} style={{ fontSize: 10, marginBottom: 4 }}>
                    • {status.status.replace('_', ' ').toUpperCase()}: {status.count} units
                  </Text>
                ))}
              </View>
            )}

            {/* Critical Non-Compliant Equipment */}
            {nonCompliantEquipment.length > 0 && (
              <View style={styles.criticalSection}>
                <Text style={styles.criticalTitle}>⚠ Critical: Non-Compliant Equipment</Text>
                <Text style={styles.criticalText}>
                  IMMEDIATE ACTION REQUIRED - Contact your fire safety vendor
                </Text>
                
                <View style={styles.table}>
                  {/* Table Header */}
                  <View style={styles.tableRow}>
                    <View style={styles.tableColHeader}>
                      <Text style={styles.tableCellHeader}>Equipment</Text>
                    </View>
                    <View style={styles.tableColHeader}>
                      <Text style={styles.tableCellHeader}>Serial #</Text>
                    </View>
                    <View style={styles.tableColHeader}>
                      <Text style={styles.tableCellHeader}>Location</Text>
                    </View>
                    <View style={styles.tableColHeader}>
                      <Text style={styles.tableCellHeader}>Status</Text>
                    </View>
                    <View style={styles.tableColHeader}>
                      <Text style={styles.tableCellHeader}>Due Date</Text>
                    </View>
                  </View>

                  {/* Table Rows */}
                  {nonCompliantEquipment.slice(0, 8).map((equipment, index) => (
                    <View key={index} style={styles.tableRow}>
                      <View style={styles.tableCol}>
                        <Text style={styles.tableCell}>{equipment.equipment_name || 'N/A'}</Text>
                      </View>
                      <View style={styles.tableCol}>
                        <Text style={styles.tableCell}>{equipment.serial_number || 'N/A'}</Text>
                      </View>
                      <View style={styles.tableCol}>
                        <Text style={styles.tableCell}>{equipment.location || 'N/A'}</Text>
                      </View>
                      <View style={styles.tableCol}>
                        <Text style={styles.tableCell}>{equipment.compliance_status || 'Unknown'}</Text>
                      </View>
                      <View style={styles.tableCol}>
                        <Text style={styles.tableCell}>
                          {equipment.next_maintenance || equipment.expiry_date || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <View style={styles.upcomingSection}>
                <Text style={styles.upcomingTitle}>📅 Upcoming Inspections & Maintenance</Text>
                <Text style={{ fontSize: 10, marginBottom: 10, color: '#92400e' }}>
                  Plan ahead to maintain compliance and avoid emergency situations
                </Text>

                {upcomingEvents.slice(0, 8).map((event, index) => (
                  <Text key={index} style={{ fontSize: 9, marginBottom: 3, color: '#451a03' }}>
                    • {event.type || 'Maintenance'}: {event.title || 'N/A'} - 
                    Due: {event.date || 'N/A'} ({event.days_until || 0} days)
                  </Text>
                ))}
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Fire Guardian Control Center</Text>
              <Text style={styles.footerText}>
                This report is generated for compliance and insurance documentation purposes.
              </Text>
              <Text style={styles.footerText}>
                Please contact your fire safety vendor immediately for any non-compliant items requiring attention.
              </Text>
              <Text style={styles.footerText}>
                Report generated on: {new Date().toLocaleString()}
              </Text>
            </View>
          </Page>
        </Document>
      );

      // Generate and download PDF
      const blob = await pdf(<PDFDocument />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Fire-Safety-Analytics-Report-${timestamp}.pdf`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Success notification
      alert(`🔥 Fire Safety Analytics Report Generated Successfully!\n\nFile: ${filename}\n\n✅ Professional compliance report with:\n• Executive summary & KPIs\n• Equipment compliance status\n• Critical action items\n• Upcoming maintenance schedule\n\nThis report is suitable for insurance and regulatory documentation.`);
      
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
          <div className="flex flex-col items-center justify-center min-h-96 bg-white rounded-2xl border border-gray-100 m-6">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600 font-medium">Loading analytics data...</p>
            <p className="text-sm text-gray-400 mt-1">Please wait while we gather your fire safety insights</p>
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
        <div className="space-y-6 p-6 analytics-dashboard" data-pdf-content>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-8 w-8 text-gray-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Compliance</h1>
                <p className="text-gray-600">Monitor equipment compliance, track service requests, and stay safe</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportToPDF}
                disabled={exportingPDF}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              >
                {exportingPDF ? (
                  <>
                    <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Export Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center mb-6">
              <FunnelIcon className="h-6 w-6 text-red-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Filters & Time Range</h2>
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Type
                </label>
                <select
                  value={selectedEquipmentType || ''}
                  onChange={(e) => setSelectedEquipmentType(e.target.value || null)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
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
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FireIcon className="h-6 w-6 text-red-600 mr-3" />
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
                        label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                <div className="text-center py-12">
                  <FireIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No equipment data available</p>
                  <p className="text-sm text-gray-400 mt-1">Data will appear here once equipment is added</p>
                </div>
              )}
            </div>

            {/* Compliance Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <ChartBarIcon className="h-6 w-6 text-red-600 mr-3" />
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
                <div className="text-center py-12">
                  <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No trend data available</p>
                  <p className="text-sm text-gray-400 mt-1">Compliance trends will appear after data collection</p>
                </div>
              )}
            </div>
          </div>

          {/* Compliance by Equipment Type */}
          {complianceByType.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                  <h2 className="text-xl font-semibold text-red-900">
                    ⚠️ Action Required: Non-Compliant Equipment
                  </h2>
                </div>
                <button
                  className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                >
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  Contact Vendor
                </button>
              </div>
              <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-100 border-b border-red-200">
                      <tr>
                        <th className="text-left py-4 px-6 font-semibold text-red-900">Equipment</th>
                        <th className="text-left py-4 px-6 font-semibold text-red-900">Serial Number</th>
                        <th className="text-left py-4 px-6 font-semibold text-red-900">Location</th>
                        <th className="text-left py-4 px-6 font-semibold text-red-900">Status</th>
                        <th className="text-left py-4 px-6 font-semibold text-red-900">Due Date</th>
                        <th className="text-left py-4 px-6 font-semibold text-red-900">Days Until</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {nonCompliantEquipment.slice(0, 10).map((equipment, index) => (
                        <tr key={index} className="hover:bg-red-25 transition-colors">
                          <td className="py-4 px-6 font-medium text-gray-900">{equipment.equipment_name}</td>
                          <td className="py-4 px-6 text-gray-700 font-mono text-sm">{equipment.serial_number}</td>
                          <td className="py-4 px-6 text-gray-700">{equipment.location}</td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(equipment.compliance_status)}`}>
                              {equipment.compliance_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-700">{equipment.next_maintenance || equipment.expiry_date}</td>
                          <td className="py-4 px-6 font-semibold text-red-700">
                            {equipment.days_until_maintenance || equipment.days_until_expiry} days
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Events Calendar */}
          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <CalendarIcon className="h-6 w-6 text-red-600 mr-3" />
                Upcoming Maintenance & Events (Next 30 Days)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.slice(0, 9).map((event, index) => (
                  <div key={index} className={`p-5 rounded-xl border transition-all hover:shadow-md ${
                    parseInt(event.days_until) <= 7 
                      ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                      : parseInt(event.days_until) <= 14 
                      ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' 
                      : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                        <p className="text-sm text-gray-600 mb-1">{event.location}</p>
                        <p className="text-sm text-gray-500">{event.date}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ml-3 ${
                        parseInt(event.days_until) <= 7 
                          ? 'bg-red-100 text-red-800 border border-red-200' 
                          : parseInt(event.days_until) <= 14 
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {event.days_until} days
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 capitalize bg-white px-2 py-1 rounded-md border">
                        {event.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Requests and Account Security */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Request Trends */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <WrenchScrewdriverIcon className="h-6 w-6 text-red-600 mr-3" />
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
                <div className="text-center py-12">
                  <WrenchScrewdriverIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No service request data available</p>
                  <p className="text-sm text-gray-400 mt-1">Activity trends will display when requests are submitted</p>
                </div>
              )}
            </div>

            {/* Account Security */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <LockClosedIcon className="h-6 w-6 text-red-600 mr-3" />
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
                <div className="text-center py-12">
                  <LockClosedIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No login activity data available</p>
                  <p className="text-sm text-gray-400 mt-1">Account activity will be tracked going forward</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Notifications */}
          {recentNotifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <BellIcon className="h-6 w-6 text-red-600 mr-3" />
                Recent Notifications
              </h2>
              <div className="space-y-4">
                {recentNotifications.slice(0, 5).map((notification, index) => (
                  <div key={index} className={`p-5 rounded-xl border transition-all hover:shadow-md ${
                    !notification.is_read 
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                          {!notification.is_read && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-3">{notification.created_at}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ml-4 ${
                        notification.priority === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : notification.priority === 'medium' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {notification.priority.toUpperCase()}
                      </span>
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