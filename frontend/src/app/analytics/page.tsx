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
  ClipboardDocumentListIcon,
  ChevronDownIcon
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
  const [complianceTrend, setComplianceTrend] = useState<any[]>([]);
  const [ticketTrends, setTicketTrends] = useState<any[]>([]);
  const [equipmentCategories, setEquipmentCategories] = useState<any[]>([]);
  const [vendorRankings, setVendorRankings] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  
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

      // Fetch all data in parallel - vendor filtering enabled
      const [
        overviewRes,
        complianceRes,
        ticketsOverviewRes,
        complianceTrendRes,
        ticketTrendsRes,
        equipmentCategoriesRes,
        vendorRankingsRes,
        recentTicketsRes,
        auditEventsRes
      ] = await Promise.all([
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.OVERVIEW}?${queryParams}`, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.COMPLIANCE.SUMMARY}?${vendorQueryParams}`, { headers }),
        fetch(API_ENDPOINTS.ADMIN_ANALYTICS.TICKETS.OVERVIEW, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.COMPLIANCE.TREND}?${queryParams}`, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.TICKETS.TRENDS}?${queryParams}`, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.EQUIPMENT.CATEGORIES}?${vendorQueryParams}`, { headers }),
        fetch(API_ENDPOINTS.ADMIN_ANALYTICS.VENDORS.RANKINGS, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.TICKETS.RECENT_HIGH_PRIORITY}?${vendorQueryParams}`, { headers }),
        fetch(API_ENDPOINTS.ADMIN_ANALYTICS.AUDIT.RECENT, { headers })
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
        complianceTrendData,
        ticketTrendsData,
        equipmentCategoriesData,
        vendorRankingsData,
        recentTicketsData,
        auditEventsData
      ] = await Promise.all([
        overviewRes.json(),
        complianceRes.json(),
        ticketsOverviewRes.json(),
        complianceTrendRes.json(),
        ticketTrendsRes.json(),
        equipmentCategoriesRes.json(),
        vendorRankingsRes.json(),
        recentTicketsRes.json(),
        auditEventsRes.json()
      ]);

      // Set state
      setSystemOverview(overviewData.data);
      setComplianceSummary(complianceData.data);
      setTicketsOverview(ticketsOverviewData.data);
      setComplianceTrend(complianceTrendData.data || []);
      setTicketTrends(ticketTrendsData.data || []);
      setEquipmentCategories(equipmentCategoriesData.data || []);
      setVendorRankings(vendorRankingsData.data || []);
      setRecentTickets(recentTicketsData.data || []);
      setAuditEvents(auditEventsData.data || []);

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

  // Export to PDF functionality - Comprehensive Admin Report
  const exportToPDF = async () => {
    try {
      setExportingPDF(true);
      
      // Import jsPDF and autoTable plugin
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      // Fetch comprehensive report data
      const token = localStorage.getItem('token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Build query parameters
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(selectedVendor && { vendorId: selectedVendor.toString() })
      });
      
      const [comprehensiveResponse, securityResponse] = await Promise.all([
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.COMPREHENSIVE_REPORT}?${params}`, { headers }),
        fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS.SECURITY_ANALYTICS}?${params}`, { headers })
      ]);
      
      if (!comprehensiveResponse.ok || !securityResponse.ok) {
        throw new Error('Failed to fetch comprehensive report data');
      }
      
      const comprehensiveData = await comprehensiveResponse.json();
      const securityData = await securityResponse.json();
      
      const reportData = comprehensiveData.data;
      const securityMetrics = securityData.data;
      
      const doc = new jsPDF();
      let y = 20;
      
      // Header with branding
      doc.setFontSize(22);
      doc.setTextColor(220, 38, 38); // Red color for Fire Guardian
      doc.text('FIRE GUARDIAN', 20, y);
      y += 8;
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('System Analytics Report - Administrative Overview', 20, y);
      y += 15;
      
      // Report metadata
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
      doc.text(`Report ID: FG-ADMIN-${Date.now().toString().slice(-8)}`, 120, y);
      y += 6;
      doc.text(`System: Fire Guardian Control Center v2.0`, 20, y);
      y += 15;
      
      doc.setTextColor(0, 0, 0);
      
      // Applied Filters Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('📊 Applied Filters & Scope', 20, y);
      y += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const filterScope = selectedVendor 
        ? `Vendor-Specific: ${vendors.find(v => v.id === selectedVendor)?.company_name || 'Unknown'}`
        : 'System-Wide: All Vendors';
      doc.text(`• Scope: ${filterScope}`, 25, y);
      y += 6;
      doc.text(`• Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 25, y);
      y += 6;
      doc.text(`• Analysis Period: ${Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`, 25, y);
      y += 15;
      
      // System Overview KPIs - Using comprehensive data
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('🏢 System Overview & Performance Metrics', 20, y);
      y += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (reportData?.system_metrics) {
        const metrics = reportData.system_metrics;
        doc.text(`• Active Vendors: ${safeNumber(metrics.active_vendors)}`, 25, y);
        y += 6;
        doc.text(`• Active Clients: ${safeNumber(metrics.active_clients)}`, 25, y);
        y += 6;
        doc.text(`• Total Equipment Instances: ${safeNumber(metrics.total_equipment)}`, 25, y);
        y += 6;
        doc.text(`• Monthly Tickets: ${safeNumber(metrics.monthly_tickets)}`, 25, y);
        y += 6;
        doc.text(`• Active User Sessions: ${safeNumber(metrics.active_sessions)}`, 25, y);
        y += 6;
        doc.text(`• System Uptime: ${metrics.system_uptime || '99.9%'}`, 25, y);
        y += 10;
      }
      
      // Compliance Analytics - Using comprehensive data
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('🛡️ Compliance Status & Risk Assessment', 20, y);
      y += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (reportData?.compliance_breakdown) {
        const compliance = reportData.compliance_breakdown;
        doc.text(`• Total Equipment Monitored: ${safeNumber(compliance.total_equipment)}`, 25, y);
        y += 6;
        doc.text(`• Compliant Equipment: ${safeNumber(compliance.compliant)} (${safeNumber(compliance.compliance_rate)}%)`, 25, y);
        y += 6;
        doc.text(`• Due Soon (30 days): ${safeNumber(compliance.due_soon)}`, 25, y);
        y += 6;
        doc.text(`• Overdue Equipment: ${safeNumber(compliance.overdue)}`, 25, y);
        y += 6;
        doc.text(`• Critical Risk Items: ${safeNumber(compliance.critical)}`, 25, y);
        y += 6;
        doc.text(`• Average Compliance Score: ${safeNumber(compliance.avg_score)}%`, 25, y);
        y += 10;
      }
      
      // Check if we need a new page
      if (y > 200) {
        doc.addPage();
        y = 20;
      }
      
      // Maintenance & Support Analytics - Using comprehensive data
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('🔧 Maintenance & Support Operations', 20, y);
      y += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (reportData?.ticket_analysis) {
        const tickets = reportData.ticket_analysis;
        doc.text(`• Total Tickets (Period): ${safeNumber(tickets.total_tickets)}`, 25, y);
        y += 6;
        doc.text(`• Open Tickets: ${safeNumber(tickets.open_tickets)}`, 25, y);
        y += 6;
        doc.text(`• Resolved Tickets: ${safeNumber(tickets.resolved_tickets)}`, 25, y);
        y += 6;
        doc.text(`• Average Resolution Hours: ${safeNumber(tickets.avg_resolution_hours)}`, 25, y);
        y += 6;
        doc.text(`• High Priority Tickets: ${safeNumber(tickets.high_priority_count)}`, 25, y);
        y += 6;
        doc.text(`• Resolution Rate: ${safeNumber(tickets.resolution_rate)}%`, 25, y);
        y += 10;
      }
      
      // Equipment Categories Breakdown - Using comprehensive data
      if (reportData?.equipment_categories && reportData.equipment_categories.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('📦 Equipment Categories Distribution', 20, y);
        y += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        reportData.equipment_categories.slice(0, 8).forEach((item: any) => {
          doc.text(`• ${item.category_name}: ${safeNumber(item.total_count)} units (${safeNumber(item.compliance_rate)}% compliant)`, 25, y);
          y += 6;
        });
        y += 10;
      }
      
      // Vendor Performance Rankings - Using comprehensive data
      if (reportData?.vendor_performance && reportData.vendor_performance.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('🏆 Top Vendor Performance Rankings', 20, y);
        y += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        reportData.vendor_performance.slice(0, 5).forEach((vendor: any, index: number) => {
          doc.text(`${index + 1}. ${vendor.vendor_name}`, 25, y);
          y += 5;
          doc.text(`   • Score: ${safeNumber(vendor.performance_score)} | Clients: ${safeNumber(vendor.client_count)} | Equipment: ${safeNumber(vendor.equipment_count)}`, 30, y);
          y += 5;
          doc.text(`   • Compliance: ${safeNumber(vendor.compliance_rate)}% | Avg Response: ${safeNumber(vendor.avg_response_time)}h`, 30, y);
          y += 8;
        });
        y += 10;
      }
      
      // Check if we need a new page
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      
      // Security Analytics - Using comprehensive security data
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('🔐 Security & Access Analytics', 20, y);
      y += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (securityMetrics?.security_metrics) {
        const security = securityMetrics.security_metrics;
        doc.text(`• Total Login Attempts: ${safeNumber(security.total_login_attempts)}`, 25, y);
        y += 6;
        doc.text(`• Successful Logins: ${safeNumber(security.successful_logins)}`, 25, y);
        y += 6;
        doc.text(`• Failed Login Attempts: ${safeNumber(security.failed_logins)}`, 25, y);
        y += 6;
        doc.text(`• Success Rate: ${safeNumber(security.success_rate)}%`, 25, y);
        y += 6;
        doc.text(`• Unique Users Active: ${safeNumber(security.unique_users)}`, 25, y);
        y += 6;
        doc.text(`• Password Reset Requests: ${safeNumber(security.password_resets)}`, 25, y);
        y += 10;
      }
      
      // Session Analytics
      if (securityMetrics?.session_metrics) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('👥 User Session Analytics', 20, y);
        y += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const sessions = securityMetrics.session_metrics;
        doc.text(`• Active Sessions: ${safeNumber(sessions.active_sessions)}`, 25, y);
        y += 6;
        doc.text(`• Average Session Duration: ${safeNumber(sessions.avg_session_duration)} minutes`, 25, y);
        y += 6;
        doc.text(`• Peak Concurrent Users: ${safeNumber(sessions.peak_concurrent_users)}`, 25, y);
        y += 6;
        doc.text(`• Browser Distribution: Chrome ${safeNumber(sessions.chrome_usage)}%, Firefox ${safeNumber(sessions.firefox_usage)}%, Other ${safeNumber(sessions.other_browsers)}%`, 25, y);
        y += 10;
      }
      
      // System Audit Summary
      if (securityMetrics?.audit_summary) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('📋 System Audit Summary', 20, y);
        y += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const audit = securityMetrics.audit_summary;
        doc.text(`• Total Audit Events: ${safeNumber(audit.total_events)}`, 25, y);
        y += 6;
        doc.text(`• User Management Events: ${safeNumber(audit.user_events)}`, 25, y);
        y += 6;
        doc.text(`• Equipment Changes: ${safeNumber(audit.equipment_events)}`, 25, y);
        y += 6;
        doc.text(`• System Configuration Changes: ${safeNumber(audit.system_events)}`, 25, y);
        y += 6;
        doc.text(`• Most Active User: ${audit.most_active_user || 'N/A'}`, 25, y);
        y += 10;
      }
      
      // Add a new page for recommendations
      doc.addPage();
      y = 20;
      
      // System Recommendations - Using comprehensive data
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('💡 Administrative Recommendations & Action Items', 20, y);
      y += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      // Generate intelligent recommendations based on comprehensive data
      const recommendations = [];
      
      // Compliance-based recommendations
      if (reportData?.compliance_breakdown) {
        const compliance = reportData.compliance_breakdown;
        if (safeNumber(compliance.compliance_rate) < 85) {
          recommendations.push('🚨 CRITICAL: System compliance rate below 85% - implement immediate compliance improvement program');
        }
        if (safeNumber(compliance.overdue) > 10) {
          recommendations.push('⚠️ HIGH: Significant overdue equipment detected - prioritize maintenance scheduling');
        }
        if (safeNumber(compliance.due_soon) > 20) {
          recommendations.push('📅 MEDIUM: Large number of items due soon - prepare proactive maintenance plan');
        }
      }
      
      // Ticket-based recommendations
      if (reportData?.ticket_analysis) {
        const tickets = reportData.ticket_analysis;
        if (safeNumber(tickets.resolution_rate) < 80) {
          recommendations.push('🔧 HIGH: Low ticket resolution rate - review support processes and resource allocation');
        }
        if (safeNumber(tickets.avg_resolution_hours) > 48) {
          recommendations.push('⏱️ MEDIUM: Resolution times exceed standard - optimize support workflows');
        }
        if (safeNumber(tickets.high_priority_count) > 10) {
          recommendations.push('🚨 HIGH: Elevated high-priority ticket volume - investigate root causes');
        }
      }
      
      // Security-based recommendations
      if (securityMetrics?.security_metrics) {
        const security = securityMetrics.security_metrics;
        if (safeNumber(security.success_rate) < 90) {
          recommendations.push('🔐 MEDIUM: Low login success rate - review authentication processes');
        }
        if (safeNumber(security.password_resets) > 50) {
          recommendations.push('🔑 LOW: High password reset volume - consider user training or policy review');
        }
      }
      
      // Performance-based recommendations
      if (reportData?.vendor_performance && reportData.vendor_performance.length > 0) {
        const lowPerformingVendors = reportData.vendor_performance.filter((v: any) => safeNumber(v.performance_score) < 70);
        if (lowPerformingVendors.length > 0) {
          recommendations.push(`🏢 MEDIUM: ${lowPerformingVendors.length} vendor(s) with low performance scores - conduct performance reviews`);
        }
      }
      
      // Add positive recommendations if system is performing well
      if (recommendations.length === 0) {
        recommendations.push('✅ GOOD: System performance is within acceptable parameters');
        recommendations.push('📊 CONTINUE: Maintain current monitoring and compliance trends');
        recommendations.push('🔄 OPTIMIZE: Consider proactive maintenance scheduling to prevent issues');
        recommendations.push('📈 IMPROVE: Explore automation opportunities for routine tasks');
      }
      
      recommendations.slice(0, 12).forEach(rec => {
        doc.text(rec, 25, y);
        y += 8;
      });
      
      y += 10;
      
      // Report Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('📈 Executive Summary', 20, y);
      y += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const periodDays = Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24));
      doc.text(`This comprehensive analytics report covers ${periodDays} days of system activity`, 25, y);
      y += 6;
      doc.text(`across the Fire Guardian Control Center platform. The analysis includes`, 25, y);
      y += 6;
      doc.text(`performance metrics, compliance status, security analytics, and actionable`, 25, y);
      y += 6;
      doc.text(`recommendations for system optimization and risk mitigation.`, 25, y);
      
      // Footer with report metadata
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Fire Guardian Analytics Report - Page ${i} of ${pageCount}`, 20, 290);
        doc.text(`Generated: ${new Date().toLocaleDateString()} | CONFIDENTIAL`, 140, 290);
      }
      
      // Save the PDF
      const timestamp = new Date().toISOString().slice(0, 10);
      const vendorScope = selectedVendor 
        ? vendors.find(v => v.id === selectedVendor)?.company_name?.replace(/\s+/g, '-') || 'Vendor-Specific'
        : 'System-Wide';
      const filename = `Fire-Guardian-Admin-Analytics-${vendorScope}-${timestamp}.pdf`;
      
      doc.save(filename);
      
      // Success notification
      alert(`Comprehensive admin analytics report generated successfully!\nFile: ${filename}`);
      
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
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToPDF}
                disabled={exportingPDF}
                className="btn-primary flex items-center space-x-2"
              >
                {exportingPDF ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>Export PDF Report</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:items-end">
              {/* Start Date */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              
              {/* End Date */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="input-field w-full"
                />
              </div>

              {/* Vendor Filter */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
                <select
                  value={selectedVendor || ''}
                  onChange={(e) => setSelectedVendor(e.target.value ? parseInt(e.target.value) : null)}
                  className="input-field appearance-none pr-8 w-full"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.company_name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="h-4 w-4 absolute right-2 top-9 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {selectedVendor && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <EyeIcon className="h-4 w-4 text-blue-600 mr-2" />
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Filtered View:</span> Showing data for {vendors.find(v => v.id === selectedVendor)?.company_name} only.
                    Select "All Vendors" to view system-wide analytics.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* System Overview KPIs */}
          {systemOverview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Vendors</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{systemOverview.active_vendors}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-green-50 rounded-xl">
                      <UserGroupIcon className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Clients</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{systemOverview.active_clients}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-orange-50 rounded-xl">
                      <FireIcon className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Equipment</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{systemOverview.total_equipment_instances}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <WrenchScrewdriverIcon className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tickets (Period)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{systemOverview.tickets_in_period}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compliance & Tickets Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Summary */}
            {complianceSummary && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="p-2 bg-green-50 rounded-lg mr-3">
                    <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  Compliance Overview
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-3xl font-bold text-green-600">{safeNumber(complianceSummary.compliance_rate_pct).toFixed(1)}%</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Compliance Rate</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-3xl font-bold text-red-600">{complianceSummary.vendors_below_80_pct}</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Low Compliance Vendors</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl">
                    <div className="text-2xl font-bold text-orange-600">{complianceSummary.expired_eq}</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Expired Equipment</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-xl">
                    <div className="text-2xl font-bold text-yellow-600">{complianceSummary.overdue_eq}</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Overdue Equipment</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tickets Summary */}
            {ticketsOverview && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="p-2 bg-purple-50 rounded-lg mr-3">
                    <WrenchScrewdriverIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  Tickets Overview
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">{ticketsOverview.total_tickets}</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Total Tickets</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-xl">
                    <div className="text-3xl font-bold text-yellow-600">{ticketsOverview.open_tickets}</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Open Tickets</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-2xl font-bold text-red-600">{ticketsOverview.high_priority_tickets}</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">High Priority</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">{safeNumber(ticketsOverview.avg_resolution_hours).toFixed(1)}h</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Avg Resolution</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="p-2 bg-green-50 rounded-lg mr-3">
                  <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                </div>
                Compliance Trend Over Time
              </h2>
              {complianceTrend.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatComplianceTrendForChart(complianceTrend)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Compliance Rate %" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No compliance trend data available</p>
                </div>
              )}
            </div>

            {/* Ticket Trends */}
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="p-2 bg-purple-50 rounded-lg mr-3">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                Ticket Activity Trends
              </h2>
              {ticketTrends.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatTicketTrendsForChart(ticketTrends)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Created" stroke="#E65100" strokeWidth={3} dot={{ fill: '#E65100', r: 4 }} />
                      <Line type="monotone" dataKey="Resolved" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669', r: 4 }} />
                      <Line type="monotone" dataKey="High Priority" stroke="#DC2626" strokeWidth={3} dot={{ fill: '#DC2626', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No ticket trend data available</p>
                </div>
              )}
            </div>
          </div>



          {/* Equipment Categories */}
          {equipmentCategories.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="p-2 bg-red-50 rounded-lg mr-3">
                  <FireIcon className="h-6 w-6 text-red-600" />
                </div>
                Equipment Categories Distribution
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={equipmentCategories.map(cat => ({
                        name: cat.equipment_type,
                        value: safeNumber(cat.instance_count)
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="p-2 bg-blue-50 rounded-lg mr-3">
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                </div>
                Top Vendor Performance
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Vendor</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Clients</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Equipment</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Tickets</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorRankings.slice(0, 10).map((vendor, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 font-medium text-gray-900">{vendor.company_name}</td>
                        <td className="py-4 px-6 text-gray-600 font-medium">{vendor.client_count}</td>
                        <td className="py-4 px-6 text-gray-600 font-medium">{vendor.equipment_assigned}</td>
                        <td className="py-4 px-6 text-gray-600 font-medium">{vendor.tickets_raised}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                            safeNumber(vendor.avg_compliance_pct) >= 80 
                              ? 'bg-green-100 text-green-800' 
                              : safeNumber(vendor.avg_compliance_pct) >= 60 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {safeNumber(vendor.avg_compliance_pct).toFixed(1)}%
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
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="p-2 bg-orange-50 rounded-lg mr-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                </div>
                Recent High-Priority Tickets
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Ticket #</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Vendor</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Client</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Equipment</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.slice(0, 10).map((ticket) => (
                      <tr key={ticket.ticket_number} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 font-medium text-blue-600">{ticket.ticket_number}</td>
                        <td className="py-4 px-6 text-gray-900">{ticket.vendor || 'N/A'}</td>
                        <td className="py-4 px-6 text-gray-900">{ticket.client || 'N/A'}</td>
                        <td className="py-4 px-6 text-gray-600">{ticket.equipment || 'N/A'}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                            ticket.status === 'open' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : ticket.status === 'resolved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status}
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



          {/* Recent Audit Events */}
          {auditEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="p-2 bg-indigo-50 rounded-lg mr-3">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-600" />
                </div>
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