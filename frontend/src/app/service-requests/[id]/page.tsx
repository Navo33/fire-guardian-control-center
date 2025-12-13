'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import RequireRole from '@/components/auth/RequireRole';
import { useToast } from '@/components/providers/ToastProvider';
import { API_ENDPOINTS } from '@/config/api';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  FireIcon,
  UserIcon,
  InformationCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// Types
interface ServiceRequestDetails {
  id: number;
  ticket_number: string;
  status: 'open' | 'resolved' | 'closed';
  type: 'maintenance' | 'system' | 'user';
  priority: 'low' | 'normal' | 'high';
  issue_description: string;
  resolution_description?: string;
  scheduled_date?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  actual_hours?: number;
  equipment_name?: string;
  serial_number?: string;
  equipment_type?: string;
  compliance_status?: string;
  vendor_name?: string;
  vendor_email?: string;
  vendor_phone?: string;
  vendor_address?: string;
  technician_name?: string;
  technician_email?: string;
}

export default function ServiceRequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  
  const ticketId = parseInt(params.id as string);

  // State management
  const [ticket, setTicket] = useState<ServiceRequestDetails | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch ticket details
  const fetchTicketDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(API_ENDPOINTS.CLIENT.SERVICE_REQUEST_BY_ID(ticketId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Service request not found');
        }
        throw new Error('Failed to fetch service request details');
      }

      const data = await response.json();
      setTicket(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service request details');
    }
  };

  // Initial data loading
  useEffect(() => {
    if (isNaN(ticketId)) {
      setError('Invalid service request ID');
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      await fetchTicketDetails();
      setIsLoading(false);
    };

    loadData();
  }, [ticketId]);

  // Helper functions
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'normal': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'maintenance': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'system': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'user': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
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

  if (!ticket) {
    return (
      <RequireRole allowedRoles={['client']}>
        <DashboardLayout>
          <ErrorDisplay message="Service request not found" />
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
            <div className="flex items-center space-x-4">
              <Link
                href="/service-requests"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Service Request #{ticket.ticket_number}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Created {formatDateOnly(ticket.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Request Type</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">{ticket.type}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Priority</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">{ticket.priority}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-xl">
                  <ClockIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Hours Logged</p>
                  <p className="text-lg font-bold text-gray-900">{ticket.actual_hours ? Number(ticket.actual_hours).toFixed(1) : '0.0'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100">
            {/* Tab Navigation */}
            <div className="border-b border-gray-100">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <InformationCircleIcon className="h-5 w-5 inline mr-2" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('equipment')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'equipment'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FireIcon className="h-5 w-5 inline mr-2" />
                  Equipment
                </button>
                <button
                  onClick={() => setActiveTab('vendor')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'vendor'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
                  Service Provider
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-red-600 mr-2" />
                    Request Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border mt-1 ${getStatusBadgeColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border mt-1 ${getPriorityBadgeColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Service Type</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border mt-1 ${getTypeBadgeColor(ticket.type)}`}>
                        {ticket.type}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created At</label>
                      <p className="text-sm text-gray-900">{formatDate(ticket.created_at)}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                      <p className="text-sm text-gray-900">{formatDate(ticket.updated_at)}</p>
                    </div>
                    
                    {ticket.scheduled_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Scheduled Date</label>
                        <p className="text-sm text-gray-900">{formatDateOnly(ticket.scheduled_date)}</p>
                      </div>
                    )}
                    
                    {ticket.resolved_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Resolved At</label>
                        <p className="text-sm text-gray-900">{formatDate(ticket.resolved_at)}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700">Issue Description</label>
                    <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">{ticket.issue_description}</p>
                  </div>

                  {ticket.resolution_description && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700">Resolution Description</label>
                      <p className="text-sm text-gray-900 mt-1 bg-green-50 p-3 rounded-lg">{ticket.resolution_description}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'equipment' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FireIcon className="h-5 w-5 text-red-600 mr-2" />
                    Equipment Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                      <p className="text-sm text-gray-900">{ticket.equipment_name || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                      <p className="text-sm text-gray-900">{ticket.serial_number || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Equipment Type</label>
                      <p className="text-sm text-gray-900">{ticket.equipment_type || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Compliance Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        ticket.compliance_status === 'compliant' 
                          ? 'bg-green-100 text-green-800' 
                          : ticket.compliance_status === 'non-compliant'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.compliance_status || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'vendor' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 text-red-600 mr-2" />
                    Service Provider Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company Name</label>
                      <p className="text-sm text-gray-900">{ticket.vendor_name || 'Not assigned'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                      <p className="text-sm text-gray-900">{ticket.vendor_email || 'Not provided'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <p className="text-sm text-gray-900">{ticket.vendor_phone || 'Not provided'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="text-sm text-gray-900">{ticket.vendor_address || 'Not provided'}</p>
                    </div>
                  </div>

                  {ticket.technician_name && ticket.technician_name !== 'Not Assigned' && (
                    <div className="mt-8">
                      <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                        <UserIcon className="h-4 w-4 text-red-600 mr-2" />
                        Assigned Technician
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Technician Name</label>
                          <p className="text-sm text-gray-900">{ticket.technician_name}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Technician Email</label>
                          <p className="text-sm text-gray-900">{ticket.technician_email || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}