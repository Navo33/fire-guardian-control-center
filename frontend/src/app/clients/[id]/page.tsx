'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useToast } from '@/components/providers/ToastProvider';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  FireIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ClientDetail {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone?: string;
  primary_phone?: string;
  company_name: string;
  business_type?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  equipment_count: number;
  compliance_score: number;
  last_service_date?: string;
  total_maintenance_requests: number;
  pending_requests: number;
  vendor?: {
    id: number;
    display_name: string;
    company_name: string;
    email: string;
  };
}

interface ClientEquipment {
  id: number;
  equipment_name: string;
  equipment_type: string;
  serial_number: string;
  model: string;
  status: 'active' | 'maintenance' | 'retired';
  condition_rating: number;
  last_inspection_date?: string;
  next_inspection_date?: string;
  assigned_date: string;
}

interface MaintenanceHistory {
  id: number;
  ticket_number: string;
  service_type: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date?: string;
  completed_date?: string;
  technician_name?: string;
  cost?: number;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const clientId = params.id as string;
  
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [equipment, setEquipment] = useState<ClientEquipment[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    business_type: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: ''
  });

  // Fetch client details
  const fetchClientDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.CLIENTS.BY_ID(clientId);

      logApiCall('GET', url);
      const response = await fetch(url, { headers });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch client details');
      }

      setClient(result.data);
      setEditForm({
        first_name: result.data.first_name || '',
        last_name: result.data.last_name || '',
        email: result.data.email || '',
        phone: result.data.primary_phone || result.data.phone || '',
        company_name: result.data.company_name || '',
        business_type: result.data.business_type || '',
        street_address: result.data.street_address || '',
        city: result.data.city || '',
        state: result.data.state || '',
        zip_code: result.data.zip_code || '',
        country: result.data.country || ''
      });
    } catch (err) {
      console.error('Error fetching client details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch client details');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch client equipment
  const fetchClientEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.CLIENTS.EQUIPMENT(clientId);

      logApiCall('GET', url);
      const response = await fetch(url, { headers });
      const result = await response.json();

      if (response.ok) {
        setEquipment(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching client equipment:', err);
    }
  };

  // Fetch maintenance history
  const fetchMaintenanceHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.CLIENTS.MAINTENANCE(clientId);

      logApiCall('GET', url);
      const response = await fetch(url, { headers });
      const result = await response.json();

      if (response.ok) {
        setMaintenanceHistory(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching maintenance history:', err);
    }
  };

  // Update client details
  const handleUpdateClient = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.CLIENTS.UPDATE(clientId);

      logApiCall('PUT', url);
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update client');
      }

      showToast('success', 'Client updated successfully');
      fetchClientDetails();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating client:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update client';
      setError(errorMessage);
      showToast('error', errorMessage);
    }
  };

  // Delete client
  const handleDeleteClient = async () => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.CLIENTS.DELETE(clientId);

      logApiCall('DELETE', url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete client');
      }

      showToast('success', 'Client deleted successfully');
      router.push('/clients');
    } catch (err) {
      console.error('Error deleting client:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete client';
      setError(errorMessage);
      showToast('error', errorMessage);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
      fetchClientEquipment();
      fetchMaintenanceHistory();
    }
  }, [clientId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'retired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'open':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (error && !client) {
    return (
      <DashboardLayout>
        <ErrorDisplay message={error} />
      </DashboardLayout>
    );
  }

  if (isLoading || !client) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
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
              href="/clients"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.company_name}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${client.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                  {client.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Client since {formatDate(client.created_at)}
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
            <Link
              href={`/maintenance-tickets/create?client_id=${client.id}`}
              className="btn-primary flex items-center space-x-2"
            >
              <WrenchScrewdriverIcon className="h-4 w-4" />
              <span>Create Ticket</span>
            </Link>
            <button
              onClick={handleDeleteClient}
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
              <div className="flex-shrink-0">
                <FireIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Equipment</p>
                <p className="text-2xl font-bold text-gray-900">{client.equipment_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Compliance</p>
                <p className="text-2xl font-bold text-gray-900">{client.compliance_score?.toFixed(1) || '0.0'}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Maintenance</p>
                <p className="text-2xl font-bold text-gray-900">{client.total_maintenance_requests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{client.pending_requests}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: UserIcon },
                { id: 'vendor', name: 'Vendor Details', icon: BuildingOfficeIcon },
                { id: 'equipment', name: 'Equipment', icon: FireIcon },
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
                    <BuildingOfficeIcon className="h-5 w-5 text-red-600 mr-2" />
                    Company Information
                  </h3>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={editForm.company_name}
                            onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Type
                          </label>
                          <input
                            type="text"
                            value={editForm.business_type}
                            onChange={(e) => setEditForm({ ...editForm, business_type: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={editForm.first_name}
                            onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={editForm.last_name}
                            onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                          </label>
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Street Address
                        </label>
                        <input
                          type="text"
                          value={editForm.street_address}
                          onChange={(e) => setEditForm({ ...editForm, street_address: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ZIP Code
                          </label>
                          <input
                            type="text"
                            value={editForm.zip_code}
                            onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button onClick={handleUpdateClient} className="btn-primary">
                          Save Changes
                        </button>
                        <button onClick={() => setIsEditing(false)} className="btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Company Name</label>
                        <p className="text-sm text-gray-900">{client.company_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Business Type</label>
                        <p className="text-sm text-gray-900">{client.business_type || 'Not specified'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                        <p className="text-sm text-gray-900">{client.display_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="text-sm text-gray-900">{client.email}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-sm text-gray-900">{client.primary_phone || client.phone || 'Not provided'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <p className="text-sm text-gray-900">{client.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <p className="text-sm text-gray-900">
                          {client.street_address && (
                            <>
                              {client.street_address}<br />
                              {client.city}, {client.state} {client.zip_code}
                              {client.country && <><br />{client.country}</>}
                            </>
                          )}
                          {!client.street_address && 'Not provided'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Service</label>
                        <p className="text-sm text-gray-900">
                          {client.last_service_date ? formatDate(client.last_service_date) : 'No service history'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Client Since</label>
                        <p className="text-sm text-gray-900">{formatDate(client.created_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vendor Details Tab */}
            {activeTab === 'vendor' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 text-red-600 mr-2" />
                  Vendor Information
                </h3>
                
                {client.vendor ? (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vendor Company
                        </label>
                        <p className="text-sm text-gray-900 font-medium">{client.vendor.company_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Person
                        </label>
                        <p className="text-sm text-gray-900">{client.vendor.display_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <p className="text-sm text-gray-900">
                          <a 
                            href={`mailto:${client.vendor.email}`}
                            className="text-red-600 hover:text-red-800"
                          >
                            {client.vendor.email}
                          </a>
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vendor ID
                        </label>
                        <p className="text-sm text-gray-900">#{client.vendor.id}</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <Link
                          href={`/vendors/${client.vendor.id}`}
                          className="btn-primary flex items-center space-x-2"
                        >
                          <UserGroupIcon className="h-4 w-4" />
                          <span>View Vendor Profile</span>
                        </Link>
                        
                        <Link
                          href={`/vendors/${client.vendor.id}/contact`}
                          className="btn-secondary flex items-center space-x-2"
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                          <span>Contact Vendor</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Vendor Assigned</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      This client is not currently assigned to any vendor.
                    </p>
                    <Link
                      href={`/clients/${client.id}/assign-vendor`}
                      className="inline-flex items-center text-red-600 hover:text-red-800 font-medium"
                    >
                      <span>Assign Vendor</span>
                      <span className="ml-1">→</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Equipment Tab */}
            {activeTab === 'equipment' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Equipment ({equipment.length})
                  </h3>
                  <Link
                    href={`/equipment/assign?client_id=${client.id}`}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <FireIcon className="h-4 w-4" />
                    <span>Assign Equipment</span>
                  </Link>
                </div>
                
                {equipment.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Equipment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Serial Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Condition
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Next Inspection
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
                            className={`hover:bg-gray-50 transition-colors ${index !== equipment.length - 1 ? 'border-b border-gray-100' : ''}`}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.equipment_name}</div>
                                <div className="text-sm text-gray-500">{item.equipment_type}</div>
                                <div className="text-xs text-gray-400">{item.model}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.serial_number}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="flex items-center">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      item.condition_rating >= 80 ? 'bg-green-500' :
                                      item.condition_rating >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${item.condition_rating}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs">{item.condition_rating}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {item.next_inspection_date ? formatDate(item.next_inspection_date) : 'Not scheduled'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <Link
                                  href={`/equipment/${item.id}`}
                                  className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                >
                                  View
                                </Link>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/maintenance-tickets/create?equipment_id=${item.id}`}
                                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
                                  Service
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FireIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No equipment assigned yet</p>
                    <Link
                      href={`/equipment/assign?client_id=${client.id}`}
                      className="mt-4 inline-flex items-center text-red-600 hover:text-red-800 font-medium"
                    >
                      <span>Assign Equipment</span>
                      <span className="ml-1">→</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Maintenance History Tab */}
            {activeTab === 'maintenance' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Maintenance History ({maintenanceHistory.length})
                  </h3>
                  <Link
                    href={`/maintenance-tickets/create?client_id=${client.id}`}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <WrenchScrewdriverIcon className="h-4 w-4" />
                    <span>New Service Request</span>
                  </Link>
                </div>
                
                {maintenanceHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Ticket
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Service Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Priority
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Scheduled
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Technician
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {maintenanceHistory.map((ticket, index) => (
                          <tr 
                            key={ticket.id} 
                            className={`hover:bg-gray-50 transition-colors ${index !== maintenanceHistory.length - 1 ? 'border-b border-gray-100' : ''}`}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">#{ticket.ticket_number}</div>
                                <div className="text-sm text-gray-500">{ticket.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {ticket.service_type}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {ticket.scheduled_date ? formatDate(ticket.scheduled_date) : 'Not scheduled'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {ticket.technician_name || 'Not assigned'}
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                href={`/maintenance-tickets/${ticket.id}`}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                              >
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <WrenchScrewdriverIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No maintenance history yet</p>
                    <Link
                      href={`/maintenance-tickets/create?client_id=${client.id}`}
                      className="mt-4 inline-flex items-center text-red-600 hover:text-red-800 font-medium"
                    >
                      <span>Create First Service Request</span>
                      <span className="ml-1">→</span>
                    </Link>
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