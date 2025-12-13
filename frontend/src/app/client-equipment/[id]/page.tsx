'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { API_ENDPOINTS, getAuthHeaders, logApiCall } from '@/config/api';
import { 
  FireIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  TagIcon,
  CubeIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

// Types
interface EquipmentDetail {
  // Equipment Type Info
  equipment_name: string;
  equipment_code: string;
  equipment_type: string;
  manufacturer: string;
  model: string;
  description: string;
  specifications: any;
  default_lifespan_years: number;
  warranty_years: number;
  created_date: string;
  
  // Summary Stats
  total_instances: string;
  compliant_count: string;
  expired_count: string;
  overdue_count: string;
  due_soon_count: string;
  compliance_rate_pct: string;
  next_maintenance_date: string;
  days_until_maintenance: string;
  overall_status: string;
  
  // Arrays
  instances: InstanceData[];
  maintenance_history: MaintenanceData[];
}

interface InstanceData {
  instance_id: number;
  serial_number: string;
  asset_tag: string;
  location: string;
  compliance_status: string;
  next_maintenance_date: string;
  days_until_maintenance: number;
  expiry_date: string;
  assigned_date: string;
  assignment_number: string;
  assignment_start_date: string;
  assignment_end_date: string;
  assignment_notes: string;
  vendor_name: string;
  assignment_status: string;
}

interface MaintenanceData {
  ticket_number: string;
  status: string;
  priority: string;
  created_date: string;
  scheduled_date: string;
  resolved_date: string;
  issue: string;
  resolution: string;
  serial_number: string;
  technician: string;
}

const ClientEquipmentDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const equipmentId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [equipmentDetail, setEquipmentDetail] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch equipment detail
  const fetchEquipmentDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!equipmentId) {
        throw new Error('Equipment ID is required');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const headers = getAuthHeaders();

      logApiCall('GET', API_ENDPOINTS.CLIENT.EQUIPMENT.BY_ID(equipmentId));
      const response = await fetch(API_ENDPOINTS.CLIENT.EQUIPMENT.BY_ID(equipmentId), { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch equipment detail: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEquipmentDetail(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch equipment detail');
      }
    } catch (err) {
      console.error('Error fetching equipment detail:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (equipmentId) {
      fetchEquipmentDetail();
    }
  }, [equipmentId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'compliant': return 'Compliant';
      case 'due_soon': return 'Due Soon';
      case 'overdue': return 'Overdue';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} action={{ label: 'Retry', onClick: fetchEquipmentDetail }} />;
  if (!equipmentDetail) return <ErrorDisplay message="Equipment not found" />;

  return (
    <RequireRole allowedRoles={['client']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/client-equipment"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{equipmentDetail.equipment_name}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(equipmentDetail.overall_status)}`}>
                    {getStatusLabel(equipmentDetail.overall_status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Created {equipmentDetail.created_date}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <CubeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Assigned</p>
                  <p className="text-2xl font-bold text-gray-900">{equipmentDetail.total_instances || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Compliant</p>
                  <p className="text-2xl font-bold text-gray-900">{equipmentDetail.compliant_count || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-red-50 rounded-xl">
                  <ClipboardDocumentCheckIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{equipmentDetail.compliance_rate_pct || 0}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Next Maintenance</p>
                  <p className="text-sm font-bold text-gray-900">
                    {equipmentDetail.next_maintenance_date ? 
                      `${equipmentDetail.days_until_maintenance} days` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation - Including assignments tab */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', name: 'Overview', icon: CubeIcon },
                  { id: 'assignments', name: `Assignments (${equipmentDetail?.instances?.length || 0})`, icon: UserGroupIcon },
                  { id: 'maintenance', name: `Maintenance (${equipmentDetail?.maintenance_history?.length || 0})`, icon: WrenchScrewdriverIcon },
                  { id: 'compliance', name: 'Compliance Status', icon: ChartBarIcon },
                  { id: 'specifications', name: 'Specifications', icon: DocumentTextIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <CubeIcon className="h-5 w-5 text-red-600 mr-2" />
                      Equipment Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                        <p className="text-sm text-gray-900">{equipmentDetail.equipment_name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Code</label>
                        <p className="text-sm text-gray-900">{equipmentDetail.equipment_code}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Equipment Type</label>
                        <p className="text-sm text-gray-900">{equipmentDetail.equipment_type}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                        <p className="text-sm text-gray-900">{equipmentDetail.manufacturer}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Model</label>
                        <p className="text-sm text-gray-900">{equipmentDetail.model}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Lifespan</label>
                        <p className="text-sm text-gray-900">{equipmentDetail.default_lifespan_years} years</p>
                      </div>
                      
                      {equipmentDetail.description && (
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <p className="text-sm text-gray-900">{equipmentDetail.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Summary */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <ChartBarIcon className="h-5 w-5 text-red-600 mr-2" />
                      Assignment Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Assigned</p>
                            <p className="text-lg font-bold text-gray-900">{equipmentDetail.total_instances}</p>
                          </div>
                          <CubeIcon className="h-8 w-8 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Compliant</p>
                            <p className="text-lg font-bold text-gray-900">{equipmentDetail.compliant_count}</p>
                          </div>
                          <CheckCircleIcon className="h-8 w-8 text-green-600" />
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Due Soon</p>
                            <p className="text-lg font-bold text-gray-900">{equipmentDetail.due_soon_count}</p>
                          </div>
                          <ClockIcon className="h-8 w-8 text-yellow-600" />
                        </div>
                      </div>
                      
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Expired/Overdue</p>
                            <p className="text-lg font-bold text-gray-900">
                              {parseInt(equipmentDetail.expired_count || '0') + parseInt(equipmentDetail.overdue_count || '0')}
                            </p>
                          </div>
                          <WrenchScrewdriverIcon className="h-8 w-8 text-red-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assignments Tab */}
              {activeTab === 'assignments' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Equipment Assignments ({equipmentDetail?.instances?.length || 0})
                    </h3>
                  </div>
                  
                  {equipmentDetail?.instances && equipmentDetail.instances.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Serial Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Asset Tag
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Location
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assignment Details
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assignment Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assigned Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Compliance Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Next Maintenance
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {equipmentDetail.instances.map((instance, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{instance.serial_number}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{instance.asset_tag || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{instance.location}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{instance.assignment_number}</div>
                                <div className="text-xs text-gray-500">{instance.vendor_name}</div>
                                {instance.assignment_notes && (
                                  <div className="text-xs text-gray-500 mt-1">{instance.assignment_notes}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  instance.assignment_status === 'active' ? 'bg-green-100 text-green-800' :
                                  instance.assignment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  instance.assignment_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {instance.assignment_status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{instance.assigned_date}</div>
                                {instance.assignment_start_date && (
                                  <div className="text-xs text-gray-500">Start: {instance.assignment_start_date}</div>
                                )}
                                {instance.assignment_end_date && (
                                  <div className="text-xs text-gray-500">End: {instance.assignment_end_date}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {/* Hide compliance status for pending assignments */}
                                {instance.assignment_status === 'pending' ? (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border-gray-200">
                                    Assignment Pending
                                  </span>
                                ) : (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(instance.compliance_status)}`}>
                                    {getStatusLabel(instance.compliance_status)}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {/* Hide maintenance info for pending assignments */}
                                {instance.assignment_status === 'pending' ? (
                                  <div className="text-sm text-gray-500">Not applicable</div>
                                ) : (
                                  <>
                                    <div className="text-sm text-gray-900">{instance.next_maintenance_date || 'N/A'}</div>
                                    {instance.days_until_maintenance && (
                                      <div className="text-xs text-gray-500">
                                        {/* Only show overdue if compliance status is actually overdue */}
                                        {instance.compliance_status === 'overdue' && instance.days_until_maintenance < 0 ? 
                                          `${Math.abs(instance.days_until_maintenance)} days overdue` :
                                          instance.days_until_maintenance > 0 ?
                                            `${instance.days_until_maintenance} days` :
                                            'Due now'
                                        }
                                      </div>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment assignments</h3>
                      <p className="mt-1 text-sm text-gray-500">No equipment instances have been assigned for this equipment type.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Maintenance Tab */}
              {activeTab === 'maintenance' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Maintenance History ({equipmentDetail?.maintenance_history?.length || 0})
                    </h3>
                  </div>
                  
                  {equipmentDetail?.maintenance_history && equipmentDetail.maintenance_history.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ticket
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Equipment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Priority
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Issue
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Technician
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {equipmentDetail.maintenance_history.map((maintenance, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{maintenance.ticket_number}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{maintenance.serial_number}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  maintenance.status === 'closed' ? 'bg-green-100 text-green-800' :
                                  maintenance.status === 'open' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {maintenance.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  maintenance.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                  maintenance.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  maintenance.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {maintenance.priority}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs truncate" title={maintenance.issue}>
                                  {maintenance.issue || 'No description'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{maintenance.technician}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{maintenance.created_date}</div>
                                {maintenance.scheduled_date && (
                                  <div className="text-xs text-gray-500">Scheduled: {maintenance.scheduled_date}</div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance history</h3>
                      <p className="mt-1 text-sm text-gray-500">No maintenance records found for this equipment type.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Compliance Tab */}
              {activeTab === 'compliance' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Compliance Status Overview
                    </h3>
                  </div>
                  
                  {equipmentDetail?.instances && equipmentDetail.instances.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Serial Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Location
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Compliance Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Next Maintenance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Expiry Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assignment
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {equipmentDetail.instances.map((instance, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{instance.serial_number}</div>
                                {instance.asset_tag && (
                                  <div className="text-xs text-gray-500">Tag: {instance.asset_tag}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{instance.location}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(instance.compliance_status)}`}>
                                  {getStatusLabel(instance.compliance_status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{instance.next_maintenance_date || 'N/A'}</div>
                                {instance.days_until_maintenance && (
                                  <div className="text-xs text-gray-500">
                                    {instance.days_until_maintenance > 0 ? 
                                      `${instance.days_until_maintenance} days` : 
                                      `${Math.abs(instance.days_until_maintenance)} days overdue`}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{instance.expiry_date}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{instance.assignment_number}</div>
                                <div className="text-xs text-gray-500">{instance.vendor_name}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No instances found</h3>
                      <p className="mt-1 text-sm text-gray-500">No equipment instances assigned for compliance tracking.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Specifications Tab */}
              {activeTab === 'specifications' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Technical Specifications</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Lifespan</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {equipmentDetail.default_lifespan_years} years
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Period</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {equipmentDetail.warranty_years || 'N/A'} years
                      </p>
                    </div>
                    
                    {equipmentDetail.specifications && typeof equipmentDetail.specifications === 'object' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Specifications</label>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                            {JSON.stringify(equipmentDetail.specifications, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RequireRole>
  );
};

export default ClientEquipmentDetailPage;
