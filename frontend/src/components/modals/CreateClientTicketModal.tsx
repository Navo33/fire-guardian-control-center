'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { API_BASE_URL } from '../../config/api';
import { useToast } from '../providers/ToastProvider';
import DebugLogger from '../../utils/DebugLogger';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  FireIcon
} from '@heroicons/react/24/outline';

// Client ticket form validation schema (simplified for clients)
const clientTicketSchema = z.object({
  priority: z.enum(['low', 'normal', 'high'], {
    message: 'Priority is required'
  }),
  equipment_serial_number: z.string().min(1, 'Equipment is required'),
  issue_description: z.string()
    .min(10, 'Issue description must be at least 10 characters')
    .max(1000, 'Issue description cannot exceed 1000 characters'),
});

type ClientTicketFormData = z.infer<typeof clientTicketSchema>;

interface ClientEquipment {
  serial_number: string;
  equipment_name: string;
  equipment_type: string;
  location: string;
  compliance_status: string;
  next_maintenance_date?: string;
}

interface CreateClientTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateClientTicketModal({ 
  isOpen, 
  onClose, 
  onSuccess
}: CreateClientTicketModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Client equipment data
  const [equipment, setEquipment] = useState<ClientEquipment[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClientTicketFormData>({
    resolver: zodResolver(clientTicketSchema),
    defaultValues: {
      priority: 'normal',
    },
  });

  // Priority options
  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'normal', label: 'Normal', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-red-600' },
  ];

  // Fetch client equipment when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClientEquipment();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setError(null);
    }
  }, [isOpen, reset]);

  // Fetch client's assigned equipment
  const fetchClientEquipment = async () => {
    const startTime = DebugLogger.startTimer();
    DebugLogger.ui('CreateClientTicketModal', 'fetchClientEquipment started');
    
    try {
      setIsLoadingEquipment(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${API_BASE_URL}/client-views/equipment`, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch equipment: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      DebugLogger.api('GET', '/client-views/equipment', undefined, result, response.status);

      if (result.success) {
        // Extract items array from paginated response
        const equipmentData = result.data?.items || [];
        console.log('Equipment API Response:', result);
        console.log('Equipment Data:', equipmentData);
        setEquipment(equipmentData);
        DebugLogger.log('Client equipment loaded successfully', { count: equipmentData.length }, 'CREATE_CLIENT_TICKET_MODAL');
      } else {
        throw new Error(result.message || 'Failed to load equipment');
      }

      DebugLogger.performance('Client equipment fetch', startTime);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load equipment';
      DebugLogger.error('Client equipment fetch failed', err, { errorMessage });
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  // Submit ticket
  const onSubmit = async (data: ClientTicketFormData) => {
    const startTime = DebugLogger.startTimer();
    DebugLogger.ui('CreateClientTicketModal', 'onSubmit started', data);
    
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Client tickets are always maintenance type since they're about equipment
      const ticketData = {
        ...data,
        support_type: 'maintenance',
        // Send serial number to backend, it will convert to equipment_instance_id
        equipment_serial_number: data.equipment_serial_number
      };

      const response = await fetch(`${API_BASE_URL}/client-views/service-requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(ticketData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create ticket: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      DebugLogger.api('POST', '/client-views/service-requests', ticketData, result, response.status);

      if (result.success) {
        DebugLogger.log('Client ticket created successfully', { ticketId: result.data?.id }, 'CREATE_CLIENT_TICKET_MODAL');
        showToast('success', 'Service request created successfully! Your vendor will be notified.');
        
        // Reset form and close modal
        reset();
        onClose();
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(result.message || 'Failed to create ticket');
      }

      DebugLogger.performance('Client ticket creation', startTime);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create service request';
      DebugLogger.error('Client ticket creation failed', err, { errorMessage });
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-container">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="modal-content max-w-2xl w-full">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create Service Request</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Request maintenance or support for your equipment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Equipment Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FireIcon className="w-4 h-4 inline mr-2 text-red-600" />
                    Select Equipment *
                  </label>
                  {isLoadingEquipment ? (
                      <div className="flex items-center justify-center py-4">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2 text-sm text-gray-600">Loading your equipment...</span>
                      </div>
                    ) : equipment.length === 0 ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
                        <FireIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No equipment assigned to your account</p>
                        <p className="text-xs text-gray-500 mt-1">Please contact your vendor if this is incorrect</p>
                      </div>
                    ) : (
                      <select
                        {...register('equipment_serial_number')}
                        className={`input-field ${errors.equipment_serial_number ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select equipment...</option>
                        {Array.isArray(equipment) && equipment.map((item, index) => (
                          <option key={`${item.serial_number}-${index}`} value={item.serial_number}>
                            {item.equipment_name} ({item.serial_number})
                            {item.location && item.location !== 'N/A' && ` - ${item.location}`}
                            {item.compliance_status !== 'compliant' && ` - ${item.compliance_status.toUpperCase()}`}
                          </option>
                        ))}
                      </select>
                    )}
                  {errors.equipment_serial_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.equipment_serial_number.message}</p>
                  )}
                </div>

                {/* Priority Selection */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">Priority Level</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority *
                    </label>
                    <select
                      {...register('priority')}
                      className={`input-field ${errors.priority ? 'border-red-500' : ''}`}
                    >
                      {priorities.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                  )}
                </div>

                {/* Issue Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Cog6ToothIcon className="w-4 h-4 inline mr-2 text-blue-600" />
                    Issue Description *
                  </label>
                    <textarea
                      {...register('issue_description')}
                      rows={4}
                      className={`input-field ${errors.issue_description ? 'border-red-500' : ''}`}
                      placeholder="Please describe the issue in detail. Include any symptoms, error messages, or concerns you've noticed..."
                    />
                    {errors.issue_description && (
                      <p className="mt-1 text-sm text-red-600">{errors.issue_description.message}</p>
                    )}
                  <p className="mt-1 text-xs text-gray-500">
                    Be as specific as possible to help your vendor understand and resolve the issue quickly.
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit(onSubmit)}
                className="btn-primary"
                disabled={isLoading || !Array.isArray(equipment) || equipment.length === 0}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Creating Request...</span>
                  </>
                ) : (
                  <>
                    <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
                    Create Service Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}