'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useToast } from '@/components/providers/ToastProvider';
import { useConfirmModal } from '@/components/providers/ConfirmModalProvider';
import { 
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  FireIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Client {
  id: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  equipment_count: number;
  last_service: string;
  next_service: string;
  status: 'Active' | 'Inactive' | 'Overdue';
  compliance_score: number;
  created_at: string;
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  overdueClients: number;
  newThisMonth: number;
  totalEquipment: number;
  avgComplianceScore: number;
}

export default function VendorClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [clients, setClients] = useState<Client[]>([
    {
      id: 1,
      company_name: 'Royal Hotels Ltd',
      contact_person: 'Kasun Perera',
      email: 'kasun@royalhotels.lk',
      phone: '+94 11 234 5678',
      address: '123 Galle Road, Colombo 03',
      city: 'Colombo',
      equipment_count: 45,
      last_service: '2024-09-15',
      next_service: '2024-12-15',
      status: 'Active',
      compliance_score: 95,
      created_at: '2024-01-15'
    },
    {
      id: 2,
      company_name: 'Tech Innovations',
      contact_person: 'Shalini Fernando',
      email: 'shalini@techinnovations.lk',
      phone: '+94 81 987 6543',
      address: '45 Peradeniya Road, Kandy',
      city: 'Kandy',
      equipment_count: 28,
      last_service: '2024-08-20',
      next_service: '2024-11-20',
      status: 'Active',
      compliance_score: 88,
      created_at: '2024-02-10'
    },
    {
      id: 3,
      company_name: 'City Mall',
      contact_person: 'Dilshan Silva',
      email: 'dilshan@citymall.lk',
      phone: '+94 11 876 5432',
      address: '78 Main Street, Colombo 07',
      city: 'Colombo',
      equipment_count: 67,
      last_service: '2024-07-10',
      next_service: '2024-10-10',
      status: 'Overdue',
      compliance_score: 72,
      created_at: '2023-11-20'
    },
    {
      id: 4,
      company_name: 'Green Valley Resort',
      contact_person: 'Nimali De Silva',
      email: 'nimali@greenvalley.lk',
      phone: '+94 91 345 6789',
      address: '234 Beach Road, Negombo',
      city: 'Negombo',
      equipment_count: 38,
      last_service: '2024-09-30',
      next_service: '2024-12-30',
      status: 'Active',
      compliance_score: 92,
      created_at: '2024-03-05'
    },
    {
      id: 5,
      company_name: 'Ocean View Restaurant',
      contact_person: 'Ruwan Jayasinghe',
      email: 'ruwan@oceanview.lk',
      phone: '+94 38 234 5678',
      address: '56 Coastal Road, Galle',
      city: 'Galle',
      equipment_count: 15,
      last_service: '2024-06-15',
      next_service: '2024-09-15',
      status: 'Overdue',
      compliance_score: 68,
      created_at: '2024-01-30'
    }
  ]);

  const [clientStats] = useState<ClientStats>({
    totalClients: 47,
    activeClients: 42,
    overdueClients: 5,
    newThisMonth: 3,
    totalEquipment: 312,
    avgComplianceScore: 87
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const confirmModal = useConfirmModal();

  // Filter clients based on search and status
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDeleteClient = async (clientId: number, clientName: string) => {
    const confirmed = await confirmModal.danger({
      title: 'Remove Client',
      message: `Are you sure you want to remove ${clientName}? This will also remove all associated equipment and service history. This action cannot be undone.`,
      confirmText: 'Remove Client',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      // Simulate API call
      setClients(clients.filter(c => c.id !== clientId));
      toast.success(`${clientName} has been removed successfully`);
    } catch (err) {
      toast.error('Failed to remove client. Please try again.');
    }
  };

  const handleScheduleService = async (clientId: number, clientName: string) => {
    const confirmed = await confirmModal.confirm({
      title: 'Schedule Service',
      message: `Schedule a service visit for ${clientName}?`,
      confirmText: 'Schedule',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      toast.success(`Service scheduled for ${clientName}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
              <p className="text-gray-600 mt-1">Manage your clients and their fire safety equipment</p>
            </div>
          </div>
          <button className="btn-primary flex items-center space-x-2">
            <PlusIcon className="h-5 w-5" />
            <span>Add New Client</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.totalClients}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.activeClients}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.overdueClients}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlusIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.newThisMonth}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FireIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.totalEquipment}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Compliance</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.avgComplianceScore}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Clients ({filteredClients.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compliance
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
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <BuildingOfficeIcon className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{client.company_name}</div>
                          <div className="text-sm text-gray-500">{client.contact_person}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {client.email}
                        </div>
                        <div className="flex items-center mt-1">
                          <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {client.phone}
                        </div>
                        <div className="flex items-center mt-1">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {client.city}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.equipment_count} items</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>Last: {new Date(client.last_service).toLocaleDateString()}</div>
                        <div className="text-gray-500">Next: {new Date(client.next_service).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getComplianceColor(client.compliance_score)}`}>
                        {client.compliance_score}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button className="text-blue-600 hover:text-blue-800 transition-colors">
                        View
                      </button>
                      <button className="text-green-600 hover:text-green-800 transition-colors">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleScheduleService(client.id, client.company_name)}
                        className="text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        Schedule
                      </button>
                      <button 
                        onClick={() => handleDeleteClient(client.id, client.company_name)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        Remove
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