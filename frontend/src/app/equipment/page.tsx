'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import AddEquipmentModal from '@/components/modals/AddEquipmentModal';
import { useToast } from '@/components/providers/ToastProvider';
import { API_ENDPOINTS, buildApiUrl } from '@/config/api';
import DebugLogger from '@/utils/DebugLogger';
import {
  FireIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

// Types
interface EquipmentInstance {
  id: number;
  serial_number: string;
  equipment_name: string;
  equipment_category: string;
  status: 'active' | 'inactive' | 'maintenance';
  compliance_status: 'compliant' | 'non-compliant' | 'expired';
  location?: string;
  assigned_client?: string;
  next_maintenance_date?: string;
  warranty_expiry?: string;
  created_at: string;
}

interface EquipmentType {
  id: number;
  name: string;
  category: string;
  description?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface EquipmentFilters {
  status: string;
  compliance_status: string;
  search: string;
}

// Status Badge Component
const StatusBadge: React.FC<{ status: string; type: 'status' | 'compliance' }> = ({ status, type }) => {
  const getStatusStyles = () => {
    if (type === 'status') {
      switch (status) {
        case 'active':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'inactive':
          return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'maintenance':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else {
      switch (status) {
        case 'compliant':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'non-compliant':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'expired':
          return 'bg-orange-100 text-orange-800 border-orange-200';
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

// Main Equipment Management Page
const EquipmentManagementPage: React.FC = () => {
  const [equipment, setEquipment] = useState<EquipmentInstance[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState<EquipmentFilters>({
    status: '',
    compliance_status: '',
    search: ''
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const { success, error: showError } = useToast();

  // Fetch equipment list
  const fetchEquipment = useCallback(async (page = 1, currentFilters = filters) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required');
        showError('Please log in to access equipment');
        return;
      }
      
      const params: Record<string, string | number> = {
        page,
        limit: pagination.limit
      };

      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.compliance_status) params.compliance_status = currentFilters.compliance_status;
      if (currentFilters.search) params.search = currentFilters.search;

      const url = buildApiUrl(API_ENDPOINTS.EQUIPMENT.LIST, params);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed');
          showError('Please log in again');
          // Optionally redirect to login
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch equipment');
      }

      const data = await response.json();
      setEquipment(data.data.equipment);
      setPagination(data.data.pagination);
      setError(null);
    } catch (error) {
      DebugLogger.error('Error fetching equipment:', error);
      setError('Failed to load equipment');
      showError('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, showError]);

  // Fetch equipment types
  const fetchEquipmentTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.EQUIPMENT.TYPES, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch equipment types');
      }

      const data = await response.json();
      setEquipmentTypes(data.data);
    } catch (error) {
      DebugLogger.error('Error fetching equipment types:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchEquipment();
    fetchEquipmentTypes();
  }, []);

  // Handle filter changes
  const handleFilterChange = (key: keyof EquipmentFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchEquipment(1, newFilters);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchEquipment(newPage);
  };

  // Handle equipment operations
  const handleDeleteEquipment = async (id: number, serialNumber: string) => {
    if (!confirm(`Are you sure you want to delete equipment ${serialNumber}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.EQUIPMENT.DELETE(id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete equipment');
      }

      success('Equipment deleted successfully');
      fetchEquipment(pagination.page);
    } catch (error) {
      DebugLogger.error('Error deleting equipment:', error);
      showError(error instanceof Error ? error.message : 'Failed to delete equipment');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && equipment.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && equipment.length === 0) {
    return (
      <DashboardLayout>
        <ErrorDisplay 
          message={error} 
          action={{
            label: 'Retry',
            onClick: () => fetchEquipment()
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-50 rounded-xl">
              <FireIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
              <p className="text-gray-600">Manage your fire safety equipment inventory</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Equipment
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search serial number, location..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            {/* Compliance Status Filter */}
            <div>
              <select
                value={filters.compliance_status}
                onChange={(e) => handleFilterChange('compliance_status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Compliance</option>
                <option value="compliant">Compliant</option>
                <option value="non-compliant">Non-Compliant</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div>
              <button
                onClick={() => {
                  setFilters({ status: '', compliance_status: '', search: '' });
                  fetchEquipment(1, { status: '', compliance_status: '', search: '' });
                }}
                className="w-full py-2 px-4 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Equipment ({equipment.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Equipment Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Location & Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Maintenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {equipment.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${index !== equipment.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onClick={() => window.location.href = `/equipment/${item.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                            <FireIcon className="h-5 w-5 text-red-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.equipment_name}</div>
                          <div className="text-sm text-gray-500">{item.equipment_category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">{item.serial_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <StatusBadge status={item.status} type="status" />
                        <StatusBadge status={item.compliance_status} type="compliance" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {item.location || 'No location'}
                      </div>
                      <div className="text-sm text-gray-500">{item.assigned_client || 'Unassigned'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {formatDate(item.next_maintenance_date)}
                      </div>
                      {item.warranty_expiry && (
                        <div className="text-sm text-gray-500">
                          Warranty: {formatDate(item.warranty_expiry)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/equipment/${item.id}`;
                          }}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEquipment(item.id, item.serial_number);
                          }}
                          className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {equipment.length === 0 && !loading && (
            <div className="text-center py-12">
              <FireIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No equipment found</h3>
              <p className="text-gray-500">Get started by adding your first piece of equipment.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 border border-gray-100 rounded-2xl">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-900">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Equipment Modal */}
      <AddEquipmentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => fetchEquipment(pagination.page)}
        equipmentTypes={equipmentTypes}
      />
    </DashboardLayout>
  );
};

export default EquipmentManagementPage;
