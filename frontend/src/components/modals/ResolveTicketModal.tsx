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
  actual_hours: z.coerce.number()
    .min(0.1, 'Hours must be at least 0.1')
    .max(100, 'Hours cannot exceed 100')
    .optional(),
});

type ResolveFormData = z.infer<typeof resolveSchema>;

interface ResolveTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ticketNumber: string;
  ticketId: string; // For API call (could be numeric ID or ticket number)
}

export default function ResolveTicketModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  ticketNumber,
  ticketId
}: ResolveTicketModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(resolveSchema),
    defaultValues: {
      resolution_description: '',
      actual_hours: undefined,
    },
  });

  const onFormSubmit = async (data: any) => {
    setIsLoading(true);
    
    try {
      const requestBody = {
        resolution_description: data.resolution_description,
        ...(data.actual_hours && { actual_hours: data.actual_hours }),
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
      reset();
      onSuccess();
      onClose();
      
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md transform rounded-2xl bg-white shadow-2xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Resolve Ticket</h3>
                <p className="text-sm text-gray-600">{ticketNumber}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit(onFormSubmit)} className="p-6">
            <div className="space-y-4">
              
              {/* Resolution Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes *
                </label>
                <textarea
                  {...register('resolution_description')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
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
                    <span>Actual Hours (Optional)</span>
                  </div>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register('actual_hours')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., 2.5"
                  disabled={isLoading}
                />
                {errors.actual_hours && (
                  <p className="mt-1 text-sm text-red-600">{errors.actual_hours.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter the actual time spent resolving this ticket
                </p>
              </div>

            </div>

            {/* Actions */}
            <div className="mt-8 flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Resolving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="mr-2 h-4 w-4" />
                    Resolve Ticket
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}