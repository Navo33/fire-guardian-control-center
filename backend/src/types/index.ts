import { Request } from 'express';

// User related types
export interface User {
  id: number;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email: string;
  password: string;
  user_type: 'admin' | 'vendor' | 'client';
  role_id?: number;
  is_locked: boolean;
  locked_until?: Date;
  failed_login_attempts: number;
  last_login?: Date;
  last_login_ip?: string;
  created_at: Date;
  deleted_at?: Date;
}

export interface CreateUserRequest {
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
  user_type: 'admin' | 'vendor' | 'client';
  role_id?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: number;
      email: string;
      display_name?: string;
      user_type: string;
      role_id?: number;
    };
  };
}

// Role and Permission types
export interface Role {
  id: number;
  role_name: string;
  description?: string;
  created_at: Date;
}

export interface Permission {
  id: number;
  permission_name: string;
  description?: string;
  category: string;
  created_at: Date;
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
  granted_by?: number;
  granted_at: Date;
}

// Vendor Location types
export interface VendorLocation {
  id: number;
  vendor_id?: number;
  location_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: Date;
}

// Equipment types
export interface Equipment {
  id: number;
  equipment_code?: string;
  equipment_name: string;
  description?: string;
  created_at: Date;
  deleted_at?: Date;
}

export interface EquipmentInstance {
  id: number;
  equipment_id?: number;
  serial_number?: string;
  vendor_location_id?: number;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  assigned_to?: number;
  assigned_at?: Date;
  expiry_date?: Date;
  created_at: Date;
  deleted_at?: Date;
}

// Equipment Assignment types
export interface EquipmentAssignment {
  id: number;
  client_id?: number;
  assigned_by?: number;
  assigned_at: Date;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
}

export interface AssignmentItem {
  assignment_id: number;
  equipment_instance_id: number;
}

// Equipment Return types
export interface EquipmentReturn {
  id: number;
  assignment_id?: number;
  returned_by?: number;
  return_date: Date;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
}

export interface EquipmentReturnItem {
  return_id: number;
  equipment_instance_id: number;
}

// Notification types
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'normal' | 'high';
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
  expires_at?: Date;
}

// Audit Log types
export interface AuditLog {
  id: number;
  table_name: string;
  record_id: any; // JSONB
  action_type: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  changes?: any; // JSONB
  metadata?: any; // JSONB
  changed_by?: number;
  created_at: Date;
}

// Password Reset types
export interface PasswordReset {
  id: number;
  user_id: number;
  reset_token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

// JWT Payload
export interface JwtPayload {
  userId: number;
  email: string;
  user_type: string;
  role_id?: number;
  iat?: number;
  exp?: number;
}

// Express Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Vendor related types
export interface VendorCompany {
  id?: number;
  vendor_id: number;
  company_name: string;
  business_type: string;
  license_number?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface VendorContact {
  id?: number;
  vendor_id: number;
  contact_person_name: string;
  contact_title?: string;
  primary_email: string;
  primary_phone: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface VendorAddress {
  id?: number;
  vendor_id: number;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Specialization {
  id: number;
  name: string;
  description?: string;
  category?: string;
  created_at?: Date;
}

export interface VendorSpecialization {
  vendor_id: number;
  specialization_id: number;
  added_at?: Date;
}

export interface CreateVendorRequest {
  // User Information (for the user table)
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  
  // Company Information (for vendor_company table)
  companyName: string;
  businessType: string;
  licenseNumber?: string;
  
  // Contact Information (from vendors table)
  primaryPhone: string;
  
  // Address Information (for vendor_address table)
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string; // defaults to 'Sri Lanka'
  
  // Specializations (for vendor_specialization table)
  specializations: string[];
}

export interface DetailedVendor extends User {
  company?: VendorCompany;
  contact?: VendorContact;
  address?: VendorAddress;
  specializations?: string[];
  // Additional computed fields
  locations_count?: number;
  equipment_count?: number;
  assignments_count?: number;
  clients_count?: number;
}