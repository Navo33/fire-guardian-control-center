'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RequireRole from '../../../components/auth/RequireRole';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AddVendorModal from '../../../components/modals/AddVendorModal';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorDisplay from '../../../components/ui/ErrorDisplay';
import { API_ENDPOINTS, getAuthHeaders, logApiCall, buildApiUrl } from '../../../config/api';
import { 
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ChevronDownIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface Vendor {
  id: number;
  name: string;
  email: string;
  phone: string;
  clients: number;
  equipment: number;
  status: 'Active' | 'Inactive' | 'Pending';
  joinDate: string;
  lastActivity: string;
  compliance: number;
  location: string;
  category: string;
}

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
  totalClients: number;
  totalEquipment: number;
  recentlyJoined: number;
}

export default function VendorManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [specializationFilter, setSpecializationFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [specializations, setSpecializations] = useState<{id: number; name: string}[]>([]);
  const [vendorStats, setVendorStats] = useState<VendorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch vendors from API
  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();

      const params: Record<string, string> = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'All') params.status = statusFilter;
      if (specializationFilter !== 'All') params.specialization = specializationFilter;

      const url = buildApiUrl(API_ENDPOINTS.VENDORS.LIST, params);
      logApiCall('GET', url);
      const response = await fetch(url, { headers });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch vendors');
      }

      setVendors(result.data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch specializations for dropdown
  const fetchSpecializations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = getAuthHeaders();

      logApiCall('GET', API_ENDPOINTS.VENDORS.SPECIALIZATIONS);
      const response = await fetch(API_ENDPOINTS.VENDORS.SPECIALIZATIONS, { headers });
      const result = await response.json();

      if (response.ok && result.success) {
        setSpecializations(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching specializations:', err);
    }
  };

  // Fetch vendor statistics
  const fetchVendorStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = getAuthHeaders();

      logApiCall('GET', API_ENDPOINTS.VENDORS.STATS);
      const response = await fetch(API_ENDPOINTS.VENDORS.STATS, { headers });
      const result = await response.json();

      if (response.ok && result.success) {
        setVendorStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching vendor stats:', err);
    }
  };

  // Fetch vendors on component mount and when filters change
  useEffect(() => {
    fetchVendors();
  }, [searchTerm, statusFilter, specializationFilter]);

  // Fetch specializations on component mount
  useEffect(() => {
    fetchSpecializations();
    fetchVendorStats();
  }, []);

  // Handle successful vendor creation
  const handleVendorCreated = () => {
    fetchVendors(); // Refresh the vendor list
  };

  // Handle vendor deletion
  const handleDeleteVendor = async (vendorId: number) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    try {
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.VENDORS.BY_ID(vendorId);

      logApiCall('DELETE', url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete vendor');
      }

      // Refresh vendor list
      fetchVendors();
    } catch (err) {
      console.error('Error deleting vendor:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete vendor');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <RequireRole allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
              <p className="text-gray-600 mt-1">Manage and monitor all fire safety vendors</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add New Vendor</span>
          </button>
        </div>

        {/* Stats Cards */}
        {vendorStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Vendors</p>
                  <p className="text-2xl font-bold text-gray-900">{vendorStats.totalVendors}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Vendors</p>
                  <p className="text-2xl font-bold text-gray-900">{vendorStats.activeVendors}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{vendorStats.totalClients}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <WrenchScrewdriverIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Equipment</p>
                  <p className="text-2xl font-bold text-gray-900">{vendorStats.totalEquipment}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors by name, email, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field appearance-none pr-8 min-w-[120px]"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
                <ChevronDownIcon className="h-4 w-4 absolute right-2 top-3 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={specializationFilter}
                  onChange={(e) => setSpecializationFilter(e.target.value)}
                  className="input-field appearance-none pr-8 min-w-[160px]"
                >
                  <option value="All">All Specializations</option>
                  {specializations.map((spec) => (
                    <option key={spec.id} value={spec.name}>
                      {spec.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="h-4 w-4 absolute right-2 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Vendors ({vendors.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Vendor Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {vendors.map((vendor, index) => (
                  <tr 
                    key={vendor.id} 
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${index !== vendors.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onClick={() => window.location.href = `/dashboard/vendors/${vendor.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                            <BuildingOfficeIcon className="h-5 w-5 text-red-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                          <div className="text-sm text-gray-500">{vendor.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.email}</div>
                      <div className="text-sm text-gray-500">{vendor.phone}</div>
                      <div className="text-sm text-gray-500">{vendor.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.clients} clients</div>
                      <div className="text-sm text-gray-500">{vendor.equipment} equipment</div>
                      <div className="flex items-center mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-[80px]">
                          <div 
                            className="h-2 rounded-full bg-red-500"
                            style={{ width: `${vendor.compliance}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600">{vendor.compliance}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vendor.status)}`}>
                        {vendor.status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{vendor.lastActivity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-3">
                        <Link
                          href={`/dashboard/vendors/${vendor.id}/edit`}
                          className="text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          className="text-red-600 hover:text-red-800 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete ${vendor.name}?`)) {
                              console.log('Delete vendor:', vendor.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Loading State */}
            {isLoading && (
              <LoadingSpinner text="Loading vendors..." />
            )}

            {/* Error State */}
            {error && !isLoading && (
              <ErrorDisplay 
                message={error}
                action={{
                  label: 'Try Again',
                  onClick: fetchVendors
                }}
              />
            )}

            {/* Empty State */}
            {!isLoading && !error && vendors.length === 0 && (
              <div className="text-center py-12">
                <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
                <p className="text-gray-500">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Vendor Modal */}
      <AddVendorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleVendorCreated}
      />
    </DashboardLayout>
    </RequireRole>
  );
}