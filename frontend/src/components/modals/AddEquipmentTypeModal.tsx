'use client';

import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, CubeIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import DebugLogger from '@/utils/DebugLogger';
import { useToast } from '@/components/providers/ToastProvider';

interface AddEquipmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EquipmentTypeFormData {
  equipment_code: string;
  equipment_name: string;
  description: string;
  equipment_type: string;
  manufacturer: string;
  model: string;
  specifications: string;
  weight_kg: number | null;
  dimensions: string;
  warranty_years: number | null;
  default_lifespan_years: number | null;
}

const EQUIPMENT_TYPES = [
  { value: 'lighting', label: 'Emergency Lighting' },
  { value: 'extinguisher', label: 'Fire Extinguisher' },
  { value: 'alarm', label: 'Fire Alarm System' },
  { value: 'sprinkler', label: 'Sprinkler System' },
  { value: 'detector', label: 'Smoke/Heat Detector' },
  { value: 'door', label: 'Fire Door' },
  { value: 'hose', label: 'Fire Hose' },
  { value: 'panel', label: 'Control Panel' },
  { value: 'other', label: 'Other Equipment' }
];

const AddEquipmentTypeModal: React.FC<AddEquipmentTypeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<EquipmentTypeFormData>({
    equipment_code: '',
    equipment_name: '',
    description: '',
    equipment_type: '',
    manufacturer: '',
    model: '',
    specifications: '{}',
    weight_kg: null,
    dimensions: '',
    warranty_years: null,
    default_lifespan_years: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [specificationsJson, setSpecificationsJson] = useState('{}');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        equipment_code: '',
        equipment_name: '',
        description: '',
        equipment_type: '',
        manufacturer: '',
        model: '',
        specifications: '{}',
        weight_kg: null,
        dimensions: '',
        warranty_years: null,
        default_lifespan_years: null
      });
      setSpecificationsJson('{}');
      setErrors({});
      setIsSubmitting(false);
      
      // Focus first input after modal animation
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields
    if (['weight_kg', 'warranty_years', 'default_lifespan_years'].includes(name)) {
      const numValue = value === '' ? null : parseFloat(value);
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSpecificationsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSpecificationsJson(value);
    
    // Try to parse JSON to validate
    try {
      JSON.parse(value);
      setFormData(prev => ({
        ...prev,
        specifications: value
      }));
      // Clear error if JSON is valid
      setErrors(prev => ({
        ...prev,
        specifications: ''
      }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        specifications: 'Invalid JSON format'
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.equipment_code.trim()) {
      newErrors.equipment_code = 'Equipment code is required';
    }
    if (!formData.equipment_name.trim()) {
      newErrors.equipment_name = 'Equipment name is required';
    }
    if (!formData.equipment_type) {
      newErrors.equipment_type = 'Equipment type is required';
    }
    if (!formData.manufacturer.trim()) {
      newErrors.manufacturer = 'Manufacturer is required';
    }
    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    // Validate specifications JSON
    try {
      JSON.parse(specificationsJson);
    } catch (error) {
      newErrors.specifications = 'Specifications must be valid JSON';
    }

    // Numeric validations
    if (formData.weight_kg !== null && formData.weight_kg <= 0) {
      newErrors.weight_kg = 'Weight must be greater than 0';
    }
    if (formData.warranty_years !== null && formData.warranty_years < 0) {
      newErrors.warranty_years = 'Warranty years cannot be negative';
    }
    if (formData.default_lifespan_years !== null && formData.default_lifespan_years <= 0) {
      newErrors.default_lifespan_years = 'Default lifespan must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const headers = getAuthHeaders();
      DebugLogger.log('Adding new equipment type', formData, 'ADD_EQUIPMENT_TYPE');

      const payload = {
        ...formData,
        specifications: JSON.parse(specificationsJson)
      };

      logApiCall('POST', API_ENDPOINTS.EQUIPMENT.CREATE_TYPE);
      const response = await fetch(API_ENDPOINTS.EQUIPMENT.CREATE_TYPE, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create equipment type');
      }

      showToast('success', 'Equipment type created successfully!');
      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Error creating equipment type:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create equipment type';
      showToast('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        
        {/* Modal */}
        <div 
          ref={modalRef}
          className="relative w-full max-w-2xl transform rounded-2xl bg-white shadow-xl transition-all"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <CubeIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Equipment Type
                </h3>
                <p className="text-sm text-gray-500">
                  Create a new equipment type for fire safety equipment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Equipment Code & Name */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="equipment_code" className="block text-sm font-medium text-gray-700 mb-2">
                    Equipment Code *
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    id="equipment_code"
                    name="equipment_code"
                    value={formData.equipment_code}
                    onChange={handleInputChange}
                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      errors.equipment_code 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-red-500 focus:ring-red-200'
                    }`}
                    placeholder="e.g., LGT-EM-01"
                  />
                  {errors.equipment_code && (
                    <p className="mt-1 text-sm text-red-600">{errors.equipment_code}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="equipment_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Equipment Name *
                  </label>
                  <input
                    type="text"
                    id="equipment_name"
                    name="equipment_name"
                    value={formData.equipment_name}
                    onChange={handleInputChange}
                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      errors.equipment_name 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-red-500 focus:ring-red-200'
                    }`}
                    placeholder="e.g., Emergency Light Standard"
                  />
                  {errors.equipment_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.equipment_name}</p>
                  )}
                </div>
              </div>

              {/* Equipment Type */}
              <div>
                <label htmlFor="equipment_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment Type *
                </label>
                <select
                  id="equipment_type"
                  name="equipment_type"
                  value={formData.equipment_type}
                  onChange={handleInputChange}
                  className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                    errors.equipment_type 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-red-500 focus:ring-red-200'
                  }`}
                >
                  <option value="">Select equipment type</option>
                  {EQUIPMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.equipment_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.equipment_type}</p>
                )}
              </div>

              {/* Manufacturer & Model */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700 mb-2">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    id="manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      errors.manufacturer 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-red-500 focus:ring-red-200'
                    }`}
                    placeholder="e.g., ProGuard"
                  />
                  {errors.manufacturer && (
                    <p className="mt-1 text-sm text-red-600">{errors.manufacturer}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                    Model *
                  </label>
                  <input
                    type="text"
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      errors.model 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-red-500 focus:ring-red-200'
                    }`}
                    placeholder="e.g., EM-01"
                  />
                  {errors.model && (
                    <p className="mt-1 text-sm text-red-600">{errors.model}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors"
                  placeholder="Brief description of the equipment..."
                />
              </div>

              {/* Physical Properties */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <label htmlFor="weight_kg" className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="weight_kg"
                    name="weight_kg"
                    value={formData.weight_kg ?? ''}
                    onChange={handleInputChange}
                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      errors.weight_kg 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-red-500 focus:ring-red-200'
                    }`}
                    placeholder="1.50"
                  />
                  {errors.weight_kg && (
                    <p className="mt-1 text-sm text-red-600">{errors.weight_kg}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    id="dimensions"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors"
                    placeholder="120x80mm"
                  />
                </div>

                <div>
                  <label htmlFor="warranty_years" className="block text-sm font-medium text-gray-700 mb-2">
                    Warranty (years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    id="warranty_years"
                    name="warranty_years"
                    value={formData.warranty_years ?? ''}
                    onChange={handleInputChange}
                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      errors.warranty_years 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-red-500 focus:ring-red-200'
                    }`}
                    placeholder="2"
                  />
                  {errors.warranty_years && (
                    <p className="mt-1 text-sm text-red-600">{errors.warranty_years}</p>
                  )}
                </div>
              </div>

              {/* Default Lifespan */}
              <div>
                <label htmlFor="default_lifespan_years" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Lifespan (years)
                </label>
                <input
                  type="number"
                  min="1"
                  id="default_lifespan_years"
                  name="default_lifespan_years"
                  value={formData.default_lifespan_years ?? ''}
                  onChange={handleInputChange}
                  className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                    errors.default_lifespan_years 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-red-500 focus:ring-red-200'
                  }`}
                  placeholder="5"
                />
                {errors.default_lifespan_years && (
                  <p className="mt-1 text-sm text-red-600">{errors.default_lifespan_years}</p>
                )}
              </div>

              {/* Specifications */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <label htmlFor="specifications" className="block text-sm font-medium text-gray-700">
                    Technical Specifications (JSON)
                  </label>
                  <div className="group relative">
                    <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg whitespace-nowrap z-10">
                      Example: {"{"}"lumens": 300, "backup_hours": 3{"}"}
                    </div>
                  </div>
                </div>
                <textarea
                  id="specifications"
                  name="specifications"
                  rows={4}
                  value={specificationsJson}
                  onChange={handleSpecificationsChange}
                  className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors font-mono ${
                    errors.specifications 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-red-500 focus:ring-red-200'
                  }`}
                  placeholder='{"lumens": 300, "backup_hours": 3}'
                />
                {errors.specifications && (
                  <p className="mt-1 text-sm text-red-600">{errors.specifications}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Equipment Type'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEquipmentTypeModal;