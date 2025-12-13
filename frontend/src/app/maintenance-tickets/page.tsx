'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import CreateTicketModal from '@/components/modals/CreateTicketModal';
import { useToast } from '@/components/providers/ToastProvider';
import { API_ENDPOINTS, buildApiUrl } from '@/config/api';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  UserIcon,
  CalendarIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

// Types
interface MaintenanceTicket {
  id: number;
  ticket_number: string;
  equipment?: string;
  client_name?: string;
  status: 'open' | 'resolved' | 'closed';
  type: 'maintenance' | 'system' | 'user';
  priority: 'low' | 'normal' | 'high';
  issue: string;
  scheduled_date?: string;
  created_at?: string;
  updated_at?: string;
  assigned_technician_name?: string;
}

interface TicketKPIs {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  high_priority_tickets: number;
  overdue_tickets: number;
  avg_resolution_time_hours?: number;
}

interface ClientOption {
  id: number;
  company_name: string;
}

interface EquipmentOption {
  id: number;
  serial_number: string;
  equipment_name: string;
}

interface TechnicianOption {
  id: number;
  display_name: string;
}

interface DropdownOption {
  id: number;
  name: string;
}

interface CreateTicketData {
  equipment_instance_id?: number;
  client_id?: number;
  type: 'maintenance' | 'system' | 'user';
  issue: string;
  priority: 'low' | 'normal' | 'high';
  scheduled_date?: string;
  assigned_technician?: number;
}

interface VendorProfile {
  company_name: string;
  user: {
    display_name: string;
    avatar_url?: string;
  };
}

export default function MaintenanceTicketsPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  
  // State management
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [kpis, setKPIs] = useState<TicketKPIs | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Modal and form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateTicketData>({
    type: 'maintenance',
    issue: '',
    priority: 'normal'
  });
  
  // Dropdown data
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(10);

  // API fetch functions
  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await fetch(`${API_ENDPOINTS.MAINTENANCE_TICKETS.LIST}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch tickets');

      const data = await response.json();
      setTickets(data.data.tickets || []);
      setTotalCount(data.data.pagination?.total || 0);
      setTotalPages(Math.ceil((data.data.pagination?.total || 0) / itemsPerPage));
      
      // Update KPIs from the main response if available
      if (data.data.total_tickets !== undefined) {
        setKPIs({
          total_tickets: data.data.total_tickets || 0,
          open_tickets: data.data.open_tickets || 0,
          resolved_tickets: data.data.resolved_tickets || 0,
          closed_tickets: 0, // Not provided in new response
          high_priority_tickets: data.data.high_priority || 0,
          overdue_tickets: 0, // Not provided in new response
          avg_resolution_time_hours: undefined
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    }
  }, [currentPage, searchTerm, statusFilter, typeFilter, priorityFilter]);

  const fetchKPIs = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.MAINTENANCE_TICKETS.KPIS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch KPI data');

      const data = await response.json();
      setKPIs(data.data);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  const fetchVendorProfile = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PROFILE.GET, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch vendor profile');

      const data = await response.json();
      setVendorProfile(data.data);
    } catch (err) {
      console.error('Error fetching vendor profile:', err);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [clientsRes, equipmentRes, techniciansRes] = await Promise.all([
        fetch(API_ENDPOINTS.MAINTENANCE_TICKETS.CLIENTS, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(API_ENDPOINTS.MAINTENANCE_TICKETS.EQUIPMENT, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(API_ENDPOINTS.MAINTENANCE_TICKETS.TECHNICIANS, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData.data);
      }

      if (equipmentRes.ok) {
        const equipmentData = await equipmentRes.json();
        setEquipment(equipmentData.data);
      }

      if (techniciansRes.ok) {
        const techniciansData = await techniciansRes.json();
        setTechnicians(techniciansData.data);
      }
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  // Initial data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchTickets(),
        fetchKPIs(),
        fetchVendorProfile(),
        fetchDropdownData()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchTickets]);

  // Handle ticket click
  const handleTicketClick = (ticketId: number) => {
    router.push(`/maintenance-tickets/${ticketId}`);
  };

  // Create ticket handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch(API_ENDPOINTS.MAINTENANCE_TICKETS.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(createFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create ticket');
      }

      const data = await response.json();
      showSuccess('Ticket created successfully');
      setShowCreateModal(false);
      setCreateFormData({
        type: 'maintenance',
        issue: '',
        priority: 'normal'
      });
      
      // Refresh data
      await Promise.all([fetchTickets(), fetchKPIs()]);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setIsCreating(false);
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
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
    setCurrentPage(1);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <WrenchScrewdriverIcon className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Maintenance Tickets</h1>
              <p className="text-gray-600 mt-1">
                {vendorProfile?.company_name ? `${vendorProfile.company_name} - Manage equipment maintenance and service requests` : 'Manage equipment maintenance and service requests'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Ticket</span>
          </button>
        </div>

        {/* Stats Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.total_tickets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Open Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.open_tickets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">High Priority</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.high_priority_tickets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Resolved</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.resolved_tickets}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets by number, client, equipment, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field appearance-none pr-8 min-w-[120px]"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <ChevronDownIcon className="h-4 w-4 absolute right-2 top-3 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="input-field appearance-none pr-8 min-w-[120px]"
                >
                  <option value="all">All Types</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="system">System</option>
                  <option value="user">User</option>
                </select>
                <ChevronDownIcon className="h-4 w-4 absolute right-2 top-3 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="input-field appearance-none pr-8 min-w-[120px]"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDownIcon className="h-4 w-4 absolute right-2 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Maintenance Tickets ({tickets.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Ticket Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Client & Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Priority & Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Status & Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
              {tickets.map((ticket) => (
                <tr 
                  key={ticket.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTicketClick(ticket.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                          <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">#{ticket.ticket_number}</div>
                        <div className="text-sm text-gray-500">{ticket.issue ? truncateText(ticket.issue, 50) : 'No description'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{ticket.client_name || 'Unassigned'}</div>
                    <div className="text-sm text-gray-500">{ticket.equipment ? `Equipment: ${ticket.equipment}` : 'No equipment'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <div className="text-sm text-gray-500 mt-1">{ticket.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <div className="text-sm text-gray-500 mt-1">
                      {ticket.scheduled_date ? formatDate(ticket.scheduled_date) : 'Not scheduled'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/maintenance-tickets/${ticket.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        View
                      </Link>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: Handle edit
                        }}
                        className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-6 py-4 border-t border-gray-100">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, totalCount)} of{' '}
                {totalCount} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          showSuccess('Maintenance ticket created successfully');
          // Refresh the tickets list
          fetchTickets();
        }}
        userType="vendor"
      />
    </DashboardLayout>
  );
}
