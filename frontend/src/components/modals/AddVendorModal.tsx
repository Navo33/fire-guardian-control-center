'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '../../config/api';
import { useToast } from '../providers/ToastProvider';
import { handleApiError, TOAST_MESSAGES } from '../../utils/toastUtils';
import DebugLogger from '../../utils/DebugLogger';
import LoadingSpinner from '../ui/LoadingSpinner';
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
  // User Information
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain uppercase, lowercase, number and special character'),
  
  // Company Information
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  businessType: z.string().min(1, 'Please select a business type'),
  licenseNumber: z.string().optional(),
  
  // Contact Information
  contactPersonName: z.string().min(2, 'Contact person name is required'),
  contactTitle: z.string().optional(),
  primaryEmail: z.string().email('Please enter a valid email address'),
  primaryPhone: z.string().min(10, 'Please enter a valid phone number'),
  
  // Address Information
  streetAddress: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Valid ZIP code is required'),
  country: z.string().min(2, 'Country is required'),
  
  // Specializations
  specializations: z.array(z.string()).min(1, 'Please select at least one specialization'),
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
  const [specializationOptions, setSpecializationOptions] = useState<string[]>([]);
  const [isLoadingSpecializations, setIsLoadingSpecializations] = useState(false);
  const toast = useToast();

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
      primaryEmail: '', // Will be set to same as email when email changes
    },
  });

  const watchSpecializations = watch('specializations');
  const watchEmail = watch('email');

  // Sync primaryEmail with email
  React.useEffect(() => {
    if (watchEmail) {
      setValue('primaryEmail', watchEmail);
    }
  }, [watchEmail, setValue]);

  // Fetch specializations when modal opens
  useEffect(() => {
    if (isOpen && specializationOptions.length === 0) {
      fetchSpecializations();
    }
  }, [isOpen]);

  const businessTypes = [
    'Private Limited',
    'LLC',
    'Partnership',
    'Sole Proprietorship'
  ];

  const sriLankanProvinces = [
    'Western Province',
    'Central Province',
    'Southern Province',
    'Northern Province',
    'Eastern Province',
    'North Western Province',
    'North Central Province',
    'Uva Province',
    'Sabaragamuwa Province'
  ];

  // Fetch specializations from API
  const fetchSpecializations = async () => {
    const startTime = DebugLogger.startTimer();
    DebugLogger.ui('AddVendorModal', 'fetchSpecializations started');
    
    try {
      setIsLoadingSpecializations(true);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();

      logApiCall('GET', API_ENDPOINTS.VENDORS.SPECIALIZATIONS);
      const response = await fetch(API_ENDPOINTS.VENDORS.SPECIALIZATIONS, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch specializations: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      DebugLogger.api('GET', API_ENDPOINTS.VENDORS.SPECIALIZATIONS, undefined, result, response.status);

      if (result.success) {
        // Extract specialization names from the API response
        const specializations = result.data.map((spec: any) => spec.name || spec);
        setSpecializationOptions(specializations);
        DebugLogger.log('Specializations loaded successfully', { count: specializations.length }, 'VENDOR_MODAL');
      } else {
        throw new Error(result.message || 'Failed to load specializations');
      }

      DebugLogger.performance('Specializations fetch', startTime);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load specializations';
      DebugLogger.error('Specializations fetch failed', err, { errorMessage });
      // Use fallback specializations if API fails
      setSpecializationOptions([
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
      ]);
    } finally {
      setIsLoadingSpecializations(false);
    }
  };

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
        toast.success(TOAST_MESSAGES.VENDOR_CREATED);
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

      const headers = getAuthHeaders();

      logApiCall('POST', API_ENDPOINTS.VENDORS.CREATE, data);
      const response = await fetch(API_ENDPOINTS.VENDORS.CREATE, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create vendor');
      }

      toast.success(TOAST_MESSAGES.VENDOR_CREATED);
      reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create vendor';
      setError(errorMessage);
      handleApiError(toast, error, 'Failed to create vendor');
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
              
              {/* User Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">User Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.firstName ? 'border-red-500' : ''}`}
                      placeholder="Enter first name"
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.lastName ? 'border-red-500' : ''}`}
                      placeholder="Enter last name"
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="Enter email address"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="Enter password"
                      {...register('password')}
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                </div>
              </div>

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

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number (Optional)
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.licenseNumber ? 'border-red-500' : ''}`}
                      placeholder="Enter license number"
                      {...register('licenseNumber')}
                    />
                    {errors.licenseNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.licenseNumber.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <PhoneIcon className="h-5 w-5 text-red-600" />
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
                      Contact Title (Optional)
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
                      className="input-field bg-gray-50"
                      placeholder="Auto-filled from user email"
                      {...register('primaryEmail')}
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">This will be the same as the user email above</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Phone *
                    </label>
                    <input
                      type="tel"
                      className={`input-field ${errors.primaryPhone ? 'border-red-500' : ''}`}
                      placeholder="+94 XX XXX XXXX"
                      {...register('primaryPhone')}
                    />
                    {errors.primaryPhone && (
                      <p className="mt-1 text-sm text-red-600">{errors.primaryPhone.message}</p>
                    )}
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
                        placeholder="Colombo"
                        {...register('city')}
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Province *
                      </label>
                      <select
                        className={`input-field ${errors.state ? 'border-red-500' : ''}`}
                        {...register('state')}
                      >
                        <option value="">Select province</option>
                        {sriLankanProvinces.map(province => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                      </select>
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
                        placeholder="00100"
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
                        className="input-field bg-gray-50"
                        {...register('country')}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Specializations Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <ShieldCheckIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Specializations</h3>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select the areas of expertise for this vendor (at least one required):
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {specializationOptions.map((specialization) => (
                      <label
                        key={specialization}
                        className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                          checked={watchSpecializations?.includes(specialization) || false}
                          onChange={(e) => handleSpecializationChange(specialization, e.target.checked)}
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          {specialization}
                        </span>
                      </label>
                    ))}
                  </div>
                  
                  {errors.specializations && (
                    <p className="text-sm text-red-600">{errors.specializations.message}</p>
                  )}
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
                    <span className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Adding Vendor...</span>
                    </span>
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