'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useToast } from '@/components/providers/ToastProvider';
import { useConfirmModal } from '@/components/providers/ConfirmModalProvider';
import { 
  FireIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Equipment {
  id: number;
  type: string;
  model: string;
  serial_number: string;
  client_name: string;
  client_id: number;
  location: string;
  installation_date: string;
  last_inspection: string;
  next_inspection: string;
  last_maintenance: string;
  next_maintenance: string;
  status: 'Active' | 'Maintenance Required' | 'Overdue' | 'Out of Service';
  compliance_status: 'Compliant' | 'Warning' | 'Non-Compliant';
  warranty_expiry: string;
  notes?: string;
}

interface EquipmentStats {
  totalEquipment: number;
  activeEquipment: number;
  maintenanceRequired: number;
  overdueEquipment: number;
  outOfService: number;
  compliantEquipment: number;
  warningEquipment: number;
  nonCompliantEquipment: number;
}

export default function VendorEquipmentPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  
  const [equipment, setEquipment] = useState<Equipment[]>([
    {
      id: 1,
      type: 'Fire Extinguisher',
      model: 'ABC Powder 5kg',
      serial_number: 'FE001234',
      client_name: 'Royal Hotels Ltd',
      client_id: 1,
      location: 'Lobby - Ground Floor',
      installation_date: '2023-06-15',
      last_inspection: '2024-09-15',
      next_inspection: '2024-12-15',
      last_maintenance: '2024-06-15',
      next_maintenance: '2025-06-15',
      status: 'Active',
      compliance_status: 'Compliant',
      warranty_expiry: '2028-06-15'
    },
    {
      id: 2,
      type: 'Sprinkler System',
      model: 'Wet Pipe System',
      serial_number: 'SP005678',
      client_name: 'Tech Innovations',
      client_id: 2,
      location: 'Server Room - 2nd Floor',
      installation_date: '2023-03-20',
      last_inspection: '2024-08-20',
      next_inspection: '2024-11-20',
      last_maintenance: '2024-03-20',
      next_maintenance: '2025-03-20',
      status: 'Active',
      compliance_status: 'Compliant',
      warranty_expiry: '2028-03-20'
    },
    {
      id: 3,
      type: 'Fire Alarm',
      model: 'Addressable System',
      serial_number: 'FA009876',
      client_name: 'City Mall',
      client_id: 3,
      location: 'Central Control - Security Office',
      installation_date: '2022-11-10',
      last_inspection: '2024-07-10',
      next_inspection: '2024-10-10',
      last_maintenance: '2024-05-10',
      next_maintenance: '2024-11-10',
      status: 'Overdue',
      compliance_status: 'Non-Compliant',
      warranty_expiry: '2027-11-10'
    },
    {
      id: 4,
      type: 'Emergency Lighting',
      model: 'LED Exit Sign',
      serial_number: 'EL004321',
      client_name: 'Green Valley Resort',
      client_id: 4,
      location: 'Main Exit - Reception',
      installation_date: '2024-01-15',
      last_inspection: '2024-09-30',
      next_inspection: '2024-12-30',
      last_maintenance: '2024-07-15',
      next_maintenance: '2025-01-15',
      status: 'Active',
      compliance_status: 'Compliant',
      warranty_expiry: '2027-01-15'
    },
    {
      id: 5,
      type: 'Fire Extinguisher',
      model: 'CO2 2kg',
      serial_number: 'FE005555',
      client_name: 'Ocean View Restaurant',
      client_id: 5,
      location: 'Kitchen - Near Stove',
      installation_date: '2023-02-10',
      last_inspection: '2024-06-15',
      next_inspection: '2024-09-15',
      last_maintenance: '2024-02-10',
      next_maintenance: '2025-02-10',
      status: 'Maintenance Required',
      compliance_status: 'Warning',
      warranty_expiry: '2028-02-10'
    },
    {
      id: 6,
      type: 'Sprinkler Head',
      model: 'Standard Response',
      serial_number: 'SH007777',
      client_name: 'Royal Hotels Ltd',
      client_id: 1,
      location: 'Room 205',
      installation_date: '2023-06-15',
      last_inspection: '2024-09-15',
      next_inspection: '2024-12-15',
      last_maintenance: '2024-06-15',
      next_maintenance: '2025-06-15',
      status: 'Out of Service',
      compliance_status: 'Non-Compliant',
      warranty_expiry: '2028-06-15',
      notes: 'Damaged during renovation'
    }
  ]);

  const [equipmentStats] = useState<EquipmentStats>({
    totalEquipment: 312,
    activeEquipment: 278,
    maintenanceRequired: 18,
    overdueEquipment: 12,
    outOfService: 4,
    compliantEquipment: 265,
    warningEquipment: 35,
    nonCompliantEquipment: 12
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const confirmModal = useConfirmModal();

  const equipmentTypes = ['All', 'Fire Extinguisher', 'Sprinkler System', 'Fire Alarm', 'Emergency Lighting', 'Sprinkler Head'];
  const clients = ['All', 'Royal Hotels Ltd', 'Tech Innovations', 'City Mall', 'Green Valley Resort', 'Ocean View Restaurant'];

  // Filter equipment based on search and filters
  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = 
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'All' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesClient = clientFilter === 'All' || item.client_name === clientFilter;

    return matchesSearch && matchesType && matchesStatus && matchesClient;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Maintenance Required':
        return 'bg-yellow-100 text-yellow-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      case 'Out of Service':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'Compliant':
        return 'text-green-600';
      case 'Warning':
        return 'text-yellow-600';
      case 'Non-Compliant':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'Compliant':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'Warning':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case 'Non-Compliant':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleDeleteEquipment = async (equipmentId: number, equipmentName: string) => {
    const confirmed = await confirmModal.danger({
      title: 'Remove Equipment',
      message: `Are you sure you want to remove ${equipmentName}? This will delete all maintenance history and records. This action cannot be undone.`,
      confirmText: 'Remove Equipment',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      setEquipment(equipment.filter(e => e.id !== equipmentId));
      toast.success(`${equipmentName} has been removed successfully`);
    } catch (err) {
      toast.error('Failed to remove equipment. Please try again.');
    }
  };

  const handleScheduleMaintenance = async (equipmentId: number, equipmentName: string) => {
    const confirmed = await confirmModal.confirm({
      title: 'Schedule Maintenance',
      message: `Schedule maintenance for ${equipmentName}?`,
      confirmText: 'Schedule',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      toast.success(`Maintenance scheduled for ${equipmentName}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <FireIcon className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
              <p className="text-gray-600 mt-1">Monitor and maintain fire safety equipment</p>
            </div>
          </div>
          <button className="btn-primary flex items-center space-x-2">
            <PlusIcon className="h-5 w-5" />
            <span>Add Equipment</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FireIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                <p className="text-2xl font-bold text-gray-900">{equipmentStats.totalEquipment}</p>
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
                <p className="text-2xl font-bold text-gray-900">{equipmentStats.activeEquipment}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Maintenance Required</p>
                <p className="text-2xl font-bold text-gray-900">{equipmentStats.maintenanceRequired}</p>
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
                <p className="text-2xl font-bold text-gray-900">{equipmentStats.overdueEquipment}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl mb-3">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{equipmentStats.compliantEquipment}</p>
            <p className="text-sm text-gray-600">Compliant Equipment</p>
            <p className="text-xs text-green-600 mt-1">{Math.round((equipmentStats.compliantEquipment / equipmentStats.totalEquipment) * 100)}% of total</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-50 rounded-xl mb-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{equipmentStats.warningEquipment}</p>
            <p className="text-sm text-gray-600">Warning Status</p>
            <p className="text-xs text-yellow-600 mt-1">Requires attention</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-xl mb-3">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{equipmentStats.nonCompliantEquipment}</p>
            <p className="text-sm text-gray-600">Non-Compliant</p>
            <p className="text-xs text-red-600 mt-1">Immediate action required</p>
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
                  placeholder="Search equipment..."
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
                {equipmentTypes.map(type => (
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
                <option value="Active">Active</option>
                <option value="Maintenance Required">Maintenance Required</option>
                <option value="Overdue">Overdue</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>
            <div>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {clients.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Equipment ({filteredEquipment.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inspection Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Maintenance
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
                {filteredEquipment.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <FireIcon className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.type}</div>
                          <div className="text-sm text-gray-500">{item.model}</div>
                          <div className="text-xs text-gray-400">S/N: {item.serial_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{item.client_name}</div>
                      <div className="text-sm text-gray-500">{item.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div>Last: {new Date(item.last_inspection).toLocaleDateString()}</div>
                        <div className="text-gray-500">Next: {new Date(item.next_inspection).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div>Last: {new Date(item.last_maintenance).toLocaleDateString()}</div>
                        <div className="text-gray-500">Next: {new Date(item.next_maintenance).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getComplianceIcon(item.compliance_status)}
                        <span className={`ml-2 text-sm font-medium ${getComplianceColor(item.compliance_status)}`}>
                          {item.compliance_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium space-x-3">
                      <button className="text-blue-600 hover:text-blue-800 transition-colors">
                        View
                      </button>
                      <button className="text-green-600 hover:text-green-800 transition-colors">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleScheduleMaintenance(item.id, `${item.type} (${item.serial_number})`)}
                        className="text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        Maintain
                      </button>
                      <button 
                        onClick={() => handleDeleteEquipment(item.id, `${item.type} (${item.serial_number})`)}
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