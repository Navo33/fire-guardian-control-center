'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useToast } from '@/components/providers/ToastProvider';
import { useConfirmModal } from '@/components/providers/ConfirmModalProvider';
import { 
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

interface ServiceRequest {
  id: number;
  client_name: string;
  client_id: number;
  equipment_type: string;
  equipment_location: string;
  request_type: 'Inspection' | 'Maintenance' | 'Repair' | 'Installation' | 'Emergency';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  description: string;
  requested_date: string;
  scheduled_date?: string;
  completed_date?: string;
  assigned_technician?: string;
  estimated_cost?: number;
  actual_cost?: number;
}

interface ServiceRequestStats {
  totalRequests: number;
  openRequests: number;
  inProgressRequests: number;
  completedThisMonth: number;
  urgentRequests: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  monthlyRevenue: number;
}

export default function VendorServiceRequestsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const confirmModal = useConfirmModal();
  
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([
    {
      id: 1,
      client_name: 'Royal Hotels Ltd',
      client_id: 1,
      equipment_type: 'Fire Extinguisher',
      equipment_location: 'Lobby - Ground Floor',
      request_type: 'Maintenance',
      priority: 'High',
      status: 'Open',
      description: 'Annual maintenance required for ABC powder fire extinguisher',
      requested_date: '2024-10-20',
      estimated_cost: 2500,
      assigned_technician: 'Pradeep Silva'
    },
    {
      id: 2,
      client_name: 'Tech Innovations',
      client_id: 2,
      equipment_type: 'Fire Alarm System',
      equipment_location: 'Server Room - 2nd Floor',
      request_type: 'Inspection',
      priority: 'Medium',
      status: 'In Progress',
      description: 'Quarterly inspection of addressable fire alarm system',
      requested_date: '2024-10-18',
      scheduled_date: '2024-10-24',
      estimated_cost: 5000,
      assigned_technician: 'Kumara Perera'
    },
    {
      id: 3,
      client_name: 'City Mall',
      client_id: 3,
      equipment_type: 'Sprinkler System',
      equipment_location: 'Food Court Area',
      request_type: 'Repair',
      priority: 'Urgent',
      status: 'Open',
      description: 'Sprinkler head damaged, immediate replacement required',
      requested_date: '2024-10-22',
      estimated_cost: 3500
    },
    {
      id: 4,
      client_name: 'Green Valley Resort',
      client_id: 4,
      equipment_type: 'Emergency Lighting',
      equipment_location: 'Exit Routes - All Floors',
      request_type: 'Installation',
      priority: 'Medium',
      status: 'Completed',
      description: 'Install LED emergency lighting units at all exit points',
      requested_date: '2024-10-15',
      scheduled_date: '2024-10-20',
      completed_date: '2024-10-22',
      estimated_cost: 12000,
      actual_cost: 11500,
      assigned_technician: 'Nimal Fernando'
    },
    {
      id: 5,
      client_name: 'Office Complex Pvt Ltd',
      client_id: 5,
      equipment_type: 'Fire Door',
      equipment_location: 'Stairwell B - 3rd Floor',
      request_type: 'Repair',
      priority: 'High',
      status: 'In Progress',
      description: 'Fire door closer mechanism faulty, not closing properly',
      requested_date: '2024-10-21',
      scheduled_date: '2024-10-25',
      estimated_cost: 1500,
      assigned_technician: 'Pradeep Silva'
    }
  ]);

  const [serviceStats] = useState<ServiceRequestStats>({
    totalRequests: 156,
    openRequests: 23,
    inProgressRequests: 8,
    completedThisMonth: 45,
    urgentRequests: 3,
    averageResponseTime: 2.5,
    customerSatisfaction: 4.6,
    monthlyRevenue: 385000
  });

  const requestTypes = ['All', 'Inspection', 'Maintenance', 'Repair', 'Installation', 'Emergency'];
  const priorities = ['All', 'Low', 'Medium', 'High', 'Urgent'];

  // Filter requests based on search and filters
  const filteredRequests = serviceRequests.filter(request => {
    const matchesSearch = 
      request.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.equipment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.equipment_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.assigned_technician && request.assigned_technician.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'All' || request.request_type === typeFilter;
    const matchesStatus = statusFilter === 'All' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || request.priority === priorityFilter;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low':
        return 'bg-gray-100 text-gray-800';
      case 'Medium':
        return 'bg-blue-100 text-blue-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Inspection':
        return 'bg-purple-50 text-purple-700';
      case 'Maintenance':
        return 'bg-blue-50 text-blue-700';
      case 'Repair':
        return 'bg-orange-50 text-orange-700';
      case 'Installation':
        return 'bg-green-50 text-green-700';
      case 'Emergency':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const handleCreateRequest = async () => {
    const confirmed = await confirmModal.confirm({
      title: 'Create New Service Request',
      message: 'Start creating a new service request?',
      confirmText: 'Continue',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      toast.success('Opening service request form...');
      // In real implementation, this would navigate to a form or open a modal
    }
  };

  const handleCompleteRequest = async (requestId: number, clientName: string) => {
    const confirmed = await confirmModal.confirm({
      title: 'Complete Service Request',
      message: `Mark this service request for ${clientName} as completed?`,
      confirmText: 'Mark Complete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      setServiceRequests(requests => 
        requests.map(req => 
          req.id === requestId 
            ? { ...req, status: 'Completed' as const, completed_date: new Date().toISOString().split('T')[0] }
            : req
        )
      );
      toast.success(`Service request for ${clientName} marked as completed`);
    } catch (err) {
      toast.error('Failed to update service request. Please try again.');
    }
  };

  const handleAssignTechnician = async (requestId: number, clientName: string) => {
    const confirmed = await confirmModal.confirm({
      title: 'Assign Technician',
      message: `Assign a technician to the service request for ${clientName}?`,
      confirmText: 'Assign',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      toast.success(`Technician assigned to ${clientName}'s request`);
    }
  };

  const handleCancelRequest = async (requestId: number, clientName: string) => {
    const confirmed = await confirmModal.danger({
      title: 'Cancel Service Request',
      message: `Are you sure you want to cancel this service request for ${clientName}? This action cannot be undone.`,
      confirmText: 'Cancel Request',
      cancelText: 'Keep Request'
    });

    if (!confirmed) return;

    try {
      setServiceRequests(requests => 
        requests.map(req => 
          req.id === requestId 
            ? { ...req, status: 'Cancelled' as const }
            : req
        )
      );
      toast.success(`Service request for ${clientName} has been cancelled`);
    } catch (err) {
      toast.error('Failed to cancel service request. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <WrenchScrewdriverIcon className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Maintenance Tickets</h1>
              <p className="text-gray-600 mt-1">Manage client service requests and maintenance schedules</p>
            </div>
          </div>
          <button 
            onClick={handleCreateRequest}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Ticket</span>
          </button>
        </div>

        {/* Stats Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{serviceStats.totalRequests}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Open</p>
                  <p className="text-2xl font-bold text-gray-900">{serviceStats.openRequests}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <WrenchScrewdriverIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{serviceStats.inProgressRequests}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Urgent</p>
                  <p className="text-2xl font-bold text-gray-900">{serviceStats.urgentRequests}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search maintenance tickets by client, equipment, or ticket ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-field appearance-none pr-8 min-w-[120px]"
              >
                {requestTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDownIcon className="h-5 w-5 absolute right-2 top-3 text-gray-400" />
            </div>
            
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field appearance-none pr-8 min-w-[120px]"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <ChevronDownIcon className="h-5 w-5 absolute right-2 top-3 text-gray-400" />
            </div>

            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="input-field appearance-none pr-8 min-w-[120px]"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
              <ChevronDownIcon className="h-5 w-5 absolute right-2 top-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Service Requests Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Maintenance Tickets ({filteredRequests.length})
            </h3>
          </div>

          {/* Loading State */}
          {isLoading && (
            <LoadingSpinner text="Loading maintenance tickets..." />
          )}

          {/* Error State */}
          {error && !isLoading && (
            <ErrorDisplay 
              message={error}
              action={{
                label: 'Try Again',
                onClick: () => window.location.reload()
              }}
            />
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance tickets found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || typeFilter !== 'All' || statusFilter !== 'All' || priorityFilter !== 'All'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first maintenance ticket.'}
              </p>
            </div>
          )}

          {/* Table */}
          {!isLoading && !error && filteredRequests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      Request Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      Client & Equipment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      Priority & Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      Dates & Technician
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      Cost & Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50"
>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">#{request.id}</div>
                        <div className="text-sm text-gray-600 mt-1 max-w-xs truncate">{request.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{request.client_name}</div>
                        <div className="text-sm text-gray-600">{request.equipment_type}</div>
                        <div className="text-xs text-gray-500 mt-1">{request.equipment_location}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(request.priority)}`}>
                            {request.priority}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${getTypeColor(request.request_type)}`}>
                            {request.request_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>Requested: {new Date(request.requested_date).toLocaleDateString()}</div>
                        {request.scheduled_date && (
                          <div className="text-blue-600">Scheduled: {new Date(request.scheduled_date).toLocaleDateString()}</div>
                        )}
                        {request.completed_date && (
                          <div className="text-green-600">Completed: {new Date(request.completed_date).toLocaleDateString()}</div>
                        )}
                        {request.assigned_technician && (
                          <div className="text-purple-600 text-xs mt-1">{request.assigned_technician}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {request.estimated_cost && (
                            <div>Est: LKR {request.estimated_cost.toLocaleString()}</div>
                          )}
                          {request.actual_cost && (
                            <div className="text-green-600">Actual: LKR {request.actual_cost.toLocaleString()}</div>
                          )}
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium space-x-3">
                        <button className="text-blue-600 hover:text-blue-800 transition-colors">
                          View
                        </button>
                        {request.status === 'Open' && !request.assigned_technician && (
                          <button 
                            onClick={() => handleAssignTechnician(request.id, request.client_name)}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                          >
                            Assign
                          </button>
                        )}
                        {(request.status === 'Open' || request.status === 'In Progress') && (
                          <button 
                            onClick={() => handleCompleteRequest(request.id, request.client_name)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        {request.status !== 'Completed' && request.status !== 'Cancelled' && (
                          <button 
                            onClick={() => handleCancelRequest(request.id, request.client_name)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}