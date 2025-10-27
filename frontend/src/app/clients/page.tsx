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
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
              <p className="text-gray-600 mt-1">
                {vendorInfo?.company_name ? `${vendorInfo.company_name} - Manage your clients and their fire safety equipment` : 'Manage your clients and their fire safety equipment'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New Client</span>
          </button>
        </div>

        {/* Stats Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis?.totalClients?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis?.activeClients?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Average Compliance</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis?.averageCompliance?.toFixed(1) || '0.0'}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <svg className="h-5 w-5 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search clients by company name, email, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="input-field appearance-none pr-8 min-w-[120px]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <svg className="h-4 w-4 absolute right-2 top-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="input-field appearance-none pr-8 min-w-[160px]"
                >
                  <option value="company_name">Company Name</option>
                  <option value="created_at">Date Created</option>
                  <option value="last_service_date">Last Service</option>
                </select>
                <svg className="h-4 w-4 absolute right-2 top-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
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
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Status
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
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleClientClick(client.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{client.company_name}</div>
                          <div className="text-sm text-gray-500">{client.contact_name}</div>
                          <div className="text-xs text-gray-400">{client.business_type || 'Not specified'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{client.email}</div>
                      <div className="text-sm text-gray-500">{client.primary_phone || client.phone}</div>
                    </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">Equipment: {client.equipment_count || 0}</div>
                    <div className="text-sm text-gray-500">Last Service: {client.last_service_date ? formatDate(client.last_service_date) : 'Never'}</div>
                  </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.status === 'active' || client.is_active
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.status || (client.is_active ? 'Active' : 'Inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleClientClick(client.id)
                          }}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          View
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Handle edit
                          }}
                          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
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