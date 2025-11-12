'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import ResolveTicketModal from '@/components/modals/ResolveTicketModal';
import { useToast } from '@/components/providers/ToastProvider';
import { useConfirmModal } from '@/components/providers/ConfirmModalProvider';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
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
  CogIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// Types
interface TicketDetails {
  id: number;
  ticket_number: string;
  ticket_status: 'open' | 'resolved' | 'closed';
  support_type: 'maintenance' | 'system' | 'user';
  priority: 'low' | 'normal' | 'high';
  issue_description: string;
  resolution_description?: string;
  scheduled_date?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  calculated_hours?: number;
  cost?: number;
  client?: {
    id: number;
    company_name: string;
    primary_phone?: string;
    email?: string;
    street_address?: string;
  };
  equipment?: {
    id: number;
    serial_number: string;
    equipment_name: string;
    equipment_type: string;
    compliance_status: string;
  };
}

interface RelatedTicket {
  id: number;
  ticket_number: string;
  equipment_serial_number?: string;
  issue_description: string;
  ticket_status: 'open' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high';
  scheduled_date?: string;
}

interface UpdateTicketData {
  ticket_status?: 'open' | 'resolved' | 'closed';
  priority?: 'low' | 'normal' | 'high';
  issue_description?: string;
  scheduled_date?: string;
}



