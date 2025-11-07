'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RequireRole from '@/components/auth/RequireRole';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useToast } from '@/components/providers/ToastProvider';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import {
  FireIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Cog6ToothIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

// Types
interface EquipmentType {
  id: number;
  equipment_code: string;
  equipment_name: string;
  equipment_type: string;
  manufacturer: string;
  model: string;
  description?: string;
  default_lifespan_years: number;
  specifications: any;
  instance_count: number;
  created_at: string;
  updated_at: string;
}

// Main Equipment Management Page
const EquipmentManagementPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch equipment types
  const fetchEquipmentTypes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const headers = getAuthHeaders();

      logApiCall('GET', API_ENDPOINTS.EQUIPMENT.TYPES);
      const response = await fetch(API_ENDPOINTS.EQUIPMENT.TYPES, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch equipment types: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEquipmentTypes(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to fetch equipment types');
      }
    } catch (err) {
      console.error('Error fetching equipment types:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      showToast('error', 'Failed to load equipment types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipmentTypes();
  }, []);

  // Filter equipment types
  const filteredEquipmentTypes = equipmentTypes.filter(type => {
    const matchesSearch = !searchTerm || 
      type.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.equipment_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || type.equipment_type === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(equipmentTypes.map(type => type.equipment_type))];

  const handleViewDetails = (typeId: number) => {
    router.push(`/equipment/${typeId}`);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} action={{ label: 'Retry', onClick: fetchEquipmentTypes }} />;

  return (
    <RequireRole allowedRoles={['admin', 'vendor']}>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-red-50 rounded-xl">
              <FireIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
              <p className="text-gray-600">Manage your equipment types and create instances for clients</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {/* TODO: Add create equipment type modal */}}
              className="btn-primary flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Equipment Type
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Cog6ToothIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Equipment Types</p>
                <p className="text-2xl font-bold text-gray-900">{equipmentTypes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FireIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Instances</p>
                <p className="text-2xl font-bold text-gray-900">
                  {equipmentTypes.reduce((total, type) => total + (type.instance_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Lifespan</p>
                <p className="text-2xl font-bold text-gray-900">
                  {equipmentTypes.length > 0 
                    ? Math.round(equipmentTypes.reduce((total, type) => total + (type.default_lifespan_years || 0), 0) / equipmentTypes.length)
                    : 0
                  } years
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search equipment types by name, code, or manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field appearance-none pr-8 min-w-[160px]"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Equipment Types Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Equipment Types ({filteredEquipmentTypes.length})
            </h3>
          </div>

          {/* Loading State */}
          {loading && (
            <LoadingSpinner text="Loading equipment types..." />
          )}

          {/* Error State */}
          {error && !loading && (
            <ErrorDisplay 
              message={error}
              action={{
                label: 'Try Again',
                onClick: fetchEquipmentTypes
              }}
            />
          )}

          {/* Empty State */}
          {!loading && !error && filteredEquipmentTypes.length === 0 && (
            <div className="text-center py-12">
              <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment types found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || categoryFilter ? 'No equipment types match your current filters.' : 'Start by adding your first equipment type.'}
              </p>
            </div>
          )}

          {/* Equipment Table Content */}
          {!loading && !error && filteredEquipmentTypes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Equipment Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Category & Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Instance Metrics
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Specifications
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEquipmentTypes.map((equipment) => (
                    <tr 
                      key={equipment.id} 
                      onClick={() => handleViewDetails(equipment.id)}
                      className="hover:bg-red-50/30 cursor-pointer transition-all duration-150"
                    >
                      {/* Equipment Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-semibold text-sm">
                              <FireIcon className="h-5 w-5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {equipment.equipment_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {equipment.manufacturer} - {equipment.model}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Type */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {equipment.equipment_type}
                          </span>
                          <div className="text-xs text-gray-500">
                            Code: {equipment.equipment_code}
                          </div>
                        </div>
                      </td>

                      {/* Instance Metrics */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="font-medium mr-1">{equipment.instance_count || 0}</span>
                            <span className="text-gray-500">Total</span>
                          </div>
                          <div className="flex items-center text-xs text-green-600">
                            <FireIcon className="h-3 w-3 mr-1" />
                            <span className="font-medium">Active Instances</span>
                          </div>
                        </div>
                      </td>

                      {/* Specifications */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Lifespan:</span> {equipment.default_lifespan_years} years
                          </div>
                          <div className="text-xs text-gray-500 max-w-xs truncate">
                            {equipment.description || 'No description available'}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div 
                          className="flex items-center justify-end space-x-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleViewDetails(equipment.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {/* handleEditEquipment(equipment.id) */}}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                            title="Edit Equipment"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {/* handleDeleteEquipment(equipment.id) */}}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete Equipment"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
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
    </RequireRole>
  );
};

export default EquipmentManagementPage;