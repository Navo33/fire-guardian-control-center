'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../../components/layout/DashboardLayout';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  GlobeAltIcon,
  CalendarIcon,
  ClockIcon,
  ChartBarIcon,
  CogIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FireIcon,
  ShieldCheckIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface VendorDetails {
  id: number;
  name: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  location: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website?: string;
  businessType: string;
  licenseNumber: string;
  taxId: string;
  contactPerson: string;
  contactTitle: string;
  yearsInBusiness: number;
  employeeCount: number;
  serviceAreas: string;
  specializations: string[];
  certifications?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  joinDate: string;
  lastActivity: string;
  compliance: number;
  totalClients: number;
  totalEquipment: number;
  completedJobs: number;
  avgResponseTime: string;
  notes?: string;
}

interface Equipment {
  id: number;
  type: string;
  model: string;
  location: string;
  clientName: string;
  lastInspection: string;
  nextInspection: string;
  status: 'Good' | 'Needs Attention' | 'Critical';
  compliance: number;
}

export default function VendorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = parseInt(params.id as string);
  
  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock vendor data - in real app, fetch from API
    const mockVendor: VendorDetails = {
      id: vendorId,
      name: 'SafeGuard Fire Systems',
      email: 'contact@safeguardfire.com',
      phone: '+1 (555) 123-4567',
      secondaryPhone: '+1 (555) 123-4568',
      location: 'New York, NY',
      address: '123 Fire Safety Blvd, Suite 100',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States',
      website: 'https://www.safeguardfire.com',
      businessType: 'Corporation',
      licenseNumber: 'FS-2024-001',
      taxId: '12-3456789',
      contactPerson: 'John Smith',
      contactTitle: 'Operations Manager',
      yearsInBusiness: 15,
      employeeCount: 45,
      serviceAreas: 'New York, New Jersey, Connecticut',
      specializations: ['Fire Extinguishers', 'Sprinkler Systems', 'Fire Alarms'],
      certifications: 'NFPA Certified, State Licensed Fire Safety Inspector, EPA Certified',
      status: 'Active',
      joinDate: '2024-01-15',
      lastActivity: '2 hours ago',
      compliance: 98,
      totalClients: 23,
      totalEquipment: 156,
      completedJobs: 89,
      avgResponseTime: '4.2 hours',
      notes: 'Preferred vendor with excellent track record. Specializes in commercial buildings and has emergency response capability.'
    };

    const mockEquipment: Equipment[] = [
      {
        id: 1,
        type: 'Fire Extinguisher',
        model: 'Amerex B500',
        location: 'Building A - Floor 2',
        clientName: 'Tech Corp Inc.',
        lastInspection: '2024-08-15',
        nextInspection: '2025-08-15',
        status: 'Good',
        compliance: 100
      },
      {
        id: 2,
        type: 'Sprinkler System',
        model: 'Viking VK302',
        location: 'Main Warehouse',
        clientName: 'Logistics Plus',
        lastInspection: '2024-09-10',
        nextInspection: '2025-03-10',
        status: 'Good',
        compliance: 95
      },
      {
        id: 3,
        type: 'Fire Alarm Panel',
        model: 'Simplex 4100ES',
        location: 'Reception Area',
        clientName: 'Office Complex LLC',
        lastInspection: '2024-07-20',
        nextInspection: '2024-10-20',
        status: 'Needs Attention',
        compliance: 85
      }
    ];

    setVendor(mockVendor);
    setEquipment(mockEquipment);
    setIsLoading(false);
  }, [vendorId]);

  const handleDeleteVendor = () => {
    if (confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      // In real app, make API call to delete vendor
      console.log('Deleting vendor:', vendorId);
      router.push('/dashboard/super-admin/vendors');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEquipmentStatusColor = (status: string) => {
    switch (status) {
      case 'Good':
        return 'bg-green-100 text-green-800';
      case 'Needs Attention':
        return 'bg-yellow-100 text-yellow-800';
      case 'Critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!vendor) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Vendor not found</h3>
          <p className="text-gray-500 mb-4">The vendor you're looking for doesn't exist.</p>
          <Link href="/dashboard/super-admin/vendors" className="btn-primary">
            Back to Vendors
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/super-admin/vendors"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(vendor.status)}`}>
                  {vendor.status}
                </span>
                <span className="text-sm text-gray-500">
                  Member since {new Date(vendor.joinDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link
              href={`/dashboard/super-admin/vendors/${vendor.id}/edit`}
              className="btn-secondary flex items-center space-x-2"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Edit</span>
            </Link>
            <button
              onClick={() => {
                if (confirm(`Reset password for ${vendor.name}? They will receive an email with login instructions.`)) {
                  // In real app, make API call to reset password
                  console.log('Resetting password for vendor:', vendorId);
                  alert('Password reset email sent successfully!');
                }
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <ShieldCheckIcon className="h-4 w-4" />
              <span>Reset Password</span>
            </button>
            <button
              onClick={handleDeleteVendor}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-xl">
                <UserIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.totalClients}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-xl">
                <FireIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Equipment</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.totalEquipment}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.completedJobs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-50 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Compliance</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.compliance}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: BuildingOfficeIcon },
                { id: 'equipment', name: 'Equipment', icon: FireIcon }
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
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <UserIcon className="h-5 w-5 text-red-600 mr-2" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                        <p className="text-sm text-gray-900">{vendor.contactPerson}</p>
                        <p className="text-xs text-gray-500">{vendor.contactTitle}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Primary Email</label>
                        <p className="text-sm text-gray-900">{vendor.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Primary Phone</label>
                        <p className="text-sm text-gray-900">{vendor.phone}</p>
                      </div>
                      {vendor.secondaryPhone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Secondary Phone</label>
                          <p className="text-sm text-gray-900">{vendor.secondaryPhone}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <p className="text-sm text-gray-900">{vendor.address}</p>
                        <p className="text-sm text-gray-900">{vendor.city}, {vendor.state} {vendor.zipCode}</p>
                        <p className="text-sm text-gray-900">{vendor.country}</p>
                      </div>
                      {vendor.website && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Website</label>
                          <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 hover:text-red-700">
                            {vendor.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 text-red-600 mr-2" />
                    Business Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Type</label>
                      <p className="text-sm text-gray-900">{vendor.businessType}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Number</label>
                      <p className="text-sm text-gray-900">{vendor.licenseNumber}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                      <p className="text-sm text-gray-900">{vendor.taxId}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Years in Business</label>
                      <p className="text-sm text-gray-900">{vendor.yearsInBusiness} years</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Employee Count</label>
                      <p className="text-sm text-gray-900">{vendor.employeeCount} employees</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Average Response Time</label>
                      <p className="text-sm text-gray-900">{vendor.avgResponseTime}</p>
                    </div>
                  </div>
                </div>

                {/* Service Areas & Specializations */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 text-red-600 mr-2" />
                    Services & Specializations
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Service Areas</label>
                      <p className="text-sm text-gray-900">{vendor.serviceAreas}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Specializations</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {vendor.specializations.map((spec, index) => (
                          <span key={index} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-800 border border-red-200">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                    {vendor.certifications && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Certifications</label>
                        <p className="text-sm text-gray-900">{vendor.certifications}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Notes */}
                {vendor.notes && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-red-600 mr-2" />
                      Additional Notes
                    </h3>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded-xl p-4">{vendor.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Equipment Tab */}
            {activeTab === 'equipment' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Equipment Managed ({equipment.length})
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Equipment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Client & Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Last Inspection
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Next Inspection
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          Compliance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {equipment.map((item, index) => (
                        <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${index !== equipment.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.type}</div>
                              <div className="text-sm text-gray-500">{item.model}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-900">{item.clientName}</div>
                              <div className="text-sm text-gray-500">{item.location}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.lastInspection).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.nextInspection).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getEquipmentStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3 max-w-[100px]">
                                <div 
                                  className={`h-2 rounded-full ${item.compliance >= 90 ? 'bg-green-500' : item.compliance >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${item.compliance}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{item.compliance}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}