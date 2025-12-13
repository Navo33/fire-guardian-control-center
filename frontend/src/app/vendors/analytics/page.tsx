'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_BASE_URL } from '@/config/api';
import { 
  ChartBarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FireIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  LockClosedIcon,
  DocumentMagnifyingGlassIcon
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

// Interface definitions
interface VendorOverview {
  active_clients: string;
  total_assigned: string;
  open_tickets: string;
  resolved_in_period: string;
  avg_resolution_hours: string;
  compliance_rate_pct: string;
}

interface ClientCompliance {
  client: string;
  total_equipment: number;
  compliant: number;
  due_soon: number;
  overdue: number;
  expired: number;
  compliance_rate_pct: number;
}

interface ComplianceTrend {
  month: string;
  total: number;
  compliant: number;
  compliance_rate_pct: number;
}

interface TicketTrend {
  month: string;
  created: number;
  resolved: number;
  high_priority: number;
  avg_resolution_hours: number;
}

interface TicketsByType {
  support_type: string;
  count: number;
  high_priority: number;
}

interface ClientRanking {
  company_name: string;
  equipment_count: number;
  tickets_raised: number;
  compliance_pct: number;
  last_ticket_date: string | null;
}

interface EquipmentCategory {
  equipment_type: string;
  instance_count: number;
}

interface HighRiskEquipment {
  serial_number: string;
  client: string;
  equipment_name: string;
  compliance_status: string;
  next_maintenance: string;
  days_until_maintenance: string;
}

interface TechnicianPerformance {
  technician: string;
  tickets_handled: number;
  resolved: number;
  avg_resolution_hours: number;
}

interface UserLoginTrend {
  week: string;
  logins: number;
  failed_attempts: number;
}

interface PasswordReset {
  reason: string;
  count: number;
}

interface VendorAudit {
  table_name: string;
  action_type: string;
  changed_by: string;
  ip_address: string;
  timestamp: string;
}

interface Client {
  id: number;
  company_name: string;
}

interface EquipmentType {
  equipment_type: string;
}

// Professional color palette for vendor dashboard
const VENDOR_COLORS = ['#1E40AF', '#059669', '#DC6D00', '#7C3AED', '#E65100', '#0891B2'];

export default function VendorAnalyticsPage() {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [reportClientId, setReportClientId] = useState<number | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Data state
  const [vendorOverview, setVendorOverview] = useState<VendorOverview | null>(null);
  const [clientCompliance, setClientCompliance] = useState<ClientCompliance[]>([]);
  const [complianceTrend, setComplianceTrend] = useState<ComplianceTrend[]>([]);
  const [ticketTrends, setTicketTrends] = useState<TicketTrend[]>([]);
  const [ticketsByType, setTicketsByType] = useState<TicketsByType[]>([]);
  const [clientRankings, setClientRankings] = useState<ClientRanking[]>([]);
  const [equipmentCategories, setEquipmentCategories] = useState<EquipmentCategory[]>([]);
  const [highRiskEquipment, setHighRiskEquipment] = useState<HighRiskEquipment[]>([]);
  const [technicianPerformance, setTechnicianPerformance] = useState<TechnicianPerformance[]>([]);
  const [userLoginTrends, setUserLoginTrends] = useState<UserLoginTrend[]>([]);
  const [passwordResets, setPasswordResets] = useState<PasswordReset[]>([]);
  const [vendorAudits, setVendorAudits] = useState<VendorAudit[]>([]);

  // Filter options
  const [clients, setClients] = useState<Client[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);

  // Filter states
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('');

  // Initialize date filters
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  }, []);

  // Fetch filter options when component mounts
  useEffect(() => {
    fetchClients();
    fetchEquipmentTypes();
  }, []);

  // Fetch all analytics data when filters change
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchAllAnalytics();
    }
  }, [dateRange, selectedClient, selectedEquipmentType]);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(
        `${API_BASE_URL}/vendor/analytics/clients/dropdown`,
        { headers }
      );

      if (!response.ok) throw new Error('Failed to fetch clients');

      const result = await response.json();
      if (result.success) {
        setClients(result.data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchEquipmentTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(
        `${API_BASE_URL}/vendor/analytics/equipment/types`,
        { headers }
      );

      if (!response.ok) throw new Error('Failed to fetch equipment types');

      const result = await response.json();
      if (result.success) {
        setEquipmentTypes(result.data);
      }
    } catch (error) {
      console.error('Error fetching equipment types:', error);
    }
  };

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required');

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Build query parameters
      const params = new URLSearchParams({
        start: dateRange.startDate,
        end: dateRange.endDate
      });
      
      if (selectedClient) {
        params.append('client_id', selectedClient.toString());
      }
      
      if (selectedEquipmentType) {
        params.append('equipment_type', selectedEquipmentType);
      }

      // Fetch all data in parallel
      const [
        overviewRes,
        complianceByClientRes,
        complianceTrendRes,
        ticketTrendsRes,
        ticketsByTypeRes,
        clientRankingsRes,
        equipmentCategoriesRes,
        highRiskEquipmentRes,
        technicianPerformanceRes,
        userLoginTrendsRes,
        passwordResetsRes,
        vendorAuditsRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/vendor/analytics/overview?${params}`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/compliance/by-client`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/compliance/trend?${params}`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/tickets/trend?${params}`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/tickets/by-type`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/clients/ranking`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/equipment/categories`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/equipment/high-risk`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/users/technicians`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/users/logins?${params}`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/users/resets`, { headers }),
        fetch(`${API_BASE_URL}/vendor/analytics/audit/recent`, { headers })
      ]);

      // Debug: Check response status codes
      console.log('Response status codes:', [
        overviewRes.status,
        complianceByClientRes.status,
        complianceTrendRes.status,
        ticketTrendsRes.status,
        ticketsByTypeRes.status,
        clientRankingsRes.status,
        equipmentCategoriesRes.status,
        highRiskEquipmentRes.status,
        technicianPerformanceRes.status,
        userLoginTrendsRes.status,
        passwordResetsRes.status,
        vendorAuditsRes.status
      ]);

      // Process responses
      const responses = await Promise.all([
        overviewRes.json(),
        complianceByClientRes.json(),
        complianceTrendRes.json(),
        ticketTrendsRes.json(),
        ticketsByTypeRes.json(),
        clientRankingsRes.json(),
        equipmentCategoriesRes.json(),
        highRiskEquipmentRes.json(),
        technicianPerformanceRes.json(),
        userLoginTrendsRes.json(),
        passwordResetsRes.json(),
        vendorAuditsRes.json()
      ]);

      // Debug: Log responses to see what we're getting
      console.log('API Responses:', responses);

      // Set data from responses
      const overview = responses[0].success ? responses[0].data : null;
      const clientComp = responses[1].success ? responses[1].data : [];
      const compTrend = responses[2].success ? responses[2].data : [];
      const ticketTrend = responses[3].success ? responses[3].data : [];
      const ticketsByTypeData = responses[4].success ? responses[4].data : [];
      const clientRank = responses[5].success ? responses[5].data : [];

      // Debug: Log individual data arrays
      console.log('Client Compliance:', clientComp);
      console.log('Compliance Trend:', compTrend);
      console.log('Ticket Trends:', ticketTrend);
      console.log('Tickets by Type:', ticketsByTypeData);

      setVendorOverview(overview);
      setClientCompliance(clientComp);
      setComplianceTrend(compTrend);
      setTicketTrends(ticketTrend);
      setTicketsByType(ticketsByTypeData);
      setClientRankings(clientRank);
      setEquipmentCategories(responses[6].success ? responses[6].data : []);
      setHighRiskEquipment(responses[7].success ? responses[7].data : []);
      setTechnicianPerformance(responses[8].success ? responses[8].data : []);
      setUserLoginTrends(responses[9].success ? responses[9].data : []);
      setPasswordResets(responses[10].success ? responses[10].data : []);
      setVendorAudits(responses[11].success ? responses[11].data : []);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function for safe number conversion
  const safeNumber = (value: any): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Export to PDF function
  const exportToPDF = async () => {
    if (!vendorOverview) {
      alert('No data available to export');
      return;
    }

    setExportingPDF(true);
    try {
      // Import jsPDF and autoTable plugin
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Fire Guardian - Vendor Analytics Report', 20, 20);
      
      doc.setFontSize(12);
      let y = 35;
      doc.text('Vendor Performance & Operational Insights', 20, y);
      y += 15;

      // Applied Filters
      doc.setFontSize(14);
      doc.text('Applied Filters:', 20, y);
      y += 10;
      
      doc.setFontSize(11);
      if (selectedClient) {
        const client = clients.find(c => c.id === selectedClient);
        doc.text(`Client: ${client?.company_name || 'Unknown'}`, 20, y);
        y += 8;
      } else {
        doc.text('Client: All Clients', 20, y);
        y += 8;
      }

      if (selectedEquipmentType) {
        doc.text(`Equipment Type: ${selectedEquipmentType}`, 20, y);
        y += 8;
      } else {
        doc.text('Equipment Type: All Types', 20, y);
        y += 8;
      }
      
      doc.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 20, y);
      y += 15;
      
      // Vendor Overview KPIs
      doc.setFontSize(14);
      doc.text('Vendor Overview', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.text(`Active Clients: ${vendorOverview.active_clients}`, 20, y);
      y += 6;
      doc.text(`Total Equipment Assigned: ${vendorOverview.total_assigned}`, 20, y);
      y += 6;
      doc.text(`Open Tickets: ${vendorOverview.open_tickets}`, 20, y);
      y += 6;
      doc.text(`Tickets Resolved (Period): ${vendorOverview.resolved_in_period}`, 20, y);
      y += 6;
      doc.text(`Avg Resolution Time: ${safeNumber(vendorOverview.avg_resolution_hours).toFixed(1)}h`, 20, y);
      y += 6;
      doc.text(`Overall Compliance Rate: ${vendorOverview.compliance_rate_pct}%`, 20, y);
      y += 15;

      // High-Risk Equipment (if available)
      if (y < 200 && highRiskEquipment && highRiskEquipment.length > 0) {
        doc.setFontSize(14);
        doc.text('High-Risk Equipment (Top 5)', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        highRiskEquipment.slice(0, 5).forEach(item => {
          doc.text(`${item.client}: ${item.equipment_name} (${item.compliance_status})`, 20, y);
          y += 6;
        });
        y += 10;
      }

      // Client Performance (if available)
      if (y < 220 && clientRankings && clientRankings.length > 0) {
        doc.setFontSize(14);
        doc.text('Top Client Performance', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        clientRankings.slice(0, 3).forEach(client => {
          doc.text(`${client.company_name}: ${client.compliance_pct}% compliance, ${client.equipment_count} equipment`, 20, y);
          y += 6;
        });
        y += 10;
      }

      // Recommendations Section
      if (y < 240) {
        doc.setFontSize(14);
        doc.text('Operational Recommendations', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        
        // Generate recommendations based on data
        const recommendations = [];
        
        if (safeNumber(vendorOverview.compliance_rate_pct) < 80) {
          recommendations.push('• Focus on improving compliance rate - currently below 80%');
        }
        
        if (safeNumber(vendorOverview.open_tickets) > 10) {
          recommendations.push('• High number of open tickets - consider additional resources');
        }
        
        if (highRiskEquipment.length > 5) {
          recommendations.push('• Multiple high-risk equipment items need immediate attention');
        }
        
        if (recommendations.length === 0) {
          recommendations.push('• Maintain current operational standards - performance is good');
          recommendations.push('• Consider proactive maintenance to prevent future issues');
        }
        
        recommendations.forEach(rec => {
          doc.text(rec, 20, y);
          y += 6;
        });
      }
      
      // Save the PDF
      const timestamp = new Date().toISOString().slice(0, 10);
      const clientName = selectedClient 
        ? clients.find(c => c.id === selectedClient)?.company_name || 'Selected-Client' 
        : 'All-Clients';
      const filename = `Vendor-Analytics-Report-${clientName.replace(/\s+/g, '-')}-${timestamp}.pdf`;
      
      doc.save(filename);
      
      // Success notification
      alert(`Vendor report generated successfully! File: ${filename}`);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Format data for charts
  const formatComplianceTrendForChart = (data: ComplianceTrend[]) => {
    return data.map(item => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      'Compliance Rate %': safeNumber(item.compliance_rate_pct),
      'Total Equipment': item.total,
      'Compliant': item.compliant
    }));
  };

  const formatTicketTrendsForChart = (data: TicketTrend[]) => {
    return data.map(item => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      'Created': item.created,
      'Resolved': item.resolved,
      'High Priority': item.high_priority,
      'Avg Resolution (h)': safeNumber(item.avg_resolution_hours)
    }));
  };

  const formatClientComplianceForChart = (data: ClientCompliance[]) => {
    return data.map(item => ({
      name: item.client,
      Compliant: item.compliant,
      'Due Soon': item.due_soon,
      Overdue: item.overdue,
      Expired: item.expired
    }));
  };

  const formatTechnicianPerformanceForChart = (data: TechnicianPerformance[]) => {
    return data.map(item => ({
      name: item.technician,
      'Tickets Handled': item.tickets_handled,
      'Resolved': item.resolved,
      'Avg Resolution (h)': safeNumber(item.avg_resolution_hours)
    }));
  };

  const formatUserLoginTrendsForChart = (data: UserLoginTrend[]) => {
    return data.map(item => ({
      week: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'Logins': item.logins,
      'Failed Attempts': item.failed_attempts
    }));
  };

  // Equipment Report Generation
  const generateEquipmentReport = async () => {
    if (!reportDateRange.startDate || !reportDateRange.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (!reportClientId) {
      alert('Please select a client');
      return;
    }

    setGeneratingReport(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(
        `${API_BASE_URL}/pdf-reports/vendor/client/${reportClientId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: reportDateRange.startDate,
            endDate: reportDateRange.endDate
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fire_Equipment_Report_${reportClientId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Close modal
      setShowReportModal(false);
      alert('Equipment report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate equipment report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Initialize report date range when modal opens
  useEffect(() => {
    if (showReportModal) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90); // Default to last 90 days

      setReportDateRange({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
    }
  }, [showReportModal]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
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
          {/* Page Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-gray-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  Operational insights, client performance, and business growth metrics
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowReportModal(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                <span>Equipment Report</span>
              </button>
              <button
                onClick={exportToPDF}
                disabled={exportingPDF}
                className="btn-primary flex items-center space-x-2"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>{exportingPDF ? 'Generating...' : 'Export PDF'}</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center mb-4">
              <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="input-field"
                  />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="client-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Client Filter
                </label>
                <select
                  id="client-filter"
                  value={selectedClient || ''}
                  onChange={(e) => setSelectedClient(e.target.value ? Number(e.target.value) : null)}
                  className="input-field"
                >
                  <option value="">All Clients</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="equipment-type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment Type
                </label>
                <select
                  id="equipment-type-filter"
                  value={selectedEquipmentType}
                  onChange={(e) => setSelectedEquipmentType(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Equipment Types</option>
                  {equipmentTypes.map(type => (
                    <option key={type.equipment_type} value={type.equipment_type}>
                      {type.equipment_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchAllAnalytics}
                  className="w-full btn-secondary"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>

          {/* Vendor Overview Section */}
          {vendorOverview && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <BuildingOfficeIcon className="h-6 w-6 text-indigo-600 mr-2" />
                Vendor Overview
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <UserGroupIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{vendorOverview.active_clients}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <WrenchScrewdriverIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Equipment Assigned</p>
                      <p className="text-2xl font-bold text-gray-900">{vendorOverview.total_assigned}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-xl">
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                      <p className="text-2xl font-bold text-gray-900">{vendorOverview.open_tickets}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Resolved (Period)</p>
                      <p className="text-2xl font-bold text-gray-900">{vendorOverview.resolved_in_period}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <ClockIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                      <p className="text-2xl font-bold text-gray-900">{safeNumber(vendorOverview.avg_resolution_hours).toFixed(1)}h</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{vendorOverview.compliance_rate_pct}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance by Client */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ShieldCheckIcon className="h-6 w-6 text-green-600 mr-2" />
                Compliance by Client
              </h2>
              
              {clientCompliance.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formatClientComplianceForChart(clientCompliance)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Compliant" stackId="a" fill="#059669" />
                      <Bar dataKey="Due Soon" stackId="a" fill="#F59E0B" />
                      <Bar dataKey="Overdue" stackId="a" fill="#EF4444" />
                      <Bar dataKey="Expired" stackId="a" fill="#DC2626" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No compliance data available</div>
              )}
            </div>

            {/* Compliance Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-6 w-6 text-green-600 mr-2" />
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
                      <Line type="monotone" dataKey="Compliance Rate %" stroke="#059669" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No trend data available</div>
              )}
            </div>
          </div>

          {/* Tickets & Maintenance Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticket Trends */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-2" />
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
                      <Line type="monotone" dataKey="Created" stroke="#1E40AF" strokeWidth={2} />
                      <Line type="monotone" dataKey="Resolved" stroke="#059669" strokeWidth={2} />
                      <Line type="monotone" dataKey="High Priority" stroke="#DC2626" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No ticket trend data available</div>
              )}
            </div>

            {/* Tickets by Type */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FireIcon className="h-6 w-6 text-red-600 mr-2" />
                Tickets by Type
              </h2>
              
              {ticketsByType.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ticketsByType.map((item, index) => ({
                          name: item.support_type,
                          value: item.count,
                          fill: VENDOR_COLORS[index % VENDOR_COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: any) => `${props.name}: ${(props.percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ticketsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={VENDOR_COLORS[index % VENDOR_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No ticket type data available</div>
              )}
            </div>
          </div>

          {/* Client Performance & Equipment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Rankings */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600 mr-2" />
                Top Client Performance
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Client</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Equipment</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Tickets</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientRankings.map((client, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{client.company_name}</td>
                        <td className="py-3 px-4 text-gray-600">{client.equipment_count}</td>
                        <td className="py-3 px-4 text-gray-600">{client.tickets_raised}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            client.compliance_pct >= 90
                              ? 'bg-green-100 text-green-800'
                              : client.compliance_pct >= 80
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {client.compliance_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Equipment Categories */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <WrenchScrewdriverIcon className="h-6 w-6 text-indigo-600 mr-2" />
                Equipment Categories
              </h2>
              
              {equipmentCategories.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={equipmentCategories.map((item, index) => ({
                          name: item.equipment_type,
                          value: item.instance_count,
                          fill: VENDOR_COLORS[index % VENDOR_COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: any) => `${props.name}: ${(props.percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {equipmentCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={VENDOR_COLORS[index % VENDOR_COLORS.length]} />
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
          </div>

          {/* High-Risk Equipment & Technician Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* High-Risk Equipment */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
                High-Risk Equipment
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Serial #</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Client</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Equipment</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Next Maintenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskEquipment.slice(0, 5).map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-blue-600">{item.serial_number}</td>
                        <td className="py-3 px-4 text-gray-900">{item.client}</td>
                        <td className="py-3 px-4 text-gray-600">{item.equipment_name}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            item.compliance_status === 'expired'
                              ? 'bg-red-100 text-red-800'
                              : item.compliance_status === 'overdue'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.compliance_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{item.next_maintenance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technician Performance */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <UserGroupIcon className="h-6 w-6 text-purple-600 mr-2" />
                Technician Performance
              </h2>
              
              {technicianPerformance.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formatTechnicianPerformanceForChart(technicianPerformance)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Tickets Handled" fill="#1E40AF" />
                      <Bar dataKey="Resolved" fill="#059669" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No technician data available</div>
              )}
            </div>
          </div>

          {/* User & Security Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Login Trends */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <UserGroupIcon className="h-6 w-6 text-indigo-600 mr-2" />
                Staff Login Trends
              </h2>
              
              {userLoginTrends.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatUserLoginTrendsForChart(userLoginTrends)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Logins" stroke="#4F46E5" strokeWidth={2} />
                      <Line type="monotone" dataKey="Failed Attempts" stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No login trend data available</div>
              )}
            </div>

            {/* Password Resets */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <LockClosedIcon className="h-6 w-6 text-amber-600 mr-2" />
                Password Reset Reasons
              </h2>
              
              {passwordResets.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={passwordResets.map((item, index) => ({
                          name: item.reason,
                          value: item.count,
                          fill: VENDOR_COLORS[index % VENDOR_COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: any) => `${props.name}: ${(props.percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {passwordResets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={VENDOR_COLORS[index % VENDOR_COLORS.length]} />
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

          {/* Recent Vendor Audits */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <DocumentMagnifyingGlassIcon className="h-6 w-6 text-gray-600 mr-2" />
              Recent Activity Audit
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
                  {vendorAudits.map((audit, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{audit.table_name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          audit.action_type === 'insert'
                            ? 'bg-green-100 text-green-800'
                            : audit.action_type === 'update'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {audit.action_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{audit.changed_by || 'System'}</td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-sm">{audit.ip_address}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{audit.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Equipment Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <DocumentMagnifyingGlassIcon className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Generate Equipment Report</h3>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportClientId || ''}
                    onChange={(e) => setReportClientId(e.target.value ? Number(e.target.value) : null)}
                    className="input-field w-full"
                    required
                  >
                    <option value="">Choose a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={reportDateRange.startDate}
                    onChange={(e) => setReportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="input-field w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={reportDateRange.endDate}
                    onChange={(e) => setReportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="input-field w-full"
                    required
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will generate a comprehensive Fire Equipment Status & Maintenance Report in PDF format, including equipment inventory, maintenance history, and compliance summary for the selected client.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 btn-secondary"
                    disabled={generatingReport}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateEquipmentReport}
                    disabled={generatingReport || !reportClientId}
                    className="flex-1 btn-primary flex items-center justify-center space-x-2"
                  >
                    {generatingReport ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <DocumentArrowDownIcon className="h-5 w-5" />
                        <span>Generate Report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </RequireRole>
  );
}
