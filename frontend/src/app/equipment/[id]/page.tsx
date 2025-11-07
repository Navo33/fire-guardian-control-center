'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_ENDPOINTS, getAuthHeaders, logApiCall, API_BASE_URL } from '@/config/api';
import DebugLogger from '@/utils/DebugLogger';
import { 
  FireIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ArrowLeftIcon,
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  TagIcon,
  CubeIcon,
  UserIcon
} from '@heroicons/react/24/outline';

// Types
interface EquipmentType {
  // Header
  equipment_name: string;
  equipment_code: string;
  equipment_type: string;
  manufacturer: string;
  model: string;
  default_lifespan_years: number;
  created_date: string;
  description: string;
  
  // Instance Summary
  total_instances: number;
  available_instances: number;
  assigned_instances: number;
  maintenance_instances: number;
  
  // Maintenance
  standard_interval_months: number;
  maintenance_interval_months: number;
  instances_requiring_maintenance: number;
  maintenance_count: number;
  
  // Specs
  specifications: any;
  warranty_period_months: number;

  // Arrays from SQL
  instances: EquipmentInstanceData[];
  assignments: AssignmentData[];
}

interface EquipmentInstanceData {
  id: number;
  serial_number: string;
  status: string;
  client_name?: string;
  location?: string;
  next_maintenance_date?: string;
  expiry_date: string;
  compliance_status: string;
  purchase_date: string;
  warranty_expiry?: string;
}

interface AssignmentData {
  assignment_id: number;
  assignment_number: string;
  client_name: string;
  quantity: number;
  start_date?: string;
  end_date?: string;
  assigned_at: string;
  status: string;
  notes?: string;
}

interface EquipmentInstance {
  id: number;
  serial_number: string;
  asset_tag: string;
  equipment_id: number;
  vendor_id: number;
  assigned_to?: number;
  status: 'available' | 'assigned' | 'maintenance';
  compliance_status: 'compliant' | 'expired' | 'overdue' | 'due_soon';
  location?: string;
  installation_date?: string;
  expiry_date?: string;
  next_maintenance_date?: string;
  warranty_expiry?: string;
  client_name?: string;
  vendor_name: string;
  vendor_company: string;
  created_at: string;
  updated_at: string;
  
  // Assignment details if assigned
  assignment?: {
    client_id: number;
    client_name: string;
    client_email: string;
    assigned_at: string;
    assignment_status: 'active' | 'pending' | 'completed';
    start_date: string;
    end_date: string;
    notes: string;
  };
  
  // Related equipment
  related_equipment?: Array<{
    id: number;
    equipment_name: string;
    equipment_code: string;
    equipment_type: string;
    status: string;
    serial_number: string;
  }>;
  
  // Assignment history
  assignment_history?: Array<{
    id: number;
    client_name: string;
    client_email: string;
    assigned_at: string;
    returned_at: string | null;
    assignment_status: string;
    start_date: string;
    end_date: string;
    notes: string;
    duration_days: number;
  }>;
  
  // Maintenance history
  maintenance_history?: Array<{
    id: number;
    maintenance_type: string;
    description: string;
    performed_by: string;
    performed_at: string;
    cost: number | null;
    notes: string;
    status: string;
  }>;
}

// Equipment Assignment interface (matches backend response)
interface EquipmentAssignment {
  assignment_number: string;
  client: string;
  assigned_at: string;
  status: string;
  total_cost?: number;
}

