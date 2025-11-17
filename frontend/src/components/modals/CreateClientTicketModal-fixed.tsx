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
  equipment_instance_id: z.number().min(1, 'Equipment is required'),
  issue_description: z.string()
    .min(10, 'Issue description must be at least 10 characters')
    .max(1000, 'Issue description cannot exceed 1000 characters'),
});

type ClientTicketFormData = z.infer<typeof clientTicketSchema>;

interface ClientEquipment {
  id: number;
  serial_number: string;
  equipment_name: string;
  location?: string;
  compliance_status: string;
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
    { value: 'low', label: 'Low Priority', color: 'text-green-600', description: 'Non-urgent maintenance' },
    { value: 'normal', label: 'Normal Priority', color: 'text-yellow-600', description: 'Standard maintenance' },
    { value: 'high', label: 'High Priority', color: 'text-red-600', description: 'Urgent attention needed' },
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
        const equipmentData = Array.isArray(result.data) ? result.data : [];
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
        support_type: 'maintenance'
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

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Equipment Selection Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <FireIcon className="h-5 w-5 text-red-600" />
                    <h3 className="text-lg font-medium text-gray-900">Equipment Selection</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        {...register('equipment_instance_id', { valueAsNumber: true })}
                        className={`input-field ${errors.equipment_instance_id ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select equipment...</option>
                        {Array.isArray(equipment) && equipment.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.equipment_name} ({item.serial_number})
                            {item.location && ` - ${item.location}`}
                            {item.compliance_status !== 'compliant' && ` - ${item.compliance_status.toUpperCase()}`}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.equipment_instance_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.equipment_instance_id.message}</p>
                    )}
                  </div>
                </div>

                {/* Priority Selection Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-medium text-gray-900">Priority Level</h3>
                  </div>
                  <div className="space-y-2">
                    {priorities.map((priority) => (
                      <label
                        key={priority.value}
                        className="flex items-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          {...register('priority')}
                          value={priority.value}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${priority.color}`}>
                              {priority.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{priority.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                  )}
                </div>

                {/* Issue Description Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Cog6ToothIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900">Issue Description</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Describe the Issue *
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