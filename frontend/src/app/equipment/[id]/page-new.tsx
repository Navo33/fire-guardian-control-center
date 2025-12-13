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
  
  // Specs and Maintenance
  specifications: any;
  warranty_years: number;
  weight_kg: number;
  dimensions: string;
  maintenance_interval_months: number;
  warranty_period_months: number;
  
  // Arrays from SQL
  instances: EquipmentInstanceData[];
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

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const equipmentId = params.id as string;
  
  const [equipmentType, setEquipmentType] = useState<EquipmentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreateInstanceModalOpen, setIsCreateInstanceModalOpen] = useState(false);
  const [removeAssignmentModal, setRemoveAssignmentModal] = useState<{
    isOpen: boolean;
    equipmentId: number | null;
    equipmentName: string;
  }>({ isOpen: false, equipmentId: null, equipmentName: '' });

  // Form data for editing
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

  useEffect(() => {
    if (equipmentId) {
      fetchEquipmentTypeDetails();
    }
  }, [equipmentId]);

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
      const typeUrl = `${API_BASE_URL}/equipment/${equipmentId}`;
      logApiCall('GET', typeUrl);
      
      const typeResponse = await fetch(typeUrl, { headers });
      const typeResult = await typeResponse.json();

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

  const handleRemoveAssignment = async () => {
    // Implementation for removing assignment
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const headers = getAuthHeaders();
      const url = `${API_BASE_URL}/equipment/${removeAssignmentModal.equipmentId}/remove-assignment`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to remove assignment');
      }

      showToast('success', 'Assignment removed successfully');
      setRemoveAssignmentModal({ isOpen: false, equipmentId: null, equipmentName: '' });
      fetchEquipmentTypeDetails(); // Refresh data

    } catch (err) {
      console.error('Error removing assignment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove assignment';
      showToast('error', errorMessage);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (!equipmentType) return <ErrorDisplay message="Equipment type not found" />;

  return (
    <RequireRole allowedRoles={['vendor']}>
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
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit Equipment Type' : equipmentType.equipment_name}
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-800 border-blue-200">
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
            {!isEditing ? (
              <>
                <button 
                  onClick={() => setIsCreateInstanceModalOpen(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <CubeIcon className="h-4 w-4" />
                  <span>Create Instance</span>
                </button>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Edit Details</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleSaveChanges}
                  className="btn-primary flex items-center space-x-2"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
                <button 
                  onClick={handleCancelEdit}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </>
            )}
          </div>
        </div>

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

        {/* Equipment Details Form/View */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Equipment Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editFormData.equipment_name}
                    onChange={(e) => setEditFormData({...editFormData, equipment_name: e.target.value})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{equipmentType.equipment_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Code</label>
                <p className="text-gray-500 text-sm">{equipmentType.equipment_code} (Cannot be edited)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Type</label>
                <p className="text-gray-500 text-sm">{equipmentType.equipment_type} (Cannot be edited)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editFormData.manufacturer}
                    onChange={(e) => setEditFormData({...editFormData, manufacturer: e.target.value})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{equipmentType.manufacturer}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editFormData.model}
                    onChange={(e) => setEditFormData({...editFormData, model: e.target.value})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{equipmentType.model}</p>
                )}
              </div>
            </div>

            {/* Technical Specifications & Maintenance */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Lifespan (Years)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editFormData.default_lifespan_years}
                    onChange={(e) => setEditFormData({...editFormData, default_lifespan_years: parseInt(e.target.value) || 0})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{equipmentType.default_lifespan_years} years</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Period (Years)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editFormData.warranty_years}
                    onChange={(e) => setEditFormData({...editFormData, warranty_years: parseInt(e.target.value) || 0})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{equipmentType.warranty_years || 0} years</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Interval (Months)</label>
                <p className="text-gray-900">{equipmentType.maintenance_interval_months || 12} months</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.1"
                    value={editFormData.weight_kg}
                    onChange={(e) => setEditFormData({...editFormData, weight_kg: parseFloat(e.target.value) || 0})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{equipmentType.weight_kg || 0} kg</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editFormData.dimensions}
                    onChange={(e) => setEditFormData({...editFormData, dimensions: e.target.value})}
                    className="input-field"
                  />
                ) : (
                  <p className="text-gray-900">{equipmentType.dimensions || 'Not specified'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                rows={3}
                className="input-field"
              />
            ) : (
              <p className="text-gray-900">{equipmentType.description}</p>
            )}
          </div>
        </div>

        {/* Equipment Instances Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Equipment Instances</h2>
            <p className="text-sm text-gray-600 mt-1">Manage individual equipment instances</p>
          </div>

          {equipmentType.instances && equipmentType.instances.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compliance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Maintenance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {equipmentType.instances.map((instance) => (
                    <tr key={instance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{instance.serial_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {instance.location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          instance.status === 'available' ? 'bg-green-100 text-green-800' :
                          instance.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                          instance.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          instance.compliance_status === 'compliant' ? 'bg-green-100 text-green-800' :
                          instance.compliance_status === 'expired' ? 'bg-red-100 text-red-800' :
                          instance.compliance_status === 'due_soon' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {instance.compliance_status.charAt(0).toUpperCase() + instance.compliance_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {instance.client_name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {instance.next_maintenance_date || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            View
                          </button>
                          {instance.client_name && (
                            <>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => setRemoveAssignmentModal({
                                  isOpen: true,
                                  equipmentId: instance.id,
                                  equipmentName: `${equipmentType.equipment_name} (${instance.serial_number})`
                                })}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Remove Assignment
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Instances Created</h3>
              <p className="text-gray-600 mb-4">Create equipment instances to start tracking individual units.</p>
              <button 
                onClick={() => setIsCreateInstanceModalOpen(true)}
                className="btn-primary"
              >
                Create First Instance
              </button>
            </div>
          )}
        </div>

        {/* Create Instance Modal */}
        {equipmentType && (
          <CreateInstanceModal
            isOpen={isCreateInstanceModalOpen}
            onClose={() => setIsCreateInstanceModalOpen(false)}
            onSuccess={() => {
              setIsCreateInstanceModalOpen(false);
              fetchEquipmentTypeDetails();
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
      </div>
    </DashboardLayout>
    </RequireRole>
  );
}