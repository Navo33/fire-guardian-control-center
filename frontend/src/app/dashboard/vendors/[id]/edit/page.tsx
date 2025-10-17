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
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface VendorFormData {
  // User details
  firstName: string;
  lastName: string;
  email: string;
  
  // Company details
  companyName: string;
  businessType: string;
  licenseNumber: string;
  
  // Contact details
  contactPersonName: string;
  contactTitle: string;
  primaryEmail: string;
  primaryPhone: string;
  secondaryPhone: string;
  
  // Address details
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Specializations
  specializations: number[];
}

interface Specialization {
  id: number;
  name: string;
}

export default function EditVendorPage() {
  return (
    <RequireRole allowedRoles={['admin']}>
      <EditVendorContent />
    </RequireRole>
  );
}

function EditVendorContent() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSpecializations, setAvailableSpecializations] = useState<Specialization[]>([]);

  const [formData, setFormData] = useState<VendorFormData>({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    businessType: '',
    licenseNumber: '',
    contactPersonName: '',
    contactTitle: '',
    primaryEmail: '',
    primaryPhone: '',
    secondaryPhone: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Sri Lanka',
    specializations: []
  });

  useEffect(() => {
    if (vendorId && !isNaN(Number(vendorId))) {
      fetchVendorData();
      fetchSpecializations();
    } else {
      router.push('/dashboard/vendors');
    }
  }, [vendorId, router]);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.VENDORS.BY_ID(vendorId);
      logApiCall('GET', url);

      const response = await fetch(url, { headers });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch vendor details');
      }

      if (result.success && result.data) {
        const vendor = result.data;
        
        setFormData({
          firstName: vendor.first_name || '',
          lastName: vendor.last_name || '',
          email: vendor.email || '',
          companyName: vendor.company?.company_name || '',
          businessType: vendor.company?.business_type || '',
          licenseNumber: vendor.company?.license_number || '',
          contactPersonName: vendor.contact?.contact_person_name || '',
          contactTitle: vendor.contact?.contact_title || '',
          primaryEmail: vendor.contact?.primary_email || '',
          primaryPhone: vendor.contact?.primary_phone || '',
          secondaryPhone: vendor.contact?.secondary_phone || '',
          streetAddress: vendor.address?.street_address || '',
          city: vendor.address?.city || '',
          state: vendor.address?.state || '',
          zipCode: vendor.address?.zip_code || '',
          country: vendor.address?.country || 'Sri Lanka',
          specializations: vendor.specializations?.map((s: any) => s.id) || []
        });
      } else {
        throw new Error('Vendor not found');
      }
    } catch (err) {
      console.error('Error fetching vendor data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vendor');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecializations = async () => {
    try {
      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.VENDORS.SPECIALIZATIONS;
      logApiCall('GET', url);

      const response = await fetch(url, { headers });
      const result = await response.json();

      if (response.ok && result.success) {
        setAvailableSpecializations(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching specializations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const headers = getAuthHeaders();
      const url = API_ENDPOINTS.VENDORS.BY_ID(vendorId);
      logApiCall('PUT', url, formData);

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update vendor');
      }

      if (result.success) {
        // Redirect back to vendor details page
        router.push(`/dashboard/vendors/${vendorId}`);
      } else {
        throw new Error(result.message || 'Failed to update vendor');
      }
    } catch (err) {
      console.error('Error updating vendor:', err);
      alert(err instanceof Error ? err.message : 'Failed to update vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof VendorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecializationToggle = (specId: number) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specId)
        ? prev.specializations.filter(id => id !== specId)
        : [...prev.specializations, specId]
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <Link
            href="/dashboard/vendors"
            className="mt-4 inline-block text-red-600 hover:text-red-700"
          >
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
              href={`/dashboard/vendors/${vendorId}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Vendor</h1>
              <p className="text-sm text-gray-600 mt-1">Update vendor information and settings</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <UserIcon className="h-6 w-6 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">User Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => handleInputChange('businessType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select business type</option>
                  <option value="Fire Safety Equipment Supplier">Fire Safety Equipment Supplier</option>
                  <option value="Fire Extinguisher Service">Fire Extinguisher Service</option>
                  <option value="Fire Alarm Systems">Fire Alarm Systems</option>
                  <option value="Sprinkler Systems">Sprinkler Systems</option>
                  <option value="Fire Safety Consulting">Fire Safety Consulting</option>
                  <option value="Emergency Lighting">Emergency Lighting</option>
                  <option value="Fire Door Installation">Fire Door Installation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <PhoneIcon className="h-6 w-6 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contactPersonName}
                  onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Title
                </label>
                <input
                  type="text"
                  value={formData.contactTitle}
                  onChange={(e) => handleInputChange('contactTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Operations Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => handleInputChange('primaryEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.primaryPhone}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value && !value.startsWith('+')) {
                      value = '+94' + value;
                    }
                    handleInputChange('primaryPhone', value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="+94771234567"
                  pattern="^\+94\d{9}$"
                  title="Please enter a valid Sri Lankan phone number (e.g., +94771234567)"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Format: +94XXXXXXXXX</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Phone
                </label>
                <input
                  type="tel"
                  value={formData.secondaryPhone}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value && !value.startsWith('+')) {
                      value = '+94' + value;
                    }
                    handleInputChange('secondaryPhone', value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="+94771234567"
                  pattern="^\+94\d{9}$"
                  title="Please enter a valid Sri Lankan phone number (e.g., +94771234567)"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <MapPinIcon className="h-6 w-6 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Address Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.streetAddress}
                  onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={2}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Specializations */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Specializations</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableSpecializations.map((spec) => (
                <label
                  key={spec.id}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.specializations.includes(spec.id)}
                    onChange={() => handleSpecializationToggle(spec.id)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{spec.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pb-6">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
            <Link
              href={`/dashboard/vendors/${vendorId}`}
              className="btn-secondary flex items-center space-x-2"
            >
              <span>Cancel</span>
            </Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
