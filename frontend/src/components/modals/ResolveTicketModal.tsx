'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../providers/ToastProvider';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Form validation schema
const resolveSchema = z.object({
  resolution_description: z.string()
    .min(10, 'Resolution notes must be at least 10 characters')
    .max(1000, 'Resolution notes cannot exceed 1000 characters'),
  actual_hours: z.coerce.number({
    required_error: 'Actual hours is required',
    invalid_type_error: 'Actual hours must be a number',
  })
    .min(0.1, 'Hours must be at least 0.1')
    .max(100, 'Hours cannot exceed 100'),
  custom_maintenance_date: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true; // Optional field
      const parsedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsedDate >= today;
    }, 'Maintenance date cannot be in the past'),
  custom_next_maintenance_date: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true; // Optional field
      const parsedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsedDate >= today;
    }, 'Next maintenance date cannot be in the past'),
});

type ResolveFormData = z.infer<typeof resolveSchema>;

interface ResolveTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ticketNumber: string;
  ticketId: string; // For API call (could be numeric ID or ticket number)
  ticket?: {
    support_type: 'maintenance' | 'system' | 'user';
    equipment?: {
      id: number;
      serial_number: string;
      equipment_name: string;
    };
  };
}

export default function ResolveTicketModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  ticketNumber,
  ticketId,
  ticket
}: ResolveTicketModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<ResolveFormData>({
    resolver: zodResolver(resolveSchema),
    mode: 'onChange',
    defaultValues: {
      resolution_description: '',
      actual_hours: 0,
      custom_maintenance_date: '',
      custom_next_maintenance_date: '',
    },
  });

  const onFormSubmit = async (data: ResolveFormData) => {
    // Prevent submission if there are validation errors
    if (Object.keys(errors).length > 0) {
      showToast('error', 'Please fix all validation errors before submitting');
      return;
    }

    setIsLoading(true);
    
    try {
      const requestBody = {
        resolution_description: data.resolution_description,
        actual_hours: data.actual_hours,
        ...(data.custom_maintenance_date && { custom_maintenance_date: data.custom_maintenance_date }),
        ...(data.custom_next_maintenance_date && { custom_next_maintenance_date: data.custom_next_maintenance_date }),
      };

      const response = await fetch(`${API_ENDPOINTS.MAINTENANCE_TICKETS.BASE}/${ticketId}/resolve`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resolve ticket');
      }

      const result = await response.json();
      
      showToast('success', `Ticket ${ticketNumber} resolved successfully`);
      
      // Reset form and close modal
      reset();
      onClose();
      
      // Call onSuccess after modal closes
      setTimeout(() => {
        onSuccess();
      }, 100);
      
    } catch (error) {
      console.error('Error resolving ticket:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to resolve ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      onClose();
    }
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
                <CheckCircleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Resolve Ticket</h2>
                <p className="text-sm text-gray-600">{ticketNumber}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Form Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-6">
              
              {/* Resolution Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes *
                </label>
                <textarea
                  {...register('resolution_description')}
                  rows={4}
                  className="input-field resize-none"
                  placeholder="Describe how the issue was resolved..."
                  disabled={isLoading}
                />
                {errors.resolution_description && (
                  <p className="mt-1 text-sm text-red-600">{errors.resolution_description.message}</p>
                )}
              </div>

              {/* Actual Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span>Actual Hours *</span>
                  </div>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  {...register('actual_hours')}
                  className="input-field"
                  placeholder="e.g., 2.5"
                  disabled={isLoading}
                  required
                />
                {errors.actual_hours && (
                  <p className="mt-1 text-sm text-red-600">{errors.actual_hours.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter the actual time spent resolving this ticket (required)
                </p>
              </div>

              {/* Maintenance Date Fields - Only for maintenance tickets */}
              {ticket?.support_type === 'maintenance' && ticket?.equipment && (
                <div className="border-t border-gray-100 pt-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span>Equipment Maintenance Dates (Optional)</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Override the automatic maintenance date calculation for {ticket.equipment.serial_number}
                    </p>
                  </div>

                  {/* Last Maintenance Date Override */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Maintenance Date (Override)
                    </label>
                    <input
                      type="date"
                      {...register('custom_maintenance_date')}
                      className="input-field"
                      disabled={isLoading}
                    />
                    {errors.custom_maintenance_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.custom_maintenance_date.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank to use today's date
                    </p>
                  </div>

                  {/* Next Maintenance Date Override */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next Maintenance Date (Override)
                    </label>
                    <input
                      type="date"
                      {...register('custom_next_maintenance_date')}
                      className="input-field"
                      disabled={isLoading}
                    />
                    {errors.custom_next_maintenance_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.custom_next_maintenance_date.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank to calculate automatically based on maintenance interval
                    </p>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || Object.keys(errors).length > 0}
                  className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Resolving...</span>
                    </span>
                  ) : (
                    'Resolve Ticket'
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