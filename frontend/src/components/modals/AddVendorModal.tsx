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
  primaryPhone: z.string().regex(/^(\+94|0)[1-9]\d{8}$/, 'Please enter a valid Sri Lankan phone number'),
  
  // Address Information
  streetAddress: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(3, 'Valid ZIP code is required').max(10, 'ZIP code too long'),
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
    trigger,
    getValues
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      specializations: [],
      country: 'Sri Lanka',
    },
  });

  // Real-time validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isEmailChecking, setIsEmailChecking] = useState(false);

  const watchSpecializations = watch('specializations');
  const watchEmail = watch('email');
  const watchZipCode = watch('zipCode');

  // Real-time validation functions
  const validateEmail = async (email: string) => {
    if (!email || email.length < 3) return '';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }

    // Check if email already exists
    try {
      setIsEmailChecking(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const response = await fetch(`${API_ENDPOINTS.VENDORS.LIST}?search=${encodeURIComponent(email)}`, { headers });
      const result = await response.json();
      
      if (result.success && result.data.vendors.length > 0) {
        const existingVendor = result.data.vendors.find((v: any) => v.email === email);
        if (existingVendor) {
          return 'A vendor with this email already exists';
        }
      }
    } catch (error) {
      console.warn('Email uniqueness check failed:', error);
    } finally {
      setIsEmailChecking(false);
    }
    
    return '';
  };

  const validateZipCode = (zipCode: string) => {
    if (!zipCode) return '';
    
    // Accept various formats: 12345, 12345-6789, or international postal codes
    const zipRegex = /^[A-Za-z0-9\s\-]{3,10}$/;
    if (!zipRegex.test(zipCode)) {
      return 'Please enter a valid postal/ZIP code (3-10 characters)';
    }
    return '';
  };

  const validatePhone = (phone: string) => {
    if (!phone) return '';
    
    // Sri Lankan phone number format: +94XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+94|0)[1-9][0-9]{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return 'Please enter a valid Sri Lankan phone number';
    }
    return '';
  };

  const validateName = (name: string, fieldName: string) => {
    if (!name) return `${fieldName} is required`;
    if (name.length < 2) return `${fieldName} must be at least 2 characters`;
    if (name.length > 50) return `${fieldName} must not exceed 50 characters`;
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    return '';
  };

  const validateCompanyName = (name: string) => {
    if (!name) return 'Company name is required';
    if (name.length < 2) return 'Company name must be at least 2 characters';
    if (name.length > 200) return 'Company name must not exceed 200 characters';
    return '';
  };

  const validateLicenseNumber = (license: string) => {
    if (!license) return ''; // Optional field
    if (license.length > 100) return 'License number must not exceed 100 characters';
    return '';
  };

  const validateAddress = (address: string) => {
    if (!address) return 'Street address is required';
    if (address.length < 5) return 'Street address must be at least 5 characters';
    if (address.length > 500) return 'Street address must not exceed 500 characters';
    return '';
  };

  const validateCity = (city: string) => {
    if (!city) return 'City is required';
    if (city.length < 2) return 'City must be at least 2 characters';
    if (city.length > 100) return 'City must not exceed 100 characters';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    if (!/(?=.*[@$!%*?&])/.test(password)) return 'Password must contain at least one special character (@$!%*?&)';
    return '';
  };



  // Real-time email validation
  React.useEffect(() => {
    if (watchEmail) {
      const timer = setTimeout(async () => {
        const error = await validateEmail(watchEmail);
        setFieldErrors(prev => ({ ...prev, email: error }));
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timer);
    }
  }, [watchEmail]);

  // Real-time ZIP code validation
  React.useEffect(() => {
    if (watchZipCode) {
      const error = validateZipCode(watchZipCode);
      setFieldErrors(prev => ({ ...prev, zipCode: error }));
    }
  }, [watchZipCode]);

  // Real-time validation for all fields
  const watchPrimaryPhone = watch('primaryPhone');
  const watchFirstName = watch('firstName');
  const watchLastName = watch('lastName');
  const watchCompanyName = watch('companyName');
  const watchLicenseNumber = watch('licenseNumber');
  const watchStreetAddress = watch('streetAddress');
  const watchCity = watch('city');
  const watchPassword = watch('password');

  // Real-time phone validation
  React.useEffect(() => {
    if (watchPrimaryPhone) {
      const error = validatePhone(watchPrimaryPhone);
      setFieldErrors(prev => ({ ...prev, primaryPhone: error }));
    }
  }, [watchPrimaryPhone]);

  // Real-time name validations
  React.useEffect(() => {
    if (watchFirstName) {
      const error = validateName(watchFirstName, 'First name');
      setFieldErrors(prev => ({ ...prev, firstName: error }));
    }
  }, [watchFirstName]);

  React.useEffect(() => {
    if (watchLastName) {
      const error = validateName(watchLastName, 'Last name');
      setFieldErrors(prev => ({ ...prev, lastName: error }));
    }
  }, [watchLastName]);

  // Real-time company name validation
  React.useEffect(() => {
    if (watchCompanyName) {
      const error = validateCompanyName(watchCompanyName);
      setFieldErrors(prev => ({ ...prev, companyName: error }));
    }
  }, [watchCompanyName]);

  // Real-time license validation
  React.useEffect(() => {
    if (watchLicenseNumber) {
      const error = validateLicenseNumber(watchLicenseNumber);
      setFieldErrors(prev => ({ ...prev, licenseNumber: error }));
    }
  }, [watchLicenseNumber]);

  // Real-time address validation
  React.useEffect(() => {
    if (watchStreetAddress) {
      const error = validateAddress(watchStreetAddress);
      setFieldErrors(prev => ({ ...prev, streetAddress: error }));
    }
  }, [watchStreetAddress]);

  // Real-time city validation
  React.useEffect(() => {
    if (watchCity) {
      const error = validateCity(watchCity);
      setFieldErrors(prev => ({ ...prev, city: error }));
    }
  }, [watchCity]);

  // Real-time password validation
  React.useEffect(() => {
    if (watchPassword) {
      const error = validatePassword(watchPassword);
      setFieldErrors(prev => ({ ...prev, password: error }));
    }
  }, [watchPassword]);

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
    
    try {
      // Log the data being sent for debugging
      console.log('AddVendorModal: Submitting vendor data:', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        companyName: data.companyName,
        businessType: data.businessType,
        licenseNumber: data.licenseNumber,
        primaryPhone: data.primaryPhone,
        streetAddress: data.streetAddress,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        specializations: data.specializations,
        dataKeys: Object.keys(data),
        fullDataObject: data
      });
      
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

      console.log('AddVendorModal: API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        result: result
      });

      if (!response.ok) {
        // Enhanced error logging
        console.error('AddVendorModal: API Error Details:', {
          status: response.status,
          message: result.message,
          errors: result.errors,
          validationErrors: result.validationErrors,
          fullResult: result
        });
        
        // Handle specific error types with toast notifications
        if (response.status === 409) {
          toast.error(result.message || 'A vendor with this email already exists');
        } else if (response.status === 400 && result.validationErrors) {
          // Handle validation errors
          const firstError = result.validationErrors[0];
          toast.error(`Validation Error: ${firstError.message}`);
        } else {
          toast.error(result.message || 'Failed to create vendor');
        }
        return; // Don't throw error, just show toast and return
      }

      toast.success(TOAST_MESSAGES.VENDOR_CREATED);
      reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('AddVendorModal: Error creating vendor:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('AddVendorModal: Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      // Only use toast notifications, no modal error state
      const errorMessage = error instanceof Error ? error.message : 'Failed to create vendor';
      toast.error(errorMessage);
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
                      className={`input-field ${
                        errors.firstName || fieldErrors.firstName 
                          ? 'border-red-500' 
                          : fieldErrors.firstName === '' && watchFirstName 
                            ? 'border-green-500' 
                            : ''
                      }`}
                      placeholder="Enter first name"
                      {...register('firstName')}
                    />
                    {(errors.firstName || fieldErrors.firstName) && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.firstName?.message || fieldErrors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${
                        errors.lastName || fieldErrors.lastName 
                          ? 'border-red-500' 
                          : fieldErrors.lastName === '' && watchLastName 
                            ? 'border-green-500' 
                            : ''
                      }`}
                      placeholder="Enter last name"
                      {...register('lastName')}
                    />
                    {(errors.lastName || fieldErrors.lastName) && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.lastName?.message || fieldErrors.lastName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                      {isEmailChecking && (
                        <span className="ml-2 text-xs text-blue-600">
                          Checking availability...
                        </span>
                      )}
                    </label>
                    <input
                      type="email"
                      className={`input-field ${
                        errors.email || fieldErrors.email 
                          ? 'border-red-500' 
                          : fieldErrors.email === '' && watchEmail 
                            ? 'border-green-500' 
                            : ''
                      }`}
                      placeholder="Enter email address"
                      {...register('email')}
                    />
                    {(errors.email || fieldErrors.email) && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email?.message || fieldErrors.email}
                      </p>
                    )}
                    {!errors.email && !fieldErrors.email && watchEmail && fieldErrors.email === '' && (
                      <p className="mt-1 text-sm text-green-600">✓ Email is available</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      className={`input-field ${
                        errors.password || fieldErrors.password 
                          ? 'border-red-500' 
                          : fieldErrors.password === '' && watchPassword 
                            ? 'border-green-500' 
                            : ''
                      }`}
                      placeholder="Enter password (min 8 chars, include uppercase, lowercase, number, special char)"
                      {...register('password')}
                    />
                    {(errors.password || fieldErrors.password) && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.password?.message || fieldErrors.password}
                      </p>
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
                      className={`input-field ${
                        errors.companyName || fieldErrors.companyName 
                          ? 'border-red-500' 
                          : fieldErrors.companyName === '' && watchCompanyName 
                            ? 'border-green-500' 
                            : ''
                      }`}
                      placeholder="Enter company name"
                      {...register('companyName')}
                    />
                    {(errors.companyName || fieldErrors.companyName) && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.companyName?.message || fieldErrors.companyName}
                      </p>
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
                      className={`input-field ${
                        errors.licenseNumber || fieldErrors.licenseNumber 
                          ? 'border-red-500' 
                          : fieldErrors.licenseNumber === '' && watchLicenseNumber 
                            ? 'border-green-500' 
                            : ''
                      }`}
                      placeholder="Enter license number"
                      {...register('licenseNumber')}
                    />
                    {(errors.licenseNumber || fieldErrors.licenseNumber) && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.licenseNumber?.message || fieldErrors.licenseNumber}
                      </p>
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
                
                <div className="grid grid-cols-1 gap-4">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Phone *
                    </label>
                    <input
                      type="tel"
                      className={`input-field ${
                        errors.primaryPhone || fieldErrors.primaryPhone 
                          ? 'border-red-500' 
                          : !fieldErrors.primaryPhone && watchPrimaryPhone 
                            ? 'border-green-500' 
                            : ''
                      }`}
                      placeholder="+94 XX XXX XXXX or 0XX XXX XXXX"
                      {...register('primaryPhone')}
                    />
                    {(errors.primaryPhone || fieldErrors.primaryPhone) && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.primaryPhone?.message || fieldErrors.primaryPhone}
                      </p>
                    )}
                    {!errors.primaryPhone && !fieldErrors.primaryPhone && watchPrimaryPhone && (
                      <p className="mt-1 text-sm text-green-600">✓ Valid phone number format</p>
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
                      className={`input-field ${
                        errors.streetAddress || fieldErrors.streetAddress 
                          ? 'border-red-500' 
                          : fieldErrors.streetAddress === '' && watchStreetAddress 
                            ? 'border-green-500' 
                            : ''
                      }`}
                      placeholder="123 Main Street, Suite 100"
                      {...register('streetAddress')}
                    />
                    {(errors.streetAddress || fieldErrors.streetAddress) && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.streetAddress?.message || fieldErrors.streetAddress}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        className={`input-field ${
                          errors.city || fieldErrors.city 
                            ? 'border-red-500' 
                            : fieldErrors.city === '' && watchCity 
                              ? 'border-green-500' 
                              : ''
                        }`}
                        placeholder="Colombo"
                        {...register('city')}
                      />
                      {(errors.city || fieldErrors.city) && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.city?.message || fieldErrors.city}
                        </p>
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
                        className={`input-field ${
                          errors.zipCode || fieldErrors.zipCode 
                            ? 'border-red-500' 
                            : !fieldErrors.zipCode && watchZipCode 
                              ? 'border-green-500' 
                              : ''
                        }`}
                        placeholder="00100 (3-10 characters)"
                        {...register('zipCode')}
                      />
                      {(errors.zipCode || fieldErrors.zipCode) && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.zipCode?.message || fieldErrors.zipCode}
                        </p>
                      )}
                      {!errors.zipCode && !fieldErrors.zipCode && watchZipCode && (
                        <p className="mt-1 text-sm text-green-600">✓ Valid postal code format</p>
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