// Status Badge Component
const StatusBadge: React.FC<{ status: string; type: 'status' | 'compliance' }> = ({ status, type }) => {
  const getStatusStyles = () => {
    if (type === 'status') {
      switch (status) {
        case 'available':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'assigned':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'maintenance':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else {
      switch (status) {
        case 'compliant':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'expired':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'overdue':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'due_soon':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
  };

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles()}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
};

export default function EquipmentDetailsPage() {
  const params = useParams();
  const equipmentId = params.id as string;
  
  const [equipmentType, setEquipmentType] = useState<EquipmentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateInstanceModalOpen, setIsCreateInstanceModalOpen] = useState(false);

  // Fetch equipment type details
  const fetchEquipmentTypeDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const headers = getAuthHeaders();

      // Fetch specific equipment type details using new endpoint
      const typeUrl = `${API_BASE_URL}/equipment/${equipmentId}`;
      logApiCall('GET', typeUrl);
      const typeResponse = await fetch(typeUrl, { headers });
      const typeResult = await typeResponse.json();
      console.log('Equipment Type Details Request:', typeUrl);

      if (!typeResponse.ok) {
        if (typeResponse.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error(typeResult.message || 'Failed to fetch equipment type details');
      }

      setEquipmentType(typeResult.data);

      // Fetch equipment instances for this type
      const instanceUrl = `${API_BASE_URL}/equipment?equipment_type_id=${equipmentId}`;
      logApiCall('GET', instanceUrl);
      const instanceResponse = await fetch(instanceUrl, { headers });
      const instanceResult = await instanceResponse.json();

      if (!instanceResponse.ok) {
        throw new Error(instanceResult.message || 'Failed to fetch equipment instances');
      }
    } catch (err) {
      console.error('Error fetching equipment details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch equipment details');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch equipment assignments
  useEffect(() => {
    if (equipmentId) {
      fetchEquipmentTypeDetails();
    }
  }, [equipmentId]);

  if (error && !equipmentType) {
    return (
      <DashboardLayout>
        <ErrorDisplay message={error} />
      </DashboardLayout>
    );
  }

  if (isLoading || !equipmentType) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
      case 'retired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <RequireRole allowedRoles={['admin', 'vendor']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/equipment"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{equipmentType.equipment_name}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor('active')}`}>
                    {equipmentType.total_instances > 0 ? 'Active' : 'No Instances'}
                  </span>
                  <span className="text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Created {equipmentType.created_date}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsCreateInstanceModalOpen(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <CubeIcon className="h-4 w-4" />
                <span>Create Instance</span>
              </button>
              <button className="btn-secondary flex items-center space-x-2">
                <PencilIcon className="h-4 w-4" />
                <span>Edit Type</span>
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <CubeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Instances</p>
                  <p className="text-2xl font-bold text-gray-900">{equipmentType.total_instances || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available</p>
                  <p className="text-2xl font-bold text-gray-900">{equipmentType.available_instances || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Assigned</p>
                  <p className="text-2xl font-bold text-gray-900">{equipmentType.assigned_instances || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Maintenance</p>
                  <p className="text-2xl font-bold text-gray-900">{equipmentType.maintenance_instances || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', name: 'Overview', icon: CubeIcon },
                  { id: 'instances', name: `Instances (${equipmentType?.total_instances || 0})`, icon: FireIcon },
                  { id: 'assignments', name: `Assignments (${equipmentType?.assignments?.length || 0})`, icon: UserGroupIcon },
                  { id: 'specifications', name: 'Specifications', icon: DocumentTextIcon },
                  { id: 'maintenance', name: 'Maintenance', icon: WrenchScrewdriverIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <CubeIcon className="h-5 w-5 text-red-600 mr-2" />
                      Equipment Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                        <p className="text-sm text-gray-900">{equipmentType.equipment_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Code</label>
                        <p className="text-sm text-gray-900">{equipmentType.equipment_code}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Type</label>
                        <p className="text-sm text-gray-900">{equipmentType.equipment_type}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                        <p className="text-sm text-gray-900">{equipmentType.manufacturer}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Model</label>
                        <p className="text-sm text-gray-900">{equipmentType.model}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Lifespan</label>
                        <p className="text-sm text-gray-900">{equipmentType.default_lifespan_years} years</p>
                      </div>
                      
                      {equipmentType.description && (
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <p className="text-sm text-gray-900">{equipmentType.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Instances Tab */}
              {activeTab === 'instances' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Equipment Instances ({equipmentType?.total_instances || 0})
                    </h3>
                  </div>
                  
                  {equipmentType?.instances && equipmentType.instances.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Serial Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Location
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Compliance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Assigned Client
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Next Maintenance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Expiry Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {equipmentType.instances.map((instance, index) => (
                            <tr key={instance.id} className={`hover:bg-gray-50 transition-colors ${index !== equipmentType.instances.length - 1 ? 'border-b border-gray-100' : ''}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{instance.serial_number}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {instance.location || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  instance.status === 'active' ? 'bg-green-100 text-green-800' :
                                  instance.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                  instance.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                  instance.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  instance.compliance_status === 'compliant' ? 'bg-green-100 text-green-800' :
                                  instance.compliance_status === 'non_compliant' ? 'bg-red-100 text-red-800' :
                                  instance.compliance_status === 'due_soon' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {instance.compliance_status === 'non_compliant' ? 'Non-compliant' :
                                   instance.compliance_status === 'due_soon' ? 'Due Soon' :
                                   instance.compliance_status.charAt(0).toUpperCase() + instance.compliance_status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {instance.client_name || 'Unassigned'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {instance.next_maintenance_date ? new Date(instance.next_maintenance_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(instance.expiry_date).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No equipment instances found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Assignments Tab */}
              {activeTab === 'assignments' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <UserGroupIcon className="h-5 w-5 text-red-600 mr-2" />
                      Equipment Assignments
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      View all assignment records for this equipment type's instances.
                    </p>
                  </div>

                  {equipmentType?.assignments && equipmentType.assignments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Assignment #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Client
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Start Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              End Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {equipmentType.assignments.map((assignment, index) => (
                            <tr key={assignment.assignment_id} className={`hover:bg-gray-50 transition-colors ${index !== equipmentType.assignments.length - 1 ? 'border-b border-gray-100' : ''}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{assignment.assignment_number}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{assignment.client_name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {assignment.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {assignment.start_date ? new Date(assignment.start_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  assignment.status === 'active' ? 'bg-green-100 text-green-800' :
                                  assignment.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                                  assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  assignment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className="truncate max-w-xs" title={assignment.notes || ''}>
                                  {assignment.notes || 'No notes'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No assignments found for this equipment type</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Assignments will appear here when instances of this equipment are assigned to clients.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Specifications Tab */}
              {activeTab === 'specifications' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-red-600 mr-2" />
                      Technical Specifications
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                        <p className="text-sm text-gray-900">{equipmentType.manufacturer}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Default Lifespan</label>
                        <p className="text-sm text-gray-900">{equipmentType.default_lifespan_years} years</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Maintenance Interval</label>
                        <p className="text-sm text-gray-900">{equipmentType.maintenance_interval_months} months</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Warranty Period</label>
                        <p className="text-sm text-gray-900">{equipmentType.warranty_period_months} months</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance Tab */}
              {activeTab === 'maintenance' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <WrenchScrewdriverIcon className="h-5 w-5 text-red-600 mr-2" />
                      Maintenance Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Standard Maintenance Interval</label>
                        <p className="text-sm text-gray-900">{equipmentType.maintenance_interval_months} months</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total Instances Requiring Maintenance</label>
                        <p className="text-sm text-gray-900">{equipmentType.maintenance_count || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}
