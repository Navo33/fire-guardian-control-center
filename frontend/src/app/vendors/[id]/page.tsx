'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  GlobeAltIcon,
  CalendarIcon,
  ClockIcon,
  ChartBarIcon,
  CogIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FireIcon,
  ShieldCheckIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface VendorDetails {
  // User details
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  user_type: string;
  is_locked: boolean;
  last_login: string | null;
  created_at: string;
  
  // Company details
  company?: {
    company_name: string;
    business_type: string;
    license_number: string;
  };
  
  // Contact details
  contact?: {
    contact_person_name: string;
    contact_title: string;
    primary_email: string;
    primary_phone: string;
    secondary_phone?: string;
  };
  
  // Address details
  address?: {
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  
  // Specializations
  specializations: string[];
  
  // Counts and metrics
  equipment_count: number;
  assignments_count: number;
  
  // Computed fields for display
  name?: string;
  phone?: string;
  location?: string;
  status?: string;
  joinDate?: string;
  lastActivity?: string;
}

interface Equipment {
  id: number;
  type: string;
  model: string;
  location: string;
  clientName: string;
  lastInspection: string;
  nextInspection: string;
  status: 'Good' | 'Needs Attention' | 'Critical';
  compliance: number;
}

export default function VendorDetailsPage() {
  return (
    <RequireRole allowedRoles={['admin']}>
      <VendorDetailsContent />
    </RequireRole>
  );
}

function VendorDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const vendorId = parseInt(params.id as string);
  
  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company_name: '',
    business_type: '',
    license_number: '',
    contact_person_name: '',
    contact_title: '',
    primary_email: '',
    primary_phone: '',
    secondary_phone: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'Sri Lanka'
  });

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        setIsLoading(true);
        
        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const headers = getAuthHeaders();

        // Fetch vendor details
        const url = API_ENDPOINTS.VENDORS.BY_ID(vendorId);
        logApiCall('GET', url);
        const vendorResponse = await fetch(url, { headers });
        const vendorResult = await vendorResponse.json();

        if (!vendorResponse.ok) {
          throw new Error(vendorResult.message || 'Failed to fetch vendor details');
        }

        if (vendorResult.success && vendorResult.data) {
          const vendorData = vendorResult.data;
          
          // Transform data to include computed fields for display
          const transformedVendor: VendorDetails = {
            ...vendorData,
            name: vendorData.company?.company_name || vendorData.display_name || `${vendorData.first_name} ${vendorData.last_name}`,
            phone: vendorData.contact?.primary_phone || '',
            location: vendorData.address ? `${vendorData.address.city}, ${vendorData.address.state}` : '',
            status: vendorData.is_locked ? 'Inactive' : 'Active',
            joinDate: new Date(vendorData.created_at).toLocaleDateString(),
            lastActivity: vendorData.last_login ? new Date(vendorData.last_login).toLocaleDateString() : 'Never'
          };
          
          setVendor(transformedVendor);
          
          // Populate edit form
          setEditForm({
            first_name: vendorData.first_name || '',
            last_name: vendorData.last_name || '',
            email: vendorData.email || '',
            company_name: vendorData.company?.company_name || '',
            business_type: vendorData.company?.business_type || '',
            license_number: vendorData.company?.license_number || '',
            contact_person_name: vendorData.contact?.contact_person_name || '',
            contact_title: vendorData.contact?.contact_title || '',
            primary_email: vendorData.contact?.primary_email || '',
            primary_phone: vendorData.contact?.primary_phone || '',
            secondary_phone: vendorData.contact?.secondary_phone || '',
            street_address: vendorData.address?.street_address || '',
            city: vendorData.address?.city || '',
            state: vendorData.address?.state || '',
            zip_code: vendorData.address?.zip_code || '',
            country: vendorData.address?.country || 'Sri Lanka'
          });
        } else {
          throw new Error('Vendor not found');
        }

        // Fetch vendor equipment
        const equipmentUrl = API_ENDPOINTS.VENDORS.EQUIPMENT(vendorId);
        logApiCall('GET', equipmentUrl);
        const equipmentResponse = await fetch(equipmentUrl, { headers });
        const equipmentResult = await equipmentResponse.json();

        if (equipmentResponse.ok && equipmentResult.success && equipmentResult.data) {
          // Transform equipment data to match frontend interface
          const transformedEquipment: Equipment[] = equipmentResult.data.map((item: any) => {
            // Determine status based on maintenance and condition
            let status: 'Good' | 'Needs Attention' | 'Critical' = 'Good';
            
            if (item.status === 'maintenance' || item.status === 'out_of_service') {
              status = 'Critical';
            } else if (item.nextMaintenanceDate) {
              const daysUntilMaintenance = Math.floor(
                (new Date(item.nextMaintenanceDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              if (daysUntilMaintenance < 0) {
                status = 'Critical'; // Overdue
              } else if (daysUntilMaintenance < 30) {
                status = 'Needs Attention'; // Due soon
              }
            } else if (item.conditionRating && item.conditionRating < 3) {
              status = 'Needs Attention';
            }

            return {
              id: item.id,
              type: item.equipmentType || item.equipmentName || 'Unknown',
              model: item.model ? `${item.manufacturer || ''} ${item.model}`.trim() : 'N/A',
              location: item.location || 'Not specified',
              clientName: item.clientName || 'Unassigned',
              lastInspection: item.lastMaintenanceDate 
                ? new Date(item.lastMaintenanceDate).toLocaleDateString() 
                : 'Never',
              nextInspection: item.nextMaintenanceDate 
                ? new Date(item.nextMaintenanceDate).toLocaleDateString() 
                : 'Not scheduled',
              status,
              compliance: item.compliance || 0
            };
          });
          
          setEquipment(transformedEquipment);
        } else {
          // If equipment fetch fails, just set empty array and continue
          console.warn('Failed to fetch equipment data');
          setEquipment([]);
        }

      } catch (err) {
        console.error('Error fetching vendor data:', err);
        // Optionally redirect to vendors list or show error message
        router.push('/vendors');
      } finally {
        setIsLoading(false);
      }
    };

    if (vendorId && !isNaN(vendorId)) {
      fetchVendorData();
    } else {
      router.push('/vendors');
    }
  }, [vendorId, router]);

  const handleUpdateVendor = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.VENDORS.BY_ID(vendorId);

      logApiCall('PUT', url, editForm);
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update vendor');
      }

      // Refresh vendor data
      window.location.reload();
    } catch (err) {
      console.error('Error updating vendor:', err);
      alert(err instanceof Error ? err.message : 'Failed to update vendor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    if (vendor) {
      setEditForm({
        first_name: vendor.first_name || '',
        last_name: vendor.last_name || '',
        email: vendor.email || '',
        company_name: vendor.company?.company_name || '',
        business_type: vendor.company?.business_type || '',
        license_number: vendor.company?.license_number || '',
        contact_person_name: vendor.contact?.contact_person_name || '',
        contact_title: vendor.contact?.contact_title || '',
        primary_email: vendor.contact?.primary_email || '',
        primary_phone: vendor.contact?.primary_phone || '',
        secondary_phone: vendor.contact?.secondary_phone || '',
        street_address: vendor.address?.street_address || '',
        city: vendor.address?.city || '',
        state: vendor.address?.state || '',
        zip_code: vendor.address?.zip_code || '',
        country: vendor.address?.country || 'Sri Lanka'
      });
    }
  };

  const handleDeleteVendor = async () => {
    if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }

    try {
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

      router.push('/vendors');
    } catch (err) {
      console.error('Error deleting vendor:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete vendor');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEquipmentStatusColor = (status: string) => {
    switch (status) {
      case 'Good':
        return 'bg-green-100 text-green-800';
      case 'Needs Attention':
        return 'bg-yellow-100 text-yellow-800';
      case 'Critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading vendor details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!vendor) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Vendor not found</h3>
          <p className="text-gray-500 mb-4">The vendor you're looking for doesn't exist.</p>
          <Link href="/vendors" className="btn-primary">
            Back to Vendors
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/vendors"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(vendor.status || 'Active')}`}>
                  {vendor.status || 'Active'}
                </span>
                <span className="text-sm text-gray-500">
                  Member since {vendor.joinDate || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleUpdateVendor}
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Reset password for ${vendor.name}? They will receive an email with login instructions.`)) {
                      // In real app, make API call to reset password
                      console.log('Resetting password for vendor:', vendorId);
                      alert('Password reset email sent successfully!');
                    }
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span>Reset Password</span>
                </button>
                <button
                  onClick={handleDeleteVendor}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
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
                <UserIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.assignments_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-xl">
                <FireIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Equipment</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.equipment_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Specializations</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.specializations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-50 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.status || 'Active'}</p>
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
                { id: 'equipment', name: 'Equipment', icon: FireIcon }
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
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <UserIcon className="h-5 w-5 text-red-600 mr-2" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                        <p className="text-sm text-gray-900">{vendor.contact?.contact_person_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{vendor.contact?.contact_title || ''}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Primary Email</label>
                        <p className="text-sm text-gray-900">{vendor.contact?.primary_email || vendor.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Primary Phone</label>
                        <p className="text-sm text-gray-900">{vendor.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        {vendor.address ? (
                          <>
                            <p className="text-sm text-gray-900">{vendor.address.street_address}</p>
                            <p className="text-sm text-gray-900">{vendor.address.city}, {vendor.address.state} {vendor.address.zip_code}</p>
                            <p className="text-sm text-gray-900">{vendor.address.country}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-900">N/A</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 text-red-600 mr-2" />
                    Business Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company Name</label>
                      <p className="text-sm text-gray-900">{vendor.company?.company_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Type</label>
                      <p className="text-sm text-gray-900">{vendor.company?.business_type || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Number</label>
                      <p className="text-sm text-gray-900">{vendor.company?.license_number || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{vendor.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Status</label>
                      <p className="text-sm text-gray-900">{vendor.is_locked ? 'Locked' : 'Active'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Login</label>
                      <p className="text-sm text-gray-900">{vendor.lastActivity || 'Never'}</p>
                    </div>
                  </div>
                </div>

                {/* Service Areas & Specializations */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 text-red-600 mr-2" />
                    Specializations
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Specializations</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {vendor.specializations && vendor.specializations.length > 0 ? (
                          vendor.specializations.map((spec, index) => (
                            <span key={index} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-800 border border-red-200">
                              {spec}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No specializations specified</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Equipment Tab */}
            {activeTab === 'equipment' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Equipment Managed ({equipment.length})
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Equipment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Client & Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Last Inspection
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Next Inspection
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Compliance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {equipment.map((item, index) => (
                        <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${index !== equipment.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.type}</div>
                              <div className="text-sm text-gray-500">{item.model}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-900">{item.clientName}</div>
                              <div className="text-sm text-gray-500">{item.location}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.lastInspection).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.nextInspection).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getEquipmentStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3 max-w-[100px]">
                                <div 
                                  className={`h-2 rounded-full ${item.compliance >= 90 ? 'bg-green-500' : item.compliance >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${item.compliance}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{item.compliance}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}