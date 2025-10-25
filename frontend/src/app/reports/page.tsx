'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useToast } from '@/components/providers/ToastProvider';
import { useConfirmModal } from '@/components/providers/ConfirmModalProvider';
import { 
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  FireIcon,
  UserGroupIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Report {
  id: number;
  title: string;
  type: 'Compliance' | 'Maintenance' | 'Financial' | 'Client' | 'Equipment' | 'Service';
  description: string;
  generated_date: string;
  period_start: string;
  period_end: string;
  status: 'Generated' | 'Pending' | 'Error';
  file_size: string;
  client_name?: string;
  generated_by: string;
}

interface ReportStats {
  totalReports: number;
  reportsThisMonth: number;
  complianceReports: number;
  financialReports: number;
  totalClients: number;
  totalRevenue: number;
  avgComplianceScore: number;
  equipmentInspected: number;
}

export default function VendorReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState('This Month');
  
  const [reports, setReports] = useState<Report[]>([
    {
      id: 1,
      title: 'Monthly Compliance Report - October 2024',
      type: 'Compliance',
      description: 'Comprehensive compliance status report for all clients covering fire safety equipment compliance rates, inspection schedules, and regulatory adherence.',
      generated_date: '2024-10-23',
      period_start: '2024-10-01',
      period_end: '2024-10-31',
      status: 'Generated',
      file_size: '2.4 MB',
      generated_by: 'System Auto-Generate'
    },
    {
      id: 2,
      title: 'Equipment Maintenance Summary - Royal Hotels Ltd',
      type: 'Maintenance',
      description: 'Detailed maintenance report including completed inspections, upcoming scheduled maintenance, and equipment performance metrics.',
      generated_date: '2024-10-20',
      period_start: '2024-07-01',
      period_end: '2024-09-30',
      status: 'Generated',
      file_size: '1.8 MB',
      client_name: 'Royal Hotels Ltd',
      generated_by: 'Pradeep Silva'
    },
    {
      id: 3,
      title: 'Quarterly Financial Report - Q3 2024',
      type: 'Financial',
      description: 'Revenue analysis, service costs breakdown, client billing summary, and profit margins for the third quarter.',
      generated_date: '2024-10-15',
      period_start: '2024-07-01',
      period_end: '2024-09-30',
      status: 'Generated',
      file_size: '3.2 MB',
      generated_by: 'Finance Department'
    },
    {
      id: 4,
      title: 'Client Portfolio Analysis',
      type: 'Client',
      description: 'Analysis of client base including growth trends, service utilization, satisfaction scores, and retention rates.',
      generated_date: '2024-10-18',
      period_start: '2024-01-01',
      period_end: '2024-09-30',
      status: 'Generated',
      file_size: '1.5 MB',
      generated_by: 'Business Development'
    },
    {
      id: 5,
      title: 'Equipment Inventory Report',
      type: 'Equipment',
      description: 'Complete inventory of all managed equipment including installation dates, warranty status, and replacement schedules.',
      generated_date: '2024-10-22',
      period_start: '2024-10-01',
      period_end: '2024-10-22',
      status: 'Generated',
      file_size: '4.1 MB',
      generated_by: 'Inventory Team'
    },
    {
      id: 6,
      title: 'Service Request Performance Report',
      type: 'Service',
      description: 'Service request metrics including response times, completion rates, customer satisfaction, and technician performance.',
      generated_date: '2024-10-21',
      period_start: '2024-09-01',
      period_end: '2024-09-30',
      status: 'Generated',
      file_size: '2.9 MB',
      generated_by: 'Operations Manager'
    },
    {
      id: 7,
      title: 'Weekly Compliance Check - City Mall',
      type: 'Compliance',
      description: 'Weekly compliance status update for City Mall covering recent inspections and any compliance issues requiring attention.',
      generated_date: '2024-10-23',
      period_start: '2024-10-16',
      period_end: '2024-10-23',
      status: 'Pending',
      file_size: '-',
      client_name: 'City Mall',
      generated_by: 'Compliance Team'
    }
  ]);

  const [reportStats] = useState<ReportStats>({
    totalReports: 156,
    reportsThisMonth: 23,
    complianceReports: 45,
    financialReports: 28,
    totalClients: 47,
    totalRevenue: 2850000,
    avgComplianceScore: 87,
    equipmentInspected: 278
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const confirmModal = useConfirmModal();

  const reportTypes = ['All', 'Compliance', 'Maintenance', 'Financial', 'Client', 'Equipment', 'Service'];
  const dateRanges = ['This Week', 'This Month', 'Last Month', 'This Quarter', 'Last Quarter', 'This Year'];

  // Filter reports based on search and filters
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.client_name && report.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      report.generated_by.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'All' || report.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || report.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Generated':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Compliance':
        return 'bg-blue-50 text-blue-700';
      case 'Maintenance':
        return 'bg-purple-50 text-purple-700';
      case 'Financial':
        return 'bg-green-50 text-green-700';
      case 'Client':
        return 'bg-orange-50 text-orange-700';
      case 'Equipment':
        return 'bg-red-50 text-red-700';
      case 'Service':
        return 'bg-indigo-50 text-indigo-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Compliance':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'Maintenance':
        return <FireIcon className="h-4 w-4" />;
      case 'Financial':
        return <CurrencyDollarIcon className="h-4 w-4" />;
      case 'Client':
        return <UserGroupIcon className="h-4 w-4" />;
      case 'Equipment':
        return <FireIcon className="h-4 w-4" />;
      case 'Service':
        return <ClipboardDocumentListIcon className="h-4 w-4" />;
      default:
        return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  const handleDownloadReport = async (reportId: number, reportTitle: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report?.status !== 'Generated') {
      toast.warning('Report is not yet available for download');
      return;
    }

    try {
      // Simulate download
      toast.success(`Downloading ${reportTitle}...`);
      // In real implementation, this would trigger the actual file download
    } catch (err) {
      toast.error('Failed to download report. Please try again.');
    }
  };

  const handleDeleteReport = async (reportId: number, reportTitle: string) => {
    const confirmed = await confirmModal.danger({
      title: 'Delete Report',
      message: `Are you sure you want to delete "${reportTitle}"? This action cannot be undone.`,
      confirmText: 'Delete Report',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      setReports(reports.filter(r => r.id !== reportId));
      toast.success('Report deleted successfully');
    } catch (err) {
      toast.error('Failed to delete report. Please try again.');
    }
  };

  const handleGenerateReport = async () => {
    const confirmed = await confirmModal.confirm({
      title: 'Generate New Report',
      message: 'Generate a new report with current settings?',
      confirmText: 'Generate',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      toast.success('Report generation started. You will be notified when it\'s ready.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">Generate and manage business reports</p>
            </div>
          </div>
          <button 
            onClick={handleGenerateReport}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Generate Report</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{reportStats.totalReports}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{reportStats.reportsThisMonth}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Compliance Reports</p>
                <p className="text-2xl font-bold text-gray-900">{reportStats.complianceReports}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Financial Reports</p>
                <p className="text-2xl font-bold text-gray-900">{reportStats.financialReports}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl mb-3">
              <UserGroupIcon className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{reportStats.totalClients}</p>
            <p className="text-sm text-gray-600">Active Clients</p>
            <p className="text-xs text-green-600 mt-1">+3 this month</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-3">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">LKR {reportStats.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Total Revenue YTD</p>
            <p className="text-xs text-blue-600 mt-1">+15% vs last year</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-50 rounded-xl mb-3">
              <CheckCircleIcon className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{reportStats.avgComplianceScore}%</p>
            <p className="text-sm text-gray-600">Avg Compliance Score</p>
            <p className="text-xs text-purple-600 mt-1">Above industry standard</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-50 rounded-xl mb-3">
              <FireIcon className="h-6 w-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{reportStats.equipmentInspected}</p>
            <p className="text-sm text-gray-600">Equipment Inspected</p>
            <p className="text-xs text-orange-600 mt-1">This month</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {reportTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="All">All Status</option>
                <option value="Generated">Generated</option>
                <option value="Pending">Pending</option>
                <option value="Error">Error</option>
              </select>
            </div>
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {dateRanges.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Reports ({filteredReports.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{report.title}</div>
                      <div className="text-sm text-gray-600 mt-1 max-w-md truncate">{report.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(report.type)}`}>
                          {getTypeIcon(report.type)}
                          <span className="ml-1">{report.type}</span>
                        </span>
                      </div>
                      {report.client_name && (
                        <div className="text-sm text-gray-600">{report.client_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{new Date(report.period_start).toLocaleDateString()}</div>
                      <div className="text-gray-500">to {new Date(report.period_end).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{new Date(report.generated_date).toLocaleDateString()}</div>
                      <div className="text-gray-500 text-xs">{report.generated_by}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {report.file_size !== '-' ? (
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {report.file_size}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium space-x-3">
                      <button className="text-blue-600 hover:text-blue-800 transition-colors">
                        View
                      </button>
                      {report.status === 'Generated' && (
                        <button 
                          onClick={() => handleDownloadReport(report.id, report.title)}
                          className="text-green-600 hover:text-green-800 transition-colors flex items-center"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      )}
                      <button className="text-purple-600 hover:text-purple-800 transition-colors">
                        Share
                      </button>
                      <button 
                        onClick={() => handleDeleteReport(report.id, report.title)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}