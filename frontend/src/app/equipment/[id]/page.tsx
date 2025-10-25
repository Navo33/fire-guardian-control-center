'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import { 
  FireIcon,
  BuildingOfficeIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  QrCodeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CogIcon,
  MapPinIcon,
  TagIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

interface EquipmentDetail {
  id: number;
  equipment_name: string;
  equipment_code: string;
  equipment_type: string;
  category: string;
  brand: string;
  model: string;
  serial_number: string;
  asset_tag: string;
  purchase_date: string;
  warranty_expiry: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  condition_rating: number;
  location: string;
  description: string;
  vendor_id: number;
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

export default function EquipmentDetailPage() {
  return (
    <RequireRole allowedRoles={['admin', 'vendor']}>
      <EquipmentDetailContent />
    </RequireRole>
  );
}

function EquipmentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const equipmentId = params.id as string;
  
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    equipment_name: '',
    equipment_type: '',
    category: '',
    brand: '',
    model: '',
    serial_number: '',
    asset_tag: '',
    location: '',
    description: '',
    condition_rating: 5
  });

  // Fetch equipment details
  const fetchEquipmentDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.EQUIPMENT.BY_ID(equipmentId);

      logApiCall('GET', url);
      const response = await fetch(url, { headers });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error(result.message || 'Failed to fetch equipment details');
      }

      setEquipment(result.data);
      setEditForm({
        equipment_name: result.data.equipment_name,
        equipment_type: result.data.equipment_type,
        category: result.data.category,
        brand: result.data.brand,
        model: result.data.model,
        serial_number: result.data.serial_number,
        asset_tag: result.data.asset_tag,
        location: result.data.location,
        description: result.data.description,
        condition_rating: result.data.condition_rating
      });
    } catch (err) {
      console.error('Error fetching equipment details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch equipment details');
    } finally {
      setIsLoading(false);
    }
  };

  // Update equipment details
  const handleUpdateEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.EQUIPMENT.BY_ID(equipmentId);

      logApiCall('PUT', url);
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update equipment');
      }

      // Refresh equipment data
      fetchEquipmentDetails();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating equipment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update equipment');
    }
  };

  // Delete equipment
  const handleDeleteEquipment = async () => {
    if (!confirm('Are you sure you want to delete this equipment? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.EQUIPMENT.BY_ID(equipmentId);

      logApiCall('DELETE', url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete equipment');
      }

      // Redirect to equipment list
      router.push('/equipment');
    } catch (err) {
      console.error('Error deleting equipment:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete equipment');
    }
  };

  useEffect(() => {
    if (equipmentId) {
      fetchEquipmentDetails();
    }
  }, [equipmentId]);

  if (error && !equipment) {
    return (
      <DashboardLayout>
        <ErrorDisplay message={error} />
      </DashboardLayout>
    );
  }

  if (isLoading || !equipment) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'retired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConditionColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
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
              <h1 className="text-2xl font-bold text-gray-900">{equipment?.equipment_name}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(equipment?.status)}`}>
                  {equipment?.status}
                </span>
                <span className="text-sm text-gray-500">
                  <QrCodeIcon className="h-4 w-4 inline mr-1" />
                  {equipment?.equipment_code}
                </span>
                <span className="text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Added {equipment?.created_at ? new Date(equipment.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary flex items-center space-x-2"
            >
              <PencilIcon className="h-4 w-4" />
              <span>{isEditing ? 'Cancel' : 'Edit'}</span>
            </button>
            <button
              onClick={handleDeleteEquipment}
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
                <FireIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">{equipment?.status}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Condition</p>
                <p className={`text-2xl font-bold ${getConditionColor(equipment?.condition_rating || 0)}`}>
                  {equipment?.condition_rating}/5
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-xl">
                <ClipboardDocumentListIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{equipment?.assignment_history?.length || 0}</p>
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
                <p className="text-2xl font-bold text-gray-900">{equipment?.maintenance_history?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: BuildingOfficeIcon },
                { id: 'related', name: 'Related Equipment', icon: FireIcon },
                { id: 'assignments', name: 'Assignment History', icon: UserGroupIcon },
                { id: 'maintenance', name: 'Maintenance History', icon: WrenchScrewdriverIcon }
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
                    <FireIcon className="h-5 w-5 text-red-600 mr-2" />
                    Equipment Information
                  </h3>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Equipment Name
                          </label>
                          <input
                            type="text"
                            value={editForm.equipment_name}
                            onChange={(e) => setEditForm({ ...editForm, equipment_name: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Equipment Type
                          </label>
                          <input
                            type="text"
                            value={editForm.equipment_type}
                            onChange={(e) => setEditForm({ ...editForm, equipment_type: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <input
                            type="text"
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand
                          </label>
                          <input
                            type="text"
                            value={editForm.brand}
                            onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Model
                          </label>
                          <input
                            type="text"
                            value={editForm.model}
                            onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Serial Number
                          </label>
                          <input
                            type="text"
                            value={editForm.serial_number}
                            onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Asset Tag
                          </label>
                          <input
                            type="text"
                            value={editForm.asset_tag}
                            onChange={(e) => setEditForm({ ...editForm, asset_tag: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={editForm.location}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Condition Rating
                          </label>
                          <select
                            value={editForm.condition_rating}
                            onChange={(e) => setEditForm({ ...editForm, condition_rating: parseInt(e.target.value) })}
                            className="input-field"
                          >
                            <option value={5}>5 - Excellent</option>
                            <option value={4}>4 - Good</option>
                            <option value={3}>3 - Fair</option>
                            <option value={2}>2 - Poor</option>
                            <option value={1}>1 - Critical</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={3}
                          className="input-field"
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button onClick={handleUpdateEquipment} className="btn-primary">
                          Save Changes
                        </button>
                        <button onClick={() => setIsEditing(false)} className="btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                        <p className="text-sm text-gray-900">{equipment?.equipment_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Code</label>
                        <p className="text-sm text-gray-900">{equipment?.equipment_code}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Type</label>
                        <p className="text-sm text-gray-900">{equipment?.equipment_type}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <p className="text-sm text-gray-900">{equipment?.category}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Brand</label>
                        <p className="text-sm text-gray-900">{equipment?.brand}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Model</label>
                        <p className="text-sm text-gray-900">{equipment?.model}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                        <p className="text-sm text-gray-900">{equipment?.serial_number}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Asset Tag</label>
                        <p className="text-sm text-gray-900">{equipment?.asset_tag}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <p className="text-sm text-gray-900 capitalize">{equipment?.status}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Condition Rating</label>
                        <p className={`text-sm font-medium ${getConditionColor(equipment?.condition_rating || 0)}`}>
                          {equipment?.condition_rating}/5
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <p className="text-sm text-gray-900">{equipment?.location || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                        <p className="text-sm text-gray-900">
                          {equipment?.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      
                      {equipment?.description && (
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <p className="text-sm text-gray-900">{equipment.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Vendor Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-red-600 mr-2" />
                    Vendor Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vendor Company</label>
                      <p className="text-sm text-gray-900">{equipment?.vendor_company}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vendor Name</label>
                      <p className="text-sm text-gray-900">{equipment?.vendor_name}</p>
                    </div>
                  </div>
                </div>

                {/* Current Assignment */}
                {equipment?.assignment && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <UserIcon className="h-5 w-5 text-red-600 mr-2" />
                      Current Assignment
                    </h3>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Client</label>
                          <p className="text-sm text-gray-900">{equipment.assignment.client_name}</p>
                          <p className="text-xs text-gray-500">{equipment.assignment.client_email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Assignment Status</label>
                          <p className="text-sm text-gray-900 capitalize">{equipment.assignment.assignment_status}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Start Date</label>
                          <p className="text-sm text-gray-900">
                            {new Date(equipment.assignment.start_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">End Date</label>
                          <p className="text-sm text-gray-900">
                            {new Date(equipment.assignment.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        {equipment.assignment.notes && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <p className="text-sm text-gray-900">{equipment.assignment.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Related Equipment Tab */}
            {activeTab === 'related' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Related Equipment ({equipment.related_equipment?.length || 0})
                  </h3>
                </div>
                
                {equipment.related_equipment && equipment.related_equipment.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipment.related_equipment.map((relatedItem) => (
                      <Link
                        key={relatedItem.id}
                        href={`/equipment/${relatedItem.id}`}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-red-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{relatedItem.equipment_name}</p>
                            <p className="text-sm text-gray-500">{relatedItem.equipment_type}</p>
                            <p className="text-xs text-gray-400 mt-1">{relatedItem.equipment_code}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(relatedItem.status)}`}>
                            {relatedItem.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FireIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No related equipment found</p>
                  </div>
                )}
              </div>
            )}

            {/* Assignment History Tab */}
            {activeTab === 'assignments' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Assignment History ({equipment.assignment_history?.length || 0})
                  </h3>
                </div>
                
                {equipment.assignment_history && equipment.assignment_history.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Client
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Period
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Duration
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
                        {equipment.assignment_history.map((assignment, index) => (
                          <tr key={assignment.id} className={`hover:bg-gray-50 transition-colors ${index !== equipment.assignment_history!.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{assignment.client_name}</div>
                                <div className="text-sm text-gray-500">{assignment.client_email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(assignment.start_date).toLocaleDateString()} - 
                                {assignment.returned_at ? new Date(assignment.returned_at).toLocaleDateString() : ' Ongoing'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {assignment.duration_days} days
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                assignment.assignment_status === 'active' ? 'bg-green-100 text-green-800' :
                                assignment.assignment_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {assignment.assignment_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {assignment.notes || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No assignment history available</p>
                  </div>
                )}
              </div>
            )}

            {/* Maintenance History Tab */}
            {activeTab === 'maintenance' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Maintenance History ({equipment.maintenance_history?.length || 0})
                  </h3>
                </div>
                
                {equipment.maintenance_history && equipment.maintenance_history.length > 0 ? (
                  <div className="space-y-4">
                    {equipment.maintenance_history.map((maintenance, index) => (
                      <div key={maintenance.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{maintenance.maintenance_type}</h4>
                            <p className="text-sm text-gray-500">
                              {new Date(maintenance.performed_at).toLocaleDateString()} by {maintenance.performed_by}
                            </p>
                          </div>
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            maintenance.status === 'completed' ? 'bg-green-100 text-green-800' :
                            maintenance.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {maintenance.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <p className="text-sm text-gray-900">{maintenance.description}</p>
                          </div>
                          {maintenance.cost && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Cost</label>
                              <p className="text-sm text-gray-900">${maintenance.cost.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                        
                        {maintenance.notes && (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <p className="text-sm text-gray-900">{maintenance.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <WrenchScrewdriverIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No maintenance history available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}