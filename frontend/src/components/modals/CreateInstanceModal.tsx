'use client';

import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, CubeIcon, InformationCircleIcon, CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import DebugLogger from '@/utils/DebugLogger';
import { useToast } from '@/components/providers/ToastProvider';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface CreateInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  equipmentId: string;
  equipmentName: string;
}

interface CreateInstanceData {
  equipment_id: number;
  serial_number: string;
  purchase_date: string;
  warranty_expiry?: string;
  location?: string;
  maintenance_interval_days?: number;
}

const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  equipmentId,
  equipmentName
}) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<CreateInstanceData>({
    equipment_id: parseInt(equipmentId),
    serial_number: '',
    purchase_date: new Date().toISOString().split('T')[0], // Default to today
    warranty_expiry: '',
    location: '',
    maintenance_interval_days: 365
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate serial number based on current date
  const generateSerialNumber = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SN-${dateStr}-${randomSuffix}`;
  };

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        equipment_id: parseInt(equipmentId),
        serial_number: generateSerialNumber()
      }));
    }
  }, [isOpen, equipmentId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maintenance_interval_days' ? 
        (value ? parseInt(value) : undefined) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.serial_number.trim()) {
        throw new Error('Serial number is required');
      }
      
      if (!formData.purchase_date) {
        throw new Error('Purchase date is required');
      }

      const headers = getAuthHeaders();

      // Prepare payload
      const payload = {
        ...formData,
        equipment_id: parseInt(equipmentId)
      };

      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key as keyof typeof payload] === undefined || payload[key as keyof typeof payload] === '') {
          delete payload[key as keyof typeof payload];
        }
      });

      console.log('Creating equipment instance:', payload);

      logApiCall('POST', API_ENDPOINTS.EQUIPMENT.CREATE);
      const response = await fetch(API_ENDPOINTS.EQUIPMENT.CREATE, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create equipment instance');
      }

      showToast('success', 'Equipment instance created successfully!');
      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Error creating equipment instance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create equipment instance';
      showToast('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-container">
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="modal-content"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <CubeIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create Equipment Instance</h2>
                <p className="text-sm text-gray-600">Create a new instance of {equipmentName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Form Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              
              {/* Basic Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <CubeIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                </div>
                
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Serial Number */}
                  <div>
                    <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 mb-2">
                      Serial Number *
                    </label>
                    <input
                      type="text"
                      id="serial_number"
                      name="serial_number"
                      value={formData.serial_number}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter serial number"
                      required
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="e.g., Warehouse A1"
                    />
                  </div>
                </div>
              </div>

              {/* Date Information Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Date Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Purchase Date */}
                  <div>
                    <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      id="purchase_date"
                      name="purchase_date"
                      value={formData.purchase_date}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    />
                  </div>

                  {/* Warranty Expiry */}
                  <div>
                    <label htmlFor="warranty_expiry" className="block text-sm font-medium text-gray-700 mb-2">
                      Warranty Expiry
                    </label>
                    <input
                      type="date"
                      id="warranty_expiry"
                      name="warranty_expiry"
                      value={formData.warranty_expiry}
                      onChange={handleInputChange}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Maintenance Settings Section */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <InformationCircleIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Maintenance Settings</h3>
                </div>
                
                <div>
                  <label htmlFor="maintenance_interval_days" className="block text-sm font-medium text-gray-700 mb-2">
                    Maintenance Interval (Days)
                  </label>
                  <input
                    type="number"
                    id="maintenance_interval_days"
                    name="maintenance_interval_days"
                    value={formData.maintenance_interval_days}
                    onChange={handleInputChange}
                    min="1"
                    max="3650"
                    className="input-field"
                    placeholder="365"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Default is 365 days (1 year)
                  </p>
                </div>
              </div>

              {/* Info Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> The system will automatically calculate expiry dates and next maintenance dates based on the information provided.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Creating...</span>
                    </span>
                  ) : (
                    'Create Instance'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInstanceModal;