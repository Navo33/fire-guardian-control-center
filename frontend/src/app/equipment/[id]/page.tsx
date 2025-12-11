'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import CreateInstanceModal from '@/components/modals/CreateInstanceModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { API_ENDPOINTS, getAuthHeaders, logApiCall, API_BASE_URL } from '@/config/api';
import DebugLogger from '@/utils/DebugLogger';
import { useToast } from '@/components/providers/ToastProvider';
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
  UserIcon,
  XMarkIcon
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
  const [equipmentInstances, setEquipmentInstances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreateInstanceModalOpen, setIsCreateInstanceModalOpen] = useState(false);
  const [removeAssignmentModal, setRemoveAssignmentModal] = useState<{
    isOpen: boolean;
    equipmentId: number | null;
    equipmentName: string;
  }>({ isOpen: false, equipmentId: null, equipmentName: '' });
  const { showToast } = useToast();

  // Form data for inline editing
  const [editFormData, setEditFormData] = useState({
    equipment_name: '',
    description: '',
    manufacturer: '',
    model: '',
    default_lifespan_years: 0,
    warranty_years: 0,
    weight_kg: 0,
    dimensions: '',
    specifications: {}
  });

  const handleRemoveAssignment = async () => {
    if (!removeAssignmentModal.equipmentId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const url = `${apiBaseUrl}/equipment/${removeAssignmentModal.equipmentId}/remove-assignment`;

      logApiCall('DELETE', url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove assignment');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to remove assignment');
      }

      showToast('success', `Assignment removed successfully for ${removeAssignmentModal.equipmentName}`);
      
      // Refresh equipment data
      await fetchEquipmentTypeDetails();
      
      // Close modal
      setRemoveAssignmentModal({ isOpen: false, equipmentId: null, equipmentName: '' });
    } catch (err) {
      console.error('Error removing assignment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove assignment';
      showToast('error', errorMessage);
    }
  };

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

      const equipmentData = typeResult.data;
      setEquipmentType(equipmentData);
      
      // Initialize edit form data
      setEditFormData({
        equipment_name: equipmentData.equipment_name || '',
        description: equipmentData.description || '',
        manufacturer: equipmentData.manufacturer || '',
        model: equipmentData.model || '',
        default_lifespan_years: equipmentData.default_lifespan_years || 0,
        warranty_years: equipmentData.warranty_years || 0,
        weight_kg: equipmentData.weight_kg || 0,
        dimensions: equipmentData.dimensions || '',
        specifications: equipmentData.specifications || {}
      });

      // Fetch equipment instances with enhanced maintenance information
      const instanceUrl = `${API_BASE_URL}/equipment/instances/${equipmentId}`;
      logApiCall('GET', instanceUrl);
      const instanceResponse = await fetch(instanceUrl, { headers });
      const instanceResult = await instanceResponse.json();

      if (!instanceResponse.ok) {
        throw new Error(instanceResult.message || 'Failed to fetch equipment instances');
      }

      // Store the enhanced instance data
      setEquipmentInstances(instanceResult.data.instances || []);
      
      // Update equipment type with instance count from actual data
      if (equipmentData && instanceResult.data.instances) {
        equipmentData.total_instances = instanceResult.data.instances.length;
        equipmentData.instances = instanceResult.data.instances;
      }
    } catch (err) {
      console.error('Error fetching equipment details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch equipment details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };

      const updateUrl = `${API_BASE_URL}/equipment/types/${equipmentId}`;
      logApiCall('PUT', updateUrl);
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editFormData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update equipment type');
      }

      showToast('success', 'Equipment type updated successfully');
      setIsEditing(false);
      fetchEquipmentTypeDetails(); // Refresh data

    } catch (err) {
      console.error('Error updating equipment type:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update equipment type';
      showToast('error', errorMessage);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data to original values
    if (equipmentType) {
      setEditFormData({
        equipment_name: equipmentType.equipment_name || '',
        description: equipmentType.description || '',
        manufacturer: equipmentType.manufacturer || '',
        model: equipmentType.model || '',
        default_lifespan_years: equipmentType.default_lifespan_years || 0,
        warranty_years: equipmentType.warranty_years || 0,
        weight_kg: equipmentType.weight_kg || 0,
        dimensions: equipmentType.dimensions || '',
        specifications: equipmentType.specifications || {}
      });
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
              
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn-secondary flex items-center space-x-2"
              >
                <PencilIcon className="h-4 w-4" />
                <span>{isEditing ? 'Cancel' : 'Edit Details'}</span>
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
                  { id: 'specifications', name: 'Specifications', icon: DocumentTextIcon }
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
                  {/* Equipment Details */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <CubeIcon className="h-5 w-5 text-red-600 mr-2" />
                        Equipment Information
                      </h3>
                      {isEditing && (
                        <div className="flex space-x-3">
                          <button 
                            onClick={handleSaveChanges}
                            className="btn-primary"
                          >
                            Save Changes
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Equipment Name
                            </label>
                            <input
                              type="text"
                              value={editFormData.equipment_name}
                              onChange={(e) => setEditFormData({...editFormData, equipment_name: e.target.value})}
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Manufacturer
                            </label>
                            <input
                              type="text"
                              value={editFormData.manufacturer}
                              onChange={(e) => setEditFormData({...editFormData, manufacturer: e.target.value})}
                              className="input-field"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Model
                            </label>
                            <input
                              type="text"
                              value={editFormData.model}
                              onChange={(e) => setEditFormData({...editFormData, model: e.target.value})}
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Default Lifespan (Years)
                            </label>
                            <input
                              type="number"
                              value={editFormData.default_lifespan_years}
                              onChange={(e) => setEditFormData({...editFormData, default_lifespan_years: parseInt(e.target.value) || 0})}
                              className="input-field"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Warranty (Years)
                            </label>
                            <input
                              type="number"
                              value={editFormData.warranty_years}
                              onChange={(e) => setEditFormData({...editFormData, warranty_years: parseInt(e.target.value) || 0})}
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Weight (kg)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={editFormData.weight_kg}
                              onChange={(e) => setEditFormData({...editFormData, weight_kg: parseFloat(e.target.value) || 0})}
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Dimensions
                            </label>
                            <input
                              type="text"
                              value={editFormData.dimensions}
                              onChange={(e) => setEditFormData({...editFormData, dimensions: e.target.value})}
                              className="input-field"
                              placeholder="L x W x H"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                            rows={3}
                            className="input-field"
                            placeholder="Equipment description..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                          <p className="text-sm text-gray-900">{equipmentType.equipment_name}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Equipment Code</label>
                          <p className="text-sm text-gray-500">{equipmentType.equipment_code}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Equipment Type</label>
                          <p className="text-sm text-gray-500">{equipmentType.equipment_type}</p>
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
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Warranty Period</label>
                          <p className="text-sm text-gray-900">{equipmentType.warranty_years || 0} years</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Weight</label>
                          <p className="text-sm text-gray-900">{equipmentType.weight_kg || 0} kg</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Dimensions</label>
                          <p className="text-sm text-gray-900">{equipmentType.dimensions || 'Not specified'}</p>
                        </div>
                        
                        {equipmentType.description && (
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <p className="text-sm text-gray-900 mt-1">{equipmentType.description}</p>
                          </div>
                        )}
                      </div>
                    )}
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              Actions
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
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {instance.status === 'assigned' && instance.client_name && instance.client_name !== 'Unassigned' ? (
                                    <button
                                      onClick={() => setRemoveAssignmentModal({
                                        isOpen: true,
                                        equipmentId: instance.id,
                                        equipmentName: `${equipmentType?.equipment_name} - ${instance.serial_number}`
                                      })}
                                      className="text-red-600 hover:text-red-900 text-sm font-medium transition-colors"
                                    >
                                      Remove Assignment
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-sm">No actions</span>
                                  )}
                                </div>
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

              {/* Specifications Tab */}
              {activeTab === 'specifications' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-red-600 mr-2" />
                      Technical Specifications & Maintenance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Weight</label>
                        <p className="text-sm text-gray-900">{equipmentType.weight_kg || 'Not specified'} kg</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Dimensions</label>
                        <p className="text-sm text-gray-900">{equipmentType.dimensions || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Warranty Period</label>
                        <p className="text-sm text-gray-900">{equipmentType.warranty_years || 0} years</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Maintenance Interval</label>
                        <p className="text-sm text-gray-900">{equipmentType.maintenance_interval_months || 12} months</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Instances in Maintenance</label>
                        <p className="text-sm text-gray-900">{equipmentType.maintenance_instances || 0}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Default Lifespan</label>
                        <p className="text-sm text-gray-900">{equipmentType.default_lifespan_years} years</p>
                      </div>
                      
                      {equipmentType.specifications && Object.keys(equipmentType.specifications).length > 0 && (
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Additional Specifications</label>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <pre className="text-sm text-gray-900">{JSON.stringify(equipmentType.specifications, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>

        {/* Create Instance Modal */}
        {equipmentType && (
          <CreateInstanceModal
            isOpen={isCreateInstanceModalOpen}
            onClose={() => setIsCreateInstanceModalOpen(false)}
            onSuccess={() => {
              setIsCreateInstanceModalOpen(false);
              fetchEquipmentTypeDetails(); // Refresh the data
            }}
            equipmentId={equipmentId}
            equipmentName={equipmentType.equipment_name}
          />
        )}

        {/* Remove Assignment Confirmation Modal */}
        <ConfirmModal
          isOpen={removeAssignmentModal.isOpen}
          onCancel={() => setRemoveAssignmentModal({ isOpen: false, equipmentId: null, equipmentName: '' })}
          onConfirm={handleRemoveAssignment}
          title="Remove Equipment Assignment"
          message={`Are you sure you want to remove the assignment for "${removeAssignmentModal.equipmentName}"? This equipment will become available for reassignment.`}
          confirmText="Remove Assignment"
          cancelText="Cancel"
          type="danger"
        />
      </DashboardLayout>
    </RequireRole>
  );
}