export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm } = useConfirmModal();
  
  const ticketId = parseInt(params.id as string);

  // State management
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<RelatedTicket[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form data
  const [editFormData, setEditFormData] = useState<UpdateTicketData>({});

  // Fetch ticket details
  const fetchTicketDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.MAINTENANCE_TICKETS.BY_ID(ticketId);

      logApiCall('GET', url);
      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Ticket not found');
        }
        throw new Error('Failed to fetch ticket details');
      }

      const data = await response.json();
      setTicket(data.data);
      
      // Initialize edit form with current data
      setEditFormData({
        ticket_status: data.data.ticket_status,
        priority: data.data.priority,
        issue_description: data.data.issue_description,
        scheduled_date: data.data.scheduled_date
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket details');
    }
  };

  // Fetch related tickets
  const fetchRelatedTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.MAINTENANCE_TICKETS.RELATED(ticketId);

      logApiCall('GET', url);
      const response = await fetch(url, { headers });

      if (response.ok) {
        const data = await response.json();
        setRelatedTickets(data.data);
      }
    } catch (err) {
      console.error('Error fetching related tickets:', err);
    }
  };



  // Initial data loading
  useEffect(() => {
    if (isNaN(ticketId)) {
      setError('Invalid ticket ID');
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchTicketDetails(),
        fetchRelatedTickets()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [ticketId]);

  // Update ticket handler
  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/vendor/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update ticket');
      }

      showToast('success', 'Ticket updated successfully');
      setShowEditModal(false);
      await fetchTicketDetails();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle resolve ticket success
  const handleResolveSuccess = async () => {
    setShowResolveModal(false);
    showToast('success', 'Ticket resolved successfully');
    await fetchTicketDetails();
  };

  // Close ticket handler
  const handleCloseTicket = async () => {
    const confirmed = await confirm({
      title: 'Close Ticket',
      message: 'Are you sure you want to close this ticket? This action cannot be undone.',
      confirmText: 'Close',
      type: 'danger'
    });

    if (!confirmed) return;

    setIsClosing(true);

    try {
      const response = await fetch(`/api/vendor/tickets/${ticketId}/close`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to close ticket');
      }

      showToast('success', 'Ticket closed successfully');
      await fetchTicketDetails();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to close ticket');
    } finally {
      setIsClosing(false);
    }
  };

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
      hour: '2-digit',
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

  if (!ticket) {
    return (
      <DashboardLayout>
        <ErrorDisplay message="Ticket not found" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/maintenance-tickets"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ticket #{ticket.ticket_number}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(ticket.ticket_status)}`}>
                  {ticket.ticket_status}
                </span>
                <span className="text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Created {formatDateOnly(ticket.created_at)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {ticket.ticket_status === 'open' && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <CheckIcon className="h-4 w-4" />
                  <span>Resolve</span>
                </button>
              </>
            )}
            {ticket.ticket_status === 'resolved' && (
              <button
                onClick={handleCloseTicket}
                disabled={isClosing}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isClosing ? (
                  <LoadingSpinner />
                ) : (
                  <XMarkIcon className="h-4 w-4" />
                )}
                <span>Close</span>
              </button>
            )}
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
                <p className="text-sm font-medium text-gray-600">Type</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{ticket.support_type}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-50 rounded-xl">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Priority</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{ticket.priority}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-xl">
                <ClockIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hours</p>
                <p className="text-lg font-bold text-gray-900">{ticket.calculated_hours ? Number(ticket.calculated_hours).toFixed(1) : '0.0'}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <InformationCircleIcon className="h-5 w-5" />
                  <span>Overview</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'details'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  <span>Details</span>
                </div>
              </button>
              
              {ticket.equipment && (
                <button
                  onClick={() => setActiveTab('equipment')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'equipment'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Cog6ToothIcon className="h-5 w-5" />
                    <span>Equipment</span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Ticket Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <ClipboardDocumentListIcon className="h-5 w-5 text-red-600 mr-2" />
                    Ticket Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border mt-1 ${getStatusBadgeColor(ticket.ticket_status)}`}>
                        {ticket.ticket_status}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border mt-1 ${getPriorityBadgeColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Support Type</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border mt-1 ${getTypeBadgeColor(ticket.support_type)}`}>
                        {ticket.support_type}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created At</label>
                      <p className="text-sm text-gray-900">{formatDate(ticket.created_at)}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Calculated Hours</label>
                      <p className="text-sm text-gray-900">{ticket.calculated_hours ? Number(ticket.calculated_hours).toFixed(1) : '0.0'} hours</p>
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
                    
                    {ticket.cost && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Cost</label>
                        <p className="text-sm text-gray-900">${ticket.cost.toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700">Issue Description</label>
                    <p className="text-sm text-gray-900 mt-1">{ticket.issue_description}</p>
                  </div>

                  {ticket.resolution_description && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700">Resolution Description</label>
                      <p className="text-sm text-gray-900 mt-1">{ticket.resolution_description}</p>
                    </div>
                  )}
                </div>

                {/* Client Information */}
                {ticket.client && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-red-600 mr-2" />
                      Client Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Company Name</label>
                        <p className="text-sm text-gray-900">{ticket.client.company_name}</p>
                      </div>
                      
                      {ticket.client.email && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <p className="text-sm text-gray-900">{ticket.client.email}</p>
                        </div>
                      )}
                      
                      {ticket.client.primary_phone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <p className="text-sm text-gray-900">{ticket.client.primary_phone}</p>
                        </div>
                      )}
                      
                      {ticket.client.street_address && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Address</label>
                          <p className="text-sm text-gray-900">{ticket.client.street_address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Equipment Information */}
                {ticket.equipment && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Cog6ToothIcon className="h-5 w-5 text-red-600 mr-2" />
                      Equipment Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                        <p className="text-sm text-gray-900">{ticket.equipment.serial_number}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                        <p className="text-sm text-gray-900">{ticket.equipment.equipment_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Type</label>
                        <p className="text-sm text-gray-900">{ticket.equipment.equipment_type}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Compliance Status</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                          ticket.equipment.compliance_status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {ticket.equipment.compliance_status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-8">
                {/* Detailed Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-red-600 mr-2" />
                    Detailed Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created At</label>
                      <p className="text-sm text-gray-900">{formatDate(ticket.created_at)}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Updated At</label>
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Calculated Hours</label>
                      <p className="text-sm text-gray-900">
                        {ticket.calculated_hours ? Number(ticket.calculated_hours).toFixed(1) : '0.0'} hours
                      </p>
                    </div>
                    
                    {ticket.cost && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Cost</label>
                        <p className="text-sm text-gray-900">${ticket.cost.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <ClockIcon className="h-5 w-5 text-red-600 mr-2" />
                    Timeline
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Ticket Created</p>
                        <p className="text-xs text-gray-500">{formatDate(ticket.created_at)}</p>
                      </div>
                    </div>
                    
                    {ticket.updated_at !== ticket.created_at && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Last Updated</p>
                          <p className="text-xs text-gray-500">{formatDate(ticket.updated_at)}</p>
                        </div>
                      </div>
                    )}
                    
                    {ticket.resolved_at && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Ticket Resolved</p>
                          <p className="text-xs text-gray-500">{formatDate(ticket.resolved_at)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'equipment' && ticket.equipment && (
              <div className="space-y-8">
                {/* Equipment Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Cog6ToothIcon className="h-5 w-5 text-red-600 mr-2" />
                    Equipment Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                      <p className="text-sm font-medium text-gray-900">{ticket.equipment.serial_number}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                      <p className="text-sm text-gray-900">{ticket.equipment.equipment_name}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Equipment Type</label>
                      <p className="text-sm text-gray-900">{ticket.equipment.equipment_type}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Compliance Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                        ticket.equipment.compliance_status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {ticket.equipment.compliance_status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Equipment Actions */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Equipment Actions</h3>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      This ticket is associated with the equipment listed above. Any maintenance performed should be documented appropriately.
                    </p>
                    
                    <Link
                      href={`/equipment/${ticket.equipment.id}`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-2" />
                      View Full Equipment Details
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Ticket</h3>
              
              <form onSubmit={handleUpdateTicket} className="space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editFormData.ticket_status || ''}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      ticket_status: e.target.value as 'open' | 'resolved' | 'closed'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={editFormData.priority || ''}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      priority: e.target.value as 'low' | 'normal' | 'high'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Issue Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Description
                  </label>
                  <textarea
                    value={editFormData.issue_description || ''}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      issue_description: e.target.value
                    })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the issue in detail..."
                    minLength={10}
                    maxLength={1000}
                  />
                </div>

                {/* Scheduled Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.scheduled_date || ''}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      scheduled_date: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>



                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      // Reset form to original values
                      setEditFormData({
                        ticket_status: ticket.ticket_status,
                        priority: ticket.priority,
                        issue_description: ticket.issue_description,
                        scheduled_date: ticket.scheduled_date
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isUpdating ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Updating...</span>
                      </>
                    ) : (
                      'Update Ticket'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Ticket Modal */}
      <ResolveTicketModal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        onSuccess={handleResolveSuccess}
        ticketNumber={ticket.ticket_number}
        ticketId={ticket.ticket_number}
      />
    </DashboardLayout>
  );
}