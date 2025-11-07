'use client';

import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, WrenchScrewdriverIcon, CheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import DebugLogger from '@/utils/DebugLogger';
import { useToast } from '@/components/providers/ToastProvider';

interface AssignEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clientId: string;
  clientName: string;
}

interface EquipmentInstance {
  id: number;
  serial_number: string;
  equipment_name: string;
  location: string;
  compliance_status: 'compliant' | 'expired' | 'overdue' | 'due_soon';
}

interface EquipmentType {
  equipment_name: string;
  instances: EquipmentInstance[];
}

interface AssignmentFormData {
  client_id: number;
  start_date: string;
  end_date: string;
  notes: string;
  selected_instance_ids: number[];
}

const AssignEquipmentModal: React.FC<AssignEquipmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientName
}) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<AssignmentFormData>({
    client_id: parseInt(clientId),
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
    selected_instance_ids: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Fetch available equipment instances
  const fetchAvailableEquipment = async () => {
    try {
      setIsLoading(true);
      const headers = getAuthHeaders();
      
      logApiCall('GET', API_ENDPOINTS.EQUIPMENT.LIST + '?status=available');
      const response = await fetch(API_ENDPOINTS.EQUIPMENT.LIST + '?status=available', { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch available equipment');
      }

      const result = await response.json();
      
      // Group instances by equipment type
      const grouped: { [key: string]: EquipmentInstance[] } = {};
      
      // Handle paginated response structure
      const equipmentList = result.data?.equipment || result.data || [];
      
      equipmentList.forEach((instance: EquipmentInstance) => {
        if (!grouped[instance.equipment_name]) {
          grouped[instance.equipment_name] = [];
        }
        grouped[instance.equipment_name].push(instance);
      });

      // Convert to array format
      const equipmentTypesArray = Object.entries(grouped).map(([equipment_name, instances]) => ({
        equipment_name,
        instances
      }));

      setEquipmentTypes(equipmentTypesArray);
      
      // Set first category as selected if available
      if (equipmentTypesArray.length > 0) {
        setSelectedCategory(equipmentTypesArray[0].equipment_name);
      }

    } catch (error) {
      console.error('Error fetching equipment:', error);
      showToast('error', 'Failed to load available equipment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        client_id: parseInt(clientId),
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: '',
        selected_instance_ids: []
      });
      setSelectedCategory('');
      fetchAvailableEquipment();
    }
  }, [isOpen, clientId]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInstanceSelection = (instanceId: number) => {
    setFormData(prev => ({
      ...prev,
      selected_instance_ids: prev.selected_instance_ids.includes(instanceId)
        ? prev.selected_instance_ids.filter(id => id !== instanceId)
        : [...prev.selected_instance_ids, instanceId]
    }));
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate required fields
    if (!formData.start_date) {
      showToast('error', 'Start date is required');
      return;
    }

    if (formData.selected_instance_ids.length === 0) {
      showToast('error', 'Please select at least one equipment instance to assign');
      return;
    }

    setIsSubmitting(true);

    try {
      const headers = getAuthHeaders();

      const payload = {
        client_id: formData.client_id,
        equipment_instances: formData.selected_instance_ids,
        assignment_date: formData.start_date,
        notes: formData.notes
      };

      console.log('Assigning equipment:', payload);

      // Create assignment endpoint
      logApiCall('POST', API_ENDPOINTS.EQUIPMENT.ASSIGN);
      const response = await fetch(API_ENDPOINTS.EQUIPMENT.ASSIGN, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to assign equipment');
      }

      showToast('success', `Equipment successfully assigned to ${clientName}!`);
      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Error assigning equipment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign equipment';
      showToast('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedCategoryData = equipmentTypes.find(type => type.equipment_name === selectedCategory);

  return (
    <div className="modal-container">
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="modal-content max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <WrenchScrewdriverIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Assign Equipment</h2>
                <p className="text-sm text-gray-600">Assign equipment to {clientName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
              {/* Assignment Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="start_date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      id="end_date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Any special instructions or notes for this assignment..."
                  />
                </div>
              </div>

              {/* Equipment Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Equipment</h3>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="ml-3 text-gray-600">Loading equipment...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Category Selection */}
                    {equipmentTypes.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Equipment Category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          {equipmentTypes.map(type => (
                            <option key={type.equipment_name} value={type.equipment_name}>
                              {type.equipment_name} ({type.instances.length} available)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Equipment Instances */}
                    {selectedCategoryData && selectedCategoryData.instances.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900">
                            {selectedCategory} - Select instances to assign
                          </h4>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {selectedCategoryData.instances.map((instance) => (
                            <div
                              key={instance.id}
                              className={`flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                                formData.selected_instance_ids.includes(instance.id) ? 'bg-red-50' : ''
                              }`}
                              onClick={() => handleInstanceSelection(instance.id)}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  formData.selected_instance_ids.includes(instance.id) 
                                    ? 'bg-red-600 border-red-600' 
                                    : 'border-gray-300'
                                }`}>
                                  {formData.selected_instance_ids.includes(instance.id) && (
                                    <CheckIcon className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">
                                      {instance.serial_number}
                                    </p>
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getComplianceStatusColor(instance.compliance_status)}`}>
                                      {instance.compliance_status.charAt(0).toUpperCase() + instance.compliance_status.slice(1).replace('_', ' ')}
                                    </span>
                                  </div>
                                  {instance.location && (
                                    <p className="text-sm text-gray-600">
                                      Location: {instance.location}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : selectedCategory ? (
                      <div className="text-center py-8 text-gray-500">
                        No available equipment instances found for {selectedCategory}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No equipment available for assignment
                      </div>
                    )}
                  </div>
                )}

                {/* Selection Summary */}
                {formData.selected_instance_ids.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <div className="flex">
                      <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm text-blue-800">
                          <strong>{formData.selected_instance_ids.length}</strong> equipment instance(s) selected for assignment to {clientName}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 p-6 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || formData.selected_instance_ids.length === 0}
                className="btn-primary flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <WrenchScrewdriverIcon className="h-4 w-4" />
                    <span>Assign Equipment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignEquipmentModal;