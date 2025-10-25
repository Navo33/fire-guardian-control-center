'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useToast } from '@/components/providers/ToastProvider';
import { useConfirmModal } from '@/components/providers/ConfirmModalProvider';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  UserIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CogIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
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
  actual_hours?: number;
  cost?: number;
  assigned_technician_name?: string;
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
  assigned_technician?: number;
}

interface ResolveTicketData {
  resolution_description: string;
  actual_hours?: number;
  cost?: number;
}

interface DropdownOption {
  id: number;
  name: string;
}

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { showConfirmModal } = useConfirmModal();
  
  const ticketId = parseInt(params.id as string);

  // State management
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<RelatedTicket[]>([]);
  const [technicians, setTechnicians] = useState<DropdownOption[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  
  // Form data
  const [editFormData, setEditFormData] = useState<UpdateTicketData>({});
  const [resolveFormData, setResolveFormData] = useState<ResolveTicketData>({
    resolution_description: ''
  });

  // Fetch ticket details
  const fetchTicketDetails = async () => {
    try {
      const response = await fetch(`/api/vendor/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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
        scheduled_date: data.data.scheduled_date,
        assigned_technician: data.data.assigned_technician
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket details');
    }
  };

  // Fetch related tickets
  const fetchRelatedTickets = async () => {
    try {
      const response = await fetch(`/api/vendor/tickets/${ticketId}/related`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRelatedTickets(data.data);
      }
    } catch (err) {
      console.error('Error fetching related tickets:', err);
    }
  };

  // Fetch technicians for dropdown
  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/vendor/tickets/technicians', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTechnicians(data.data);
      }
    } catch (err) {
      console.error('Error fetching technicians:', err);
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
        fetchRelatedTickets(),
        fetchTechnicians()
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

  // Resolve ticket handler
  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResolving(true);

    try {
      const response = await fetch(`/api/vendor/tickets/${ticketId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(resolveFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resolve ticket');
      }

      showToast('success', 'Ticket resolved successfully');
      setShowResolveModal(false);
      setResolveFormData({ resolution_description: '' });
      await fetchTicketDetails();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to resolve ticket');
    } finally {
      setIsResolving(false);
    }
  };

  // Close ticket handler
  const handleCloseTicket = async () => {
    const confirmed = await showConfirmModal(
      'Close Ticket',
      'Are you sure you want to close this ticket? This action cannot be undone.',
      'Close',
      'destructive'
    );

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/maintenance-tickets"
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Ticket Details - {ticket.ticket_number}
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                {ticket.support_type} ticket for {ticket.client?.company_name || 'System/User support'}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            {ticket.ticket_status === 'open' && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
                >
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
                >
                  <CheckIcon className="h-5 w-5 mr-2" />
                  Resolve
                </button>
              </>
            )}
            {ticket.ticket_status === 'resolved' && (
              <button
                onClick={handleCloseTicket}
                disabled={isClosing}
                className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClosing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <XMarkIcon className="h-5 w-5 mr-2" />
                )}
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ClipboardDocumentListIcon className="h-6 w-6 mr-2 text-blue-600" />
              Ticket Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Technician</label>
                <p className="mt-1 text-sm text-gray-900">{ticket.assigned_technician_name || 'Unassigned'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(ticket.created_at)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Updated At</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(ticket.updated_at)}</p>
              </div>
              
              {ticket.scheduled_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scheduled Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateOnly(ticket.scheduled_date)}</p>
                </div>
              )}
              
              {ticket.resolved_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resolved At</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(ticket.resolved_at)}</p>
                </div>
              )}
              
              {ticket.actual_hours && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Actual Hours</label>
                  <p className="mt-1 text-sm text-gray-900">{ticket.actual_hours} hours</p>
                </div>
              )}
              
              {ticket.cost && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost</label>
                  <p className="mt-1 text-sm text-gray-900">${ticket.cost.toFixed(2)}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Issue Description</label>
              <p className="mt-2 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{ticket.issue_description}</p>
            </div>
            
            {ticket.resolution_description && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">Resolution Description</label>
                <p className="mt-2 text-sm text-gray-900 bg-green-50 p-3 rounded-md">{ticket.resolution_description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Associated Client */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BuildingOfficeIcon className="h-6 w-6 mr-2 text-blue-600" />
              Associated Client
            </h3>
            
            {ticket.client ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Company</label>
                  <p className="mt-1 text-sm font-medium text-gray-900">{ticket.client.company_name}</p>
                </div>
                {ticket.client.primary_phone && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{ticket.client.primary_phone}</p>
                  </div>
                )}
                {ticket.client.email && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{ticket.client.email}</p>
                  </div>
                )}
                {ticket.client.street_address && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{ticket.client.street_address}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No Client Assigned</p>
            )}
          </div>

          {/* Associated Equipment */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CogIcon className="h-6 w-6 mr-2 text-blue-600" />
              Associated Equipment
            </h3>
            
            {ticket.equipment ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Serial Number</label>
                  <p className="mt-1 text-sm font-medium text-gray-900">{ticket.equipment.serial_number}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Equipment Name</label>
                  <p className="mt-1 text-sm text-gray-900">{ticket.equipment.equipment_name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
                  <p className="mt-1 text-sm text-gray-900">{ticket.equipment.equipment_type}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Compliance Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                    ticket.equipment.compliance_status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {ticket.equipment.compliance_status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No Equipment Assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* Related Tickets */}
      {relatedTickets.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Tickets</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {relatedTickets.map((relatedTicket) => (
                  <tr key={relatedTicket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">
                        {relatedTicket.ticket_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {relatedTicket.equipment_serial_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {relatedTicket.issue_description.length > 50 
                          ? `${relatedTicket.issue_description.substring(0, 50)}...` 
                          : relatedTicket.issue_description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(relatedTicket.ticket_status)}`}>
                        {relatedTicket.ticket_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityBadgeColor(relatedTicket.priority)}`}>
                        {relatedTicket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {relatedTicket.scheduled_date ? formatDateOnly(relatedTicket.scheduled_date) : 'Not scheduled'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/maintenance-tickets/${relatedTicket.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

                {/* Assigned Technician */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Technician
                  </label>
                  <select
                    value={editFormData.assigned_technician || ''}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      assigned_technician: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a technician...</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
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
                        scheduled_date: ticket.scheduled_date,
                        assigned_technician: undefined
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

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resolve Ticket</h3>
              
              <form onSubmit={handleResolveTicket} className="space-y-4">
                {/* Resolution Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution Description *
                  </label>
                  <textarea
                    value={resolveFormData.resolution_description}
                    onChange={(e) => setResolveFormData({
                      ...resolveFormData,
                      resolution_description: e.target.value
                    })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe how the issue was resolved..."
                    required
                    minLength={10}
                    maxLength={1000}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {resolveFormData.resolution_description.length}/1000 characters
                  </p>
                </div>

                {/* Actual Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actual Hours (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="999.99"
                    value={resolveFormData.actual_hours || ''}
                    onChange={(e) => setResolveFormData({
                      ...resolveFormData,
                      actual_hours: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="999999.99"
                      value={resolveFormData.cost || ''}
                      onChange={(e) => setResolveFormData({
                        ...resolveFormData,
                        cost: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResolveModal(false);
                      setResolveFormData({ resolution_description: '' });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResolving || !resolveFormData.resolution_description.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isResolving ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Resolving...</span>
                      </>
                    ) : (
                      'Resolve Ticket'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}