'use client'

import React, { useState } from 'react'
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline'
import { useToast } from '../providers/ToastProvider'
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api'

interface ClientFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  company_name: string
  business_type: string
  primary_phone: string
  street_address: string
  city: string
  zip_code: string
  country: string
}

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onClientCreated: () => void
}

const isValidSriLankanPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+94|0)[1-9]\d{8}$/
  return phoneRegex.test(phone)
}

export default function AddClientModal({ isOpen, onClose, onClientCreated }: AddClientModalProps) {
  const { showToast, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ClientFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    business_type: '',
    primary_phone: '',
    street_address: '',
    city: '',
    zip_code: '',
    country: 'Sri Lanka'
  })

  const [errors, setErrors] = useState<Partial<ClientFormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<ClientFormData> = {}

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required'
    }

    if (!formData.business_type.trim()) {
      newErrors.business_type = 'Business type is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Personal phone is required'
    } else if (!isValidSriLankanPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid Sri Lankan phone number'
    }

    if (!formData.primary_phone.trim()) {
      newErrors.primary_phone = 'Primary phone is required'
    } else if (!isValidSriLankanPhone(formData.primary_phone)) {
      newErrors.primary_phone = 'Please enter a valid Sri Lankan phone number'
    }

    if (!formData.street_address.trim()) {
      newErrors.street_address = 'Street address is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!formData.zip_code.trim()) {
      newErrors.zip_code = 'ZIP code is required'
    } else if (formData.zip_code.length < 3 || formData.zip_code.length > 10) {
      newErrors.zip_code = 'ZIP code must be between 3-10 characters'
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Country is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const headers = getAuthHeaders()
      const response = await fetch(API_ENDPOINTS.CLIENTS.CREATE, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle authentication errors
        if (response.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login?expired=true'
          return
        }
        
        throw new Error(errorData.message || 'Failed to create client')
      }

      const data = await response.json()
      
      if (data.success) {
        showToast('success', 'Client created successfully!')
        handleClose()
        onClientCreated()
      } else {
        throw new Error(data.message || 'Failed to create client')
      }
    } catch (err) {
      console.error('Error creating client:', err)
      error(err instanceof Error ? err.message : 'Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      business_type: '',
      primary_phone: '',
      street_address: '',
      city: '',
      zip_code: '',
      country: 'Sri Lanka'
    })
    setErrors({})
    onClose()
  }

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-container">
      <div className="modal-backdrop" onClick={handleClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="modal-content max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <UserIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New Client</h2>
                <p className="text-sm text-gray-600">Enter client details and company information</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className={`input-field ${errors.first_name ? 'border-red-500' : ''}`}
                      placeholder="Enter first name"
                    />
                    {errors.first_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className={`input-field ${errors.last_name ? 'border-red-500' : ''}`}
                      placeholder="Enter last name"
                    />
                    {errors.last_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="Enter email address"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Password Info */}
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Temporary Password</p>
                      <p>A secure temporary password will be automatically generated and sent to the client's email address. They will be required to change it on first login.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className={`input-field ${errors.company_name ? 'border-red-500' : ''}`}
                      placeholder="Enter company name"
                    />
                    {errors.company_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.company_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="business_type" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type *
                    </label>
                    <select
                      id="business_type"
                      value={formData.business_type}
                      onChange={(e) => handleInputChange('business_type', e.target.value)}
                      className={`input-field ${errors.business_type ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select business type</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Office Building">Office Building</option>
                      <option value="Retail Store">Retail Store</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Education">Education</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.business_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.business_type}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Personal Phone *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
                      placeholder="e.g., 0771234567 or +94771234567"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="primary_phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Phone *
                    </label>
                    <input
                      type="tel"
                      id="primary_phone"
                      value={formData.primary_phone}
                      onChange={(e) => handleInputChange('primary_phone', e.target.value)}
                      className={`input-field ${errors.primary_phone ? 'border-red-500' : ''}`}
                      placeholder="e.g., 0771234567 or +94771234567"
                    />
                    {errors.primary_phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.primary_phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="street_address" className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      id="street_address"
                      value={formData.street_address}
                      onChange={(e) => handleInputChange('street_address', e.target.value)}
                      className={`input-field ${errors.street_address ? 'border-red-500' : ''}`}
                      placeholder="Enter street address"
                    />
                    {errors.street_address && (
                      <p className="mt-1 text-sm text-red-600">{errors.street_address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={`input-field ${errors.city ? 'border-red-500' : ''}`}
                        placeholder="Enter city"
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) => handleInputChange('zip_code', e.target.value)}
                        className={`input-field ${errors.zip_code ? 'border-red-500' : ''}`}
                        placeholder="Enter ZIP code"
                      />
                      {errors.zip_code && (
                        <p className="mt-1 text-sm text-red-600">{errors.zip_code}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                        Country *
                      </label>
                      <select
                        id="country"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className={`input-field ${errors.country ? 'border-red-500' : ''}`}
                      >
                        <option value="Sri Lanka">Sri Lanka</option>
                        <option value="India">India</option>
                        <option value="Bangladesh">Bangladesh</option>
                        <option value="Maldives">Maldives</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.country && (
                        <p className="mt-1 text-sm text-red-600">{errors.country}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Client'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}