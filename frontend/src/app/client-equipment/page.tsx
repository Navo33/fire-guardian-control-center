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
  Cog6ToothIcon,
  EyeIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

// Types
interface EquipmentType {
  equipment_id: number;
  equipment_name: string;
  equipment_code: string;
  equipment_type: string;
  manufacturer: string;
  model: string;
  total_assigned: number;
  compliant_count: number;
  next_maintenance: string | null;
  compliance_rate: number;
  status_badge: string;
}

interface EquipmentOverview {
  total_equipment_types: string;
  total_assigned: string;
  categories_count: string;
  equipment_types: EquipmentType[];
}

// Main Equipment Management Page
const ClientEquipmentPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [equipmentData, setEquipmentData] = useState<EquipmentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch equipment overview
  const fetchEquipmentOverview = async () => {
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

      logApiCall('GET', API_ENDPOINTS.CLIENT.EQUIPMENT.OVERVIEW);
      const response = await fetch(API_ENDPOINTS.CLIENT.EQUIPMENT.OVERVIEW, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch equipment overview: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEquipmentData(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch equipment overview');
      }
    } catch (err) {
      console.error('Error fetching equipment overview:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      showToast('error', 'Failed to load equipment overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipmentOverview();
  }, []);

  // Filter equipment types
  const filteredEquipmentTypes = equipmentData?.equipment_types?.filter(type => {
    const matchesSearch = !searchTerm || 
      type.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.equipment_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || type.equipment_type === categoryFilter;
    
    return matchesSearch && matchesCategory;
  }) || [];

  // Get unique categories
  const categories = [...new Set(equipmentData?.equipment_types?.map(type => type.equipment_type) || [])];

  const handleViewDetails = (typeId: number) => {
    router.push(`/client-equipment/${typeId}`);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} action={{ label: 'Retry', onClick: fetchEquipmentOverview }} />;

  return (
    <RequireRole allowedRoles={['client']}>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
              <FireIcon className="h-8 w-8 text-gray-900" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Equipment</h1>
              <p className="text-gray-600">View and manage your assigned fire safety equipment</p>
            </div>
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
                <p className="text-2xl font-bold text-gray-900">{equipmentData?.total_equipment_types ?? '0'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FireIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Assigned</p>
                <p className="text-2xl font-bold text-gray-900">{equipmentData?.total_assigned ?? '0'}</p>
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
                <p className="text-2xl font-bold text-gray-900">{equipmentData?.categories_count ?? '0'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Compliance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {equipmentData?.equipment_types?.length ? 
                    Math.round(equipmentData.equipment_types.reduce((sum, eq) => sum + eq.compliance_rate, 0) / equipmentData.equipment_types.length) : 0
                  }%
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
                onClick: fetchEquipmentOverview
              }}
            />
          )}

          {/* Empty State */}
          {!loading && !error && filteredEquipmentTypes.length === 0 && (
            <div className="text-center py-12">
              <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment types found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || categoryFilter ? 'No equipment types match your current filters.' : 'You don\'t have any equipment assigned yet.'}
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
                      Compliance Metrics
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status & Maintenance
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEquipmentTypes.map((equipment) => (
                    <tr 
                      key={equipment.equipment_id} 
                      onClick={() => handleViewDetails(equipment.equipment_id)}
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
                            {equipment.equipment_code}
                          </div>
                        </div>
                      </td>

                      {/* Compliance Metrics */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="font-medium mr-1">{equipment.total_assigned}</span>
                            <span className="text-gray-500">Total Assigned</span>
                          </div>
                          <div className="flex items-center text-xs text-green-600">
                            <span className="font-medium mr-1">{equipment.compliant_count}</span>
                            <span className="text-gray-500">Compliant</span>
                          </div>
                          <div className="flex items-center text-xs text-blue-600">
                            <span className="font-medium mr-1">{equipment.compliance_rate}%</span>
                            <span className="text-gray-500">Rate</span>
                          </div>
                        </div>
                      </td>

                      {/* Status & Maintenance */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            equipment.status_badge === 'compliant' ? 'bg-green-100 text-green-800' :
                            equipment.status_badge === 'due_soon' ? 'bg-yellow-100 text-yellow-800' :
                            equipment.status_badge === 'overdue' ? 'bg-orange-100 text-orange-800' :
                            equipment.status_badge === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {equipment.status_badge === 'compliant' ? 'Compliant' :
                             equipment.status_badge === 'due_soon' ? 'Due Soon' :
                             equipment.status_badge === 'overdue' ? 'Overdue' :
                             equipment.status_badge === 'expired' ? 'Expired' : 'Unknown'}
                          </span>
                          {equipment.next_maintenance && (
                            <div className="text-xs text-gray-500">
                              Next: {new Date(equipment.next_maintenance).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div 
                          className="flex items-center justify-end space-x-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleViewDetails(equipment.equipment_id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
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

export default ClientEquipmentPage;