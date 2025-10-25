'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  XMarkIcon,
  FireIcon,
  CogIcon,
  CalendarIcon,
  MapPinIcon,
  DocumentTextIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/providers/ToastProvider';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import DebugLogger from '@/utils/DebugLogger';

// Equipment form validation schema
const equipmentSchema = z.object({
  equipment_id: z.string().min(1, 'Equipment type is required'),
  serial_number: z.string().min(1, 'Serial number is required'),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  warranty_expiry: z.string().optional(),
  maintenance_interval_days: z.string().min(1, 'Maintenance interval is required')
    .refine((val) => parseInt(val) > 0, 'Maintenance interval must be positive'),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

interface EquipmentType {
  id: number;
  name: string;
  category: string;
  description?: string;
}

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSubmit?: (equipmentData: any) => void;
  equipmentTypes: EquipmentType[];
}

export default function AddEquipmentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onSubmit,
  equipmentTypes 
}: AddEquipmentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      maintenance_interval_days: '365',
    },
  });

  const onFormSubmit = async (data: EquipmentFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // If onSubmit prop is provided, use it instead of the default API call
      if (onSubmit) {
        await onSubmit(data);
        success('Equipment added successfully');
        reset();
        onClose();
        if (onSuccess) {
          onSuccess();
        }
        return;
      }

      // Default API call behavior
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();

      logApiCall('POST', API_ENDPOINTS.EQUIPMENT.CREATE, data);
      const response = await fetch(API_ENDPOINTS.EQUIPMENT.CREATE, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to add equipment');
      }

      success('Equipment added successfully');
      reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error adding equipment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add equipment';
      setError(errorMessage);
      showError('Failed to add equipment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
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
                <FireIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New Equipment</h2>
                <p className="text-sm text-gray-600">Enter equipment details and specifications</p>
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
              
              {/* Equipment Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <FireIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Equipment Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equipment Type *
                    </label>
                    <select
                      className={`input-field ${errors.equipment_id ? 'border-red-500' : ''}`}
                      {...register('equipment_id')}
                    >
                      <option value="">Select equipment type</option>
                      {equipmentTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name} - {type.category}
                        </option>
                      ))}
                    </select>
                    {errors.equipment_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.equipment_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serial Number *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.serial_number ? 'border-red-500' : ''}`}
                      placeholder="Enter serial number"
                      {...register('serial_number')}
                    />
                    {errors.serial_number && (
                      <p className="mt-1 text-sm text-red-600">{errors.serial_number.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Purchase & Warranty Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Purchase & Warranty Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      className={`input-field ${errors.purchase_date ? 'border-red-500' : ''}`}
                      {...register('purchase_date')}
                    />
                    {errors.purchase_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.purchase_date.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warranty Expiry (Optional)
                    </label>
                    <input
                      type="date"
                      className={`input-field ${errors.warranty_expiry ? 'border-red-500' : ''}`}
                      {...register('warranty_expiry')}
                    />
                    {errors.warranty_expiry && (
                      <p className="mt-1 text-sm text-red-600">{errors.warranty_expiry.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Maintenance Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <CogIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Maintenance Information</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maintenance Interval (days) *
                    </label>
                    <input
                      type="number"
                      className={`input-field ${errors.maintenance_interval_days ? 'border-red-500' : ''}`}
                      placeholder="365"
                      min="1"
                      {...register('maintenance_interval_days')}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      How often this equipment requires maintenance (e.g., 365 for annually)
                    </p>
                    {errors.maintenance_interval_days && (
                      <p className="mt-1 text-sm text-red-600">{errors.maintenance_interval_days.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.location ? 'border-red-500' : ''}`}
                      placeholder="e.g., Building A - Floor 2, Storage Room"
                      {...register('location')}
                    />
                    {errors.location && (
                      <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      className={`input-field ${errors.notes ? 'border-red-500' : ''}`}
                      rows={4}
                      placeholder="Additional notes about this equipment..."
                      {...register('notes')}
                    />
                    {errors.notes && (
                      <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
                    )}
                  </div>
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
                      <span>Adding Equipment...</span>
                    </span>
                  ) : (
                    'Add Equipment'
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