'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import DashboardLayout from '@/components/layout/DashboardLayout'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorDisplay from '@/components/ui/ErrorDisplay'
import AddClientModal from '@/components/modals/AddClientModal'
import { useToast } from '@/components/providers/ToastProvider'
import { API_ENDPOINTS, buildApiUrl } from '@/config/api'

interface ClientKPIs {
  totalClients: number
  activeClients: number
  averageCompliance: number
}

interface Client {
  id: number
  company_name: string
  business_type: string
  contact_name: string
  email: string
  phone: string
  primary_phone: string
  address: string
  street_address: string
  city: string
  state: string
  zip_code: string
  country: string
  status: 'active' | 'inactive' | 'pending'
  is_active: boolean
  created_at: string
  equipment_count?: number
  last_service_date?: string
  compliance_status?: string
}

interface VendorInfo {
  id: number
  company_name: string
  user: {
    display_name: string
    avatar_url?: string
    first_name: string
    last_name: string
  }
}

interface ClientListResponse {
  clients: Client[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
  }
}

export default function ClientsPage() {
  const router = useRouter()
  const { success: showToast } = useToast()
  
  // Debug API_ENDPOINTS
  useEffect(() => {
    console.log('Full API_ENDPOINTS object:', API_ENDPOINTS)
    console.log('API_ENDPOINTS keys:', Object.keys(API_ENDPOINTS))
    console.log('API_ENDPOINTS.CLIENTS:', API_ENDPOINTS.CLIENTS)
    if (API_ENDPOINTS.CLIENTS) {
      console.log('CLIENTS keys:', Object.keys(API_ENDPOINTS.CLIENTS))
    }
  }, [])
  
  // State management
  const [kpis, setKpis] = useState<ClientKPIs | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  })
  
  // Modal and form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'company_name' | 'created_at' | 'last_service_date'>('company_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Fetch vendor information
  const fetchVendorInfo = async () => {
    try {
      // Get user info from localStorage for now
      const userInfo = localStorage.getItem('user')
      if (userInfo) {
        const user = JSON.parse(userInfo)
        setVendorInfo({
          id: user.vendor_id || 1,
          company_name: user.company_name || 'Fire Safety Solutions',
          user: {
            display_name: user.display_name || `${user.first_name || 'Vendor'} ${user.last_name || 'User'}`,
            avatar_url: user.avatar_url,
            first_name: user.first_name || 'Vendor',
            last_name: user.last_name || 'User'
          }
        })
      }
    } catch (err) {
      console.error('Error fetching vendor info:', err)
      // Set default vendor info
      setVendorInfo({
        id: 1,
        company_name: 'Fire Safety Solutions',
        user: {
          display_name: 'Vendor User',
          first_name: 'Vendor',
          last_name: 'User'
        }
      })
    }
  }

  // Fetch KPIs
  const fetchKPIs = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token found')

      // Use API_ENDPOINTS with fallback
      const url = API_ENDPOINTS.CLIENTS?.KPIS || 'http://localhost:5000/api/vendor/clients/kpis'
      console.log('Fetching KPIs from:', url)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch KPIs: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setKpis(data.data)
      } else {
        throw new Error(data.message || 'Failed to fetch KPIs')
      }
    } catch (err) {
      console.error('Error fetching KPIs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch KPIs')
    }
  }

  // Fetch clients list
  const fetchClients = async (page = 1) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token found')

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: searchTerm,
        status: statusFilter,
        sortBy,
        sortOrder
      })

      const response = await fetch(`${API_ENDPOINTS.CLIENTS?.LIST || 'http://localhost:5000/api/vendor/clients'}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.statusText}`)
      }

      const data: ClientListResponse = await response.json()
      if (data) {
        setClients(data.clients || [])
        setPagination(data.pagination || pagination)
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch clients')
    }
  }

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        await Promise.all([fetchVendorInfo(), fetchKPIs(), fetchClients()])
      } catch (err) {
        console.error('Error loading client data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [searchTerm, statusFilter, sortBy, sortOrder])

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
    fetchClients(page)
  }

  // Handle client creation
  const handleClientCreated = () => {
    setIsAddModalOpen(false)
    showToast('Client created successfully')
    fetchKPIs() // Refresh KPIs
    fetchClients(pagination.currentPage) // Refresh current page
  }

  // Handle row click
  const handleClientClick = (clientId: number) => {
    router.push(`/clients/${clientId}`)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get compliance status color
  const getComplianceColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
        return 'text-green-600 bg-green-50'
      case 'partial':
        return 'text-yellow-600 bg-yellow-50'
      case 'non-compliant':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorDisplay message={error} />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {vendorInfo?.company_name ? `${vendorInfo.company_name} - Client Management` : 'Client Management'}
              </h1>
              <p className="text-gray-600 mt-1">
                {vendorInfo?.user?.display_name ? `Manage your clients, ${vendorInfo.user.display_name}` : 'Manage your clients and their fire safety equipment'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* User Avatar */}
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {vendorInfo?.user?.avatar_url ? (
                  <Image
                    className="h-10 w-10 rounded-full object-cover"
                    src={vendorInfo.user.avatar_url}
                    alt={vendorInfo.user.display_name}
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-red-600">
                      {vendorInfo?.user?.first_name?.[0]}{vendorInfo?.user?.last_name?.[0]}
                    </span>
                  </div>
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{vendorInfo?.user?.display_name}</p>
                <p className="text-xs text-gray-500">{vendorInfo?.company_name}</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Client
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis?.totalClients?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-xl">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis?.activeClients?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-50 rounded-xl">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average Compliance</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis?.averageCompliance?.toFixed(1) || '0.0'}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="company_name">Company Name</option>
                <option value="created_at">Date Created</option>
                <option value="last_service_date">Last Service</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setSortBy('company_name')
                  setSortOrder('asc')
                }}
                className="w-full py-2 px-4 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Clients ({clients.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Company Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Business Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Contact Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Status & Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {clients.map((client, index) => (
                  <tr
                    key={client.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${index !== clients.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onClick={() => handleClientClick(client.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{client.company_name}</div>
                          <div className="text-sm text-gray-500">{client.contact_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.business_type || 'Not specified'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {client.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {client.primary_phone || client.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {client.street_address || client.address}
                      </div>
                      <div className="text-sm text-gray-500">
                        {client.city}, {client.state} {client.zip_code}
                      </div>
                      {client.country && (
                        <div className="text-sm text-gray-500">{client.country}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          client.status === 'active' || client.is_active
                            ? 'text-green-800 bg-green-100' 
                            : client.status === 'pending'
                            ? 'text-yellow-800 bg-yellow-100'
                            : 'text-red-800 bg-red-100'
                        }`}>
                          {client.status || (client.is_active ? 'Active' : 'Inactive')}
                        </span>
                        <div className="text-sm text-gray-900 flex items-center">
                          <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {client.equipment_count || 0} items
                        </div>
                        {client.compliance_status && (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getComplianceColor(client.compliance_status)}`}>
                            {client.compliance_status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClientClick(client.id);
                          }}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add edit functionality later
                          }}
                          className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {clients.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search criteria.'
                  : 'Get started by adding your first client.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 border border-gray-100 rounded-2xl">
            <div className="text-sm text-gray-700">
              Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
              {pagination.totalItems} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onClientCreated={handleClientCreated}
      />
    </DashboardLayout>
  )
}