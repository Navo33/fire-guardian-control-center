'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  XMarkIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

// Vendor form validation schema
const vendorSchema = z.object({
  // Company Information
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  businessType: z.string().min(1, 'Please select a business type'),
  licenseNumber: z.string().min(1, 'License number is required'),
  taxId: z.string().min(1, 'Tax ID is required'),
  
  // Contact Information
  contactPersonName: z.string().min(2, 'Contact person name is required'),
  contactTitle: z.string().min(1, 'Contact title is required'),
  primaryEmail: z.string().email('Please enter a valid email address'),
  secondaryEmail: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  primaryPhone: z.string().min(10, 'Please enter a valid phone number'),
  secondaryPhone: z.string().optional(),
  
  // Address Information
  streetAddress: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Valid ZIP code is required'),
  country: z.string().min(2, 'Country is required'),
  
  // Business Details
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  yearsInBusiness: z.number().min(0, 'Years in business must be 0 or more'),
  employeeCount: z.number().min(1, 'Employee count must be at least 1'),
  serviceAreas: z.string().min(1, 'Service areas are required'),
  
  // Specializations
  specializations: z.array(z.string()).min(1, 'Please select at least one specialization'),
  certifications: z.string().optional(),
  
  // Additional Information
  notes: z.string().optional(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSubmit?: (vendorData: any) => void;
}

export default function AddVendorModal({ isOpen, onClose, onSuccess, onSubmit }: AddVendorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      specializations: [],
      country: 'Sri Lanka',
    },
  });

  const watchSpecializations = watch('specializations');

  const businessTypes = [
    'Corporation',
    'LLC',
    'Partnership',
    'Sole Proprietorship',
    'Non-Profit'
  ];

  const specializationOptions = [
    'Fire Extinguishers',
    'Sprinkler Systems',
    'Fire Alarms',
    'Emergency Lighting',
    'Fire Suppression Systems',
    'Exit Signs',
    'Emergency Equipment',
    'Fire Safety Inspections',
    'Fire Safety Training',
    'Hazmat Services'
  ];

  const handleSpecializationChange = (specialization: string, checked: boolean) => {
    const current = watchSpecializations || [];
    if (checked) {
      setValue('specializations', [...current, specialization]);
    } else {
      setValue('specializations', current.filter(s => s !== specialization));
    }
  };

  const onFormSubmit = async (data: VendorFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // If onSubmit prop is provided, use it instead of the default API call
      if (onSubmit) {
        await onSubmit(data);
        reset();
        onClose();
        if (onSuccess) {
          onSuccess();
        }
        return;
      }

      // Default API call behavior
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:5000/api/vendors', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create vendor');
      }

      reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      setError(error instanceof Error ? error.message : 'Failed to create vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-container">
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="modal-content">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <BuildingOfficeIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New Vendor</h2>
                <p className="text-sm text-gray-600">Enter vendor details and company information</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-8">
              {/* Company Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <BuildingOfficeIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.companyName ? 'border-red-500' : ''}`}
                      placeholder="Enter company name"
                      {...register('companyName')}
                    />
                    {errors.companyName && (
                      <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type *
                    </label>
                    <select
                      className={`input-field ${errors.businessType ? 'border-red-500' : ''}`}
                      {...register('businessType')}
                    >
                      <option value="">Select business type</option>
                      {businessTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.businessType && (
                      <p className="mt-1 text-sm text-red-600">{errors.businessType.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person Name *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.contactPersonName ? 'border-red-500' : ''}`}
                      placeholder="Primary contact name"
                      {...register('contactPersonName')}
                    />
                    {errors.contactPersonName && (
                      <p className="mt-1 text-sm text-red-600">{errors.contactPersonName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Title *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.contactTitle ? 'border-red-500' : ''}`}
                      placeholder="e.g., Operations Manager"
                      {...register('contactTitle')}
                    />
                    {errors.contactTitle && (
                      <p className="mt-1 text-sm text-red-600">{errors.contactTitle.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Email *
                    </label>
                    <input
                      type="email"
                      className={`input-field ${errors.primaryEmail ? 'border-red-500' : ''}`}
                      placeholder="contact@company.com"
                      {...register('primaryEmail')}
                    />
                    {errors.primaryEmail && (
                      <p className="mt-1 text-sm text-red-600">{errors.primaryEmail.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Email
                    </label>
                    <input
                      type="email"
                      className={`input-field ${errors.secondaryEmail ? 'border-red-500' : ''}`}
                      placeholder="backup@company.com"
                      {...register('secondaryEmail')}
                    />
                    {errors.secondaryEmail && (
                      <p className="mt-1 text-sm text-red-600">{errors.secondaryEmail.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Phone *
                    </label>
                    <input
                      type="tel"
                      className={`input-field ${errors.primaryPhone ? 'border-red-500' : ''}`}
                      placeholder="+1 (555) 123-4567"
                      {...register('primaryPhone')}
                    />
                    {errors.primaryPhone && (
                      <p className="mt-1 text-sm text-red-600">{errors.primaryPhone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Phone
                    </label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="+1 (555) 987-6543"
                      {...register('secondaryPhone')}
                    />
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.streetAddress ? 'border-red-500' : ''}`}
                      placeholder="123 Main Street, Suite 100"
                      {...register('streetAddress')}
                    />
                    {errors.streetAddress && (
                      <p className="mt-1 text-sm text-red-600">{errors.streetAddress.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        className={`input-field ${errors.city ? 'border-red-500' : ''}`}
                        placeholder="New York"
                        {...register('city')}
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        className={`input-field ${errors.state ? 'border-red-500' : ''}`}
                        placeholder="NY"
                        {...register('state')}
                      />
                      {errors.state && (
                        <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        className={`input-field ${errors.zipCode ? 'border-red-500' : ''}`}
                        placeholder="10001"
                        {...register('zipCode')}
                      />
                      {errors.zipCode && (
                        <p className="mt-1 text-sm text-red-600">{errors.zipCode.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country *
                      </label>
                      <input
                        type="text"
                        className={`input-field ${errors.country ? 'border-red-500' : ''}`}
                        {...register('country')}
                      />
                      {errors.country && (
                        <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Notes Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    rows={4}
                    className="input-field resize-none"
                    placeholder="Any additional information about this vendor..."
                    {...register('notes')}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding Vendor...</span>
                    </div>
                  ) : (
                    'Add Vendor'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}