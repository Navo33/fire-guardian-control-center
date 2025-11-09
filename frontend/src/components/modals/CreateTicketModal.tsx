'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '../../config/api';
import { useToast } from '../providers/ToastProvider';
import { handleApiError } from '../../utils/toastUtils';
import DebugLogger from '../../utils/DebugLogger';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  UserIcon,
  Cog6ToothIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

// Ticket form validation schema
const ticketSchema = z.object({
  support_type: z.enum(['maintenance', 'system', 'user'], {
    required_error: 'Support type is required'
  }),
  priority: z.enum(['low', 'normal', 'high'], {
    required_error: 'Priority is required'
  }),
  client_id: z.number().min(1, 'Client is required'),
  equipment_instance_id: z.number().optional(),
  issue_description: z.string()
    .min(10, 'Issue description must be at least 10 characters')
    .max(1000, 'Issue description cannot exceed 1000 characters'),
  scheduled_date: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface DropdownOption {
  id: number;
  name?: string;
  company_name?: string;
  display_name?: string;
  serial_number?: string;
  equipment_name?: string;
  location?: string;
  compliance_status?: string;
}

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userType?: 'vendor' | 'client'; // For future client usage
}

export default function CreateTicketModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  userType = 'vendor'
}: CreateTicketModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dropdown data
  const [clients, setClients] = useState<DropdownOption[]>([]);
  const [equipment, setEquipment] = useState<DropdownOption[]>([]);
  
  // Loading states
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: 'normal',
      support_type: 'maintenance',
    },
  });

  const watchSupportType = watch('support_type');
  const watchClientId = watch('client_id');

  // Support type options
  const supportTypes = [
    { value: 'maintenance', label: 'Maintenance', icon: Cog6ToothIcon },
    { value: 'system', label: 'System', icon: ClipboardDocumentListIcon },
    { value: 'user', label: 'User Support', icon: UserIcon },
  ];

  // Priority options
  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'normal', label: 'Normal', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-red-600' },
  ];

  // Fetch clients when modal opens
  useEffect(() => {
    if (isOpen && userType === 'vendor') {
      fetchClients();
    }
  }, [isOpen, userType]);

  // Fetch equipment when client changes and support type is maintenance
  useEffect(() => {
    if (watchClientId && !isNaN(watchClientId) && watchSupportType === 'maintenance') {
      fetchEquipmentForClient(watchClientId);
    } else {
      setEquipment([]);
      setValue('equipment_instance_id', undefined);
    }
  }, [watchClientId, watchSupportType, setValue]);

  // Fetch clients dropdown
  const fetchClients = async () => {
    const startTime = DebugLogger.startTimer();
    DebugLogger.ui('CreateTicketModal', 'fetchClients started');
    
    try {
      setIsLoadingClients(true);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = getAuthHeaders();
      const url = `${API_ENDPOINTS.MAINTENANCE_TICKETS.BASE}/clients`;

      logApiCall('GET', url);
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      DebugLogger.api('GET', url, undefined, result, response.status);

      if (result.success) {
        setClients(result.data);
        DebugLogger.log('Clients loaded successfully', { count: result.data.length }, 'CREATE_TICKET_MODAL');
      } else {
        throw new Error(result.message || 'Failed to load clients');
      }

      DebugLogger.performance('Clients fetch', startTime);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load clients';
      DebugLogger.error('Clients fetch failed', err, { errorMessage });
      showToast('error', errorMessage);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Fetch technicians dropdown


  // Fetch equipment for selected client
  const fetchEquipmentForClient = async (clientId: number) => {
    // Validate clientId
    if (!clientId || isNaN(clientId) || clientId <= 0) {
      setEquipment([]);
      return;
    }

    try {
      setIsLoadingEquipment(true);

      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = getAuthHeaders();
      const url = `${API_ENDPOINTS.MAINTENANCE_TICKETS.BASE}/equipment/${clientId}`;

      logApiCall('GET', url);
      const response = await fetch(url, { headers });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEquipment(result.data);
        }
      }
    } catch (err) {
      DebugLogger.error('Equipment fetch failed', err);
      showToast('error', 'Failed to load equipment for selected client');
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setClients([]);
    setEquipment([]);
    onClose();
  };

  const onFormSubmit = async (data: TicketFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Prepare request body (assigned_technician is auto-assigned on backend)
      const requestBody = {
        support_type: data.support_type,
        priority: data.priority,
        client_id: data.client_id,
        issue_description: data.issue_description,
        ...(data.equipment_instance_id && { equipment_instance_id: data.equipment_instance_id }),
        ...(data.scheduled_date && { scheduled_date: data.scheduled_date }),
      };

      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      };

      logApiCall('POST', API_ENDPOINTS.MAINTENANCE_TICKETS.BASE, requestBody);
      const response = await fetch(API_ENDPOINTS.MAINTENANCE_TICKETS.BASE, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create ticket');
      }

      const result = await response.json();
      DebugLogger.api('POST', API_ENDPOINTS.MAINTENANCE_TICKETS.BASE, requestBody, result, response.status);

      showToast('success', `Ticket ${result.data.ticket_number} created successfully`);
      reset();
      handleClose();
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create ticket';
      DebugLogger.error('Create ticket failed', err, { errorMessage });
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-container">
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="modal-content w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <ClipboardDocumentListIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create New Ticket</h2>
                <p className="text-sm text-gray-600">Submit a new maintenance or support request</p>
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
            <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-6">
              
              {/* Support Type and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Type *
                  </label>
                  <select
                    {...register('support_type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {supportTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.support_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.support_type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority *
                  </label>
                  <select
                    {...register('priority')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                  )}
                </div>
              </div>

              {/* Client Selection */}
              {userType === 'vendor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client *
                  </label>
                  <select
                    {...register('client_id', { 
                      setValueAs: (value) => value === '' ? undefined : Number(value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    disabled={isLoadingClients}
                  >
                    <option value="">Select a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                  {isLoadingClients && <LoadingSpinner size="sm" />}
                  {errors.client_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>
                  )}
                </div>
              )}

              {/* Equipment Selection (only for maintenance) */}
              {watchSupportType === 'maintenance' && watchClientId && !isNaN(watchClientId) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipment (Optional)
                  </label>
                  <select
                    {...register('equipment_instance_id', { 
                      setValueAs: (value) => value === '' ? undefined : Number(value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    disabled={isLoadingEquipment}
                  >
                    <option value="">Select equipment...</option>
                    {equipment.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.serial_number} - {item.equipment_name} 
                        {item.location && ` (${item.location})`}
                      </option>
                    ))}
                  </select>
                  {isLoadingEquipment && <LoadingSpinner size="sm" />}
                  {errors.equipment_instance_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.equipment_instance_id.message}</p>
                  )}
                </div>
              )}

              {/* Issue Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Description *
                </label>
                <textarea
                  {...register('issue_description')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Describe the issue or support request in detail..."
                />
                {errors.issue_description && (
                  <p className="mt-1 text-sm text-red-600">{errors.issue_description.message}</p>
                )}
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date (Optional)
                  </label>
                  <input
                    type="date"
                    {...register('scheduled_date')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.scheduled_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.scheduled_date.message}</p>
                  )}
                </div>

                {userType === 'vendor' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Technician
                    </label>
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                      Auto-assigned to you
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      The ticket will be automatically assigned to your account
                    </p>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Creating...</span>
                    </>
                  ) : (
                    'Create Ticket'
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