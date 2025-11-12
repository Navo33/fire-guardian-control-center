'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/providers/ToastProvider';
import { API_ENDPOINTS, secureFetch, buildApiUrl, getAuthHeaders } from '@/config/api';
import { 
  ChartBarIcon, 
  CalendarIcon, 
  ArrowDownTrayIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

// Types
interface KPIData {
  total_equipment: number;
  active_clients: number;
  compliance_rate: number;
  open_tickets: number;
}

interface ChartDataPoint {
  label: string;
  value: number;
  count?: number;
}

interface Client {
  id: number;
  company_name: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [complianceData, setComplianceData] = useState<ChartDataPoint[]>([]);
  const [ticketsData, setTicketsData] = useState<ChartDataPoint[]>([]);
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { showToast } = useToast();

  // Redirect vendors to their dedicated analytics page
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.user_type === 'vendor') {
        router.push('/vendors/analytics');
        return;
      }
    }
  }, [router]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadKPIData(),
      loadClientsDropdown(),
      loadChartData()
    ]);
  };

  const loadKPIData = async () => {
    try {
      setLoading(true);
      const response = await secureFetch(buildApiUrl(API_ENDPOINTS.REPORTS.KPIS));
      if (response.ok) {
        const data = await response.json();
        setKpis(data.data);
      } else {
        showToast('error', 'Failed to load KPI data');
      }
    } catch (error) {
      console.error('Error loading KPI data:', error);
      showToast('error', 'Error loading KPI data');
    } finally {
      setLoading(false);
    }
  };

  const loadClientsDropdown = async () => {
    try {
      const response = await secureFetch(API_ENDPOINTS.REPORTS.CLIENTS_DROPDOWN);
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadChartData = async () => {
    try {
      // Load compliance chart
      const complianceResponse = await secureFetch(
        buildApiUrl(API_ENDPOINTS.REPORTS.COMPLIANCE_CHART, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          ...(selectedClient !== 'all' && { clientId: selectedClient })
        })
      );
      
      if (complianceResponse.ok) {
        const data = await complianceResponse.json();
        setComplianceData(data.data || []);
      }

      // Load tickets chart
      const ticketsResponse = await secureFetch(
        buildApiUrl(API_ENDPOINTS.REPORTS.TICKETS_CHART, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          ...(selectedClient !== 'all' && { clientId: selectedClient })
        })
      );
      
      if (ticketsResponse.ok) {
        const data = await ticketsResponse.json();
        setTicketsData(data.data || []);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const handleApplyFilter = () => {
    loadChartData();
  };

  const handleExportPDF = async () => {
    try {
      showToast('info', 'PDF export feature coming soon');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('error', 'Error exporting PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      showToast('info', 'Excel export feature coming soon');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      showToast('error', 'Error exporting Excel');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading reports..." />
        </div>
      </DashboardLayout>
    );
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserGroupIcon className="h-4 w-4 inline mr-1" />
                Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleApplyFilter}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <WrenchScrewdriverIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Equipment</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{kpis.total_equipment.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm text-gray-600">
                  Active inventory
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Clients</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{kpis.active_clients.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm text-gray-600">
                  Service customers
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShieldCheckIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Compliance Rate</dt>
                      <dd className="text-2xl font-semibold text-green-600">{kpis.compliance_rate}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm text-green-600">
                  {kpis.compliance_rate >= 90 ? 'Excellent' : kpis.compliance_rate >= 80 ? 'Good' : 'Needs Attention'}
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Open Tickets</dt>
                      <dd className="text-2xl font-semibold text-red-600">{kpis.open_tickets.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm text-gray-600">
                  Pending resolution
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compliance Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Overview</h3>
            {complianceData.length > 0 ? (
              <div className="space-y-3">
                {complianceData.map((item, index) => {
                  const maxValue = Math.max(...complianceData.map(d => d.value));
                  const percentage = (item.value / maxValue) * 100;
                  const colors = ['bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-gray-500'];
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{item.label}</span>
                        <span className="text-gray-900 font-semibold">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${colors[index % colors.length]} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                No compliance data available
              </div>
            )}
          </div>

          {/* Tickets Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Status</h3>
            {ticketsData.length > 0 ? (
              <div className="space-y-3">
                {ticketsData.map((item, index) => {
                  const maxValue = Math.max(...ticketsData.map(d => d.value));
                  const percentage = (item.value / maxValue) * 100;
                  const colors = ['bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-gray-500'];
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{item.label}</span>
                        <span className="text-gray-900 font-semibold">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${colors[index % colors.length]} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                No ticket data available
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}