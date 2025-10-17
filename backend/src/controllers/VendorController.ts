import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { BaseController } from './BaseController';
import { VendorRepository } from '../models/VendorRepository';
import { UserRepository } from '../models/UserRepository';
import { AuditRepository } from '../models/AuditRepository';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { DebugLogger } from '../utils/DebugLogger';
import { AuthenticatedRequest } from '../types/api';
import { CreateVendorRequest } from '../types';
import { CreateUserRequest } from '../types';

/**
 * Vendor Controller
 * Handles all vendor-related operations with proper pagination and CRUD
 */
export class VendorController extends BaseController {

  /**
   * GET /api/vendors
   * Get paginated list of vendors (admin only)
   */
  getVendors = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    DebugLogger.log('VendorController.getVendors called', { 
      userId: req.user?.userId,
      query: req.query 
    });

    // Check permissions
    if (!this.requireRole(req, res, ['admin'])) return;

    try {
      const pagination = this.getPagination(req);
      const { status, search, specialization } = req.query;

      DebugLogger.log('Getting vendors with pagination', {
        pagination,
        filters: { status, search, specialization }
      });

      // Get vendors with pagination
      const [vendors, total] = await Promise.all([
        VendorRepository.getVendors(pagination, { 
          status: status as string, 
          search: search as string,
          specialization: specialization as string
        }),
        VendorRepository.getVendorsCount({ 
          status: status as string, 
          search: search as string,
          specialization: specialization as string
        })
      ]);

      DebugLogger.log('Vendors retrieved successfully', {
        count: vendors.length,
        total,
        page: pagination.page
      });

      this.logAction('VENDORS_RETRIEVED', req.user!.userId, { 
        pagination, 
        total,
        filters: { status, search }
      });

      ApiResponseUtil.paginated(
        res,
        vendors,
        pagination.page!,
        pagination.limit!,
        total,
        'Vendors retrieved successfully'
      );

    } catch (error) {
      DebugLogger.error('Error retrieving vendors', error);
      this.logAction('VENDORS_RETRIEVAL_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error retrieving vendors:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/vendors/:id
   * Get vendor by ID (admin only)
   */
  getVendorById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    DebugLogger.log('VendorController.getVendorById called', { 
      userId: req.user?.userId,
      vendorId: req.params.id 
    });

    // Check permissions
    if (!this.requireRole(req, res, ['admin'])) return;

    try {
      const vendorId = parseInt(req.params.id);
      if (isNaN(vendorId)) {
        DebugLogger.log('Invalid vendor ID provided', { vendorId: req.params.id }, 'WARNING');
        return ApiResponseUtil.error(res, 'Invalid vendor ID', 400, 'INVALID_ID');
      }

      const vendor = await VendorRepository.getVendorById(vendorId);
      
      if (!vendor) {
        DebugLogger.log('Vendor not found', { vendorId }, 'WARNING');
        return ApiResponseUtil.notFound(res, 'Vendor not found');
      }

      DebugLogger.log('Vendor retrieved successfully', { vendorId });

      this.logAction('VENDOR_RETRIEVED', req.user!.userId, { vendorId });

      ApiResponseUtil.success(res, vendor, 'Vendor retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error retrieving vendor', error);
      this.logAction('VENDOR_RETRIEVAL_ERROR', req.user?.userId, { 
        vendorId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error retrieving vendor:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * POST /api/vendors
   * Create new vendor with detailed information (admin only)
   */
  createVendor = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    DebugLogger.log('VendorController.createVendor called', { 
      userId: req.user?.userId,
      email: req.body.email 
    });

    // Validate request
    if (!this.handleValidation(req, res)) return;

    // Check permissions
    if (!this.requireRole(req, res, ['admin'])) return;

    try {
      const vendorData: CreateVendorRequest = req.body;
      const clientIP = this.getClientIP(req);

      DebugLogger.log('Creating new vendor with detailed information', { 
        companyName: vendorData.companyName,
        email: vendorData.email,
        contactPersonName: vendorData.contactPersonName
      });

      // Check if vendor already exists
      const existingUser = await UserRepository.findByEmail(vendorData.email);
      if (existingUser) {
        DebugLogger.log('Vendor already exists', { email: vendorData.email }, 'WARNING');
        return ApiResponseUtil.conflict(res, 'User with this email already exists');
      }

      // Create detailed vendor
      const newVendor = await VendorRepository.createVendor(vendorData);

      DebugLogger.log('Detailed vendor created successfully', { 
        vendorId: newVendor.id,
        email: newVendor.email,
        companyName: newVendor.company?.company_name
      });

      // Log the creation
      await AuditRepository.createLog(
        'user',
        { user_id: newVendor.id },
        'INSERT',
        { 
          action: 'detailed_vendor_created', 
          created_by: req.user!.userId,
          company_name: newVendor.company?.company_name
        },
        { ip_address: clientIP }
      );

      this.logAction('DETAILED_VENDOR_CREATED', req.user!.userId, { 
        vendorId: newVendor.id,
        email: newVendor.email,
        companyName: newVendor.company?.company_name,
        clientIP 
      });

      // Return sanitized vendor data (without sensitive info)
      const responseData = {
        id: newVendor.id,
        email: newVendor.email,
        display_name: newVendor.display_name,
        user_type: newVendor.user_type,
        created_at: newVendor.created_at,
        company: newVendor.company,
        contact: newVendor.contact,
        address: newVendor.address,
        specializations: newVendor.specializations
      };

      ApiResponseUtil.created(res, responseData, 'Vendor created successfully with detailed information');

    } catch (error) {
      DebugLogger.error('Error creating detailed vendor', error);
      this.logAction('VENDOR_CREATION_ERROR', req.user?.userId, { 
        email: req.body.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error creating vendor:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * PUT /api/vendors/:id
   * Update vendor (admin only)
   */
  updateVendor = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    DebugLogger.log('VendorController.updateVendor called', { 
      userId: req.user?.userId,
      vendorId: req.params.id 
    });

    // Validate request
    if (!this.handleValidation(req, res)) return;

    // Check permissions
    if (!this.requireRole(req, res, ['admin'])) return;

    try {
      const vendorId = parseInt(req.params.id);
      if (isNaN(vendorId)) {
        DebugLogger.log('Invalid vendor ID for update', { vendorId: req.params.id }, 'WARNING');
        return ApiResponseUtil.error(res, 'Invalid vendor ID', 400, 'INVALID_ID');
      }

      const { first_name, last_name, email } = req.body;
      const clientIP = this.getClientIP(req);

      // Check if vendor exists
      const existingVendor = await VendorRepository.getVendorById(vendorId);
      if (!existingVendor) {
        DebugLogger.log('Vendor not found for update', { vendorId }, 'WARNING');
        return ApiResponseUtil.notFound(res, 'Vendor not found');
      }

      // Update vendor
      const updatedVendor = await VendorRepository.updateVendor(vendorId, {
        first_name,
        last_name,
        email
      });

      DebugLogger.log('Vendor updated successfully', { vendorId });

      // Log the update
      await AuditRepository.createLog(
        'user',
        { user_id: vendorId },
        'UPDATE',
        { 
          action: 'vendor_updated', 
          updated_by: req.user!.userId,
          changes: { first_name, last_name, email }
        },
        { ip_address: clientIP }
      );

      this.logAction('VENDOR_UPDATED', req.user!.userId, { 
        vendorId,
        changes: { first_name, last_name, email },
        clientIP 
      });

      ApiResponseUtil.success(res, updatedVendor, 'Vendor updated successfully');

    } catch (error) {
      DebugLogger.error('Error updating vendor', error);
      this.logAction('VENDOR_UPDATE_ERROR', req.user?.userId, { 
        vendorId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error updating vendor:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * DELETE /api/vendors/:id
   * Soft delete vendor (admin only)
   */
  deleteVendor = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    DebugLogger.log('VendorController.deleteVendor called', { 
      userId: req.user?.userId,
      vendorId: req.params.id 
    });

    // Check permissions
    if (!this.requireRole(req, res, ['admin'])) return;

    try {
      const vendorId = parseInt(req.params.id);
      if (isNaN(vendorId)) {
        DebugLogger.log('Invalid vendor ID for deletion', { vendorId: req.params.id }, 'WARNING');
        return ApiResponseUtil.error(res, 'Invalid vendor ID', 400, 'INVALID_ID');
      }

      const clientIP = this.getClientIP(req);

      // Check if vendor exists
      const existingVendor = await VendorRepository.getVendorById(vendorId);
      if (!existingVendor) {
        DebugLogger.log('Vendor not found for deletion', { vendorId }, 'WARNING');
        return ApiResponseUtil.notFound(res, 'Vendor not found');
      }

      // Soft delete vendor
      await VendorRepository.deleteVendor(vendorId);

      DebugLogger.log('Vendor deleted successfully', { vendorId });

      // Log the deletion
      await AuditRepository.createLog(
        'user',
        { user_id: vendorId },
        'DELETE',
        { 
          action: 'vendor_deleted', 
          deleted_by: req.user!.userId 
        },
        { ip_address: clientIP }
      );

      this.logAction('VENDOR_DELETED', req.user!.userId, { 
        vendorId,
        clientIP 
      });

      ApiResponseUtil.noContent(res);

    } catch (error) {
      DebugLogger.error('Error deleting vendor', error);
      this.logAction('VENDOR_DELETION_ERROR', req.user?.userId, { 
        vendorId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error deleting vendor:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/vendors/:id/stats
   * Get vendor statistics (admin only)
   */
  getVendorStats = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    DebugLogger.log('VendorController.getVendorStats called', { 
      userId: req.user?.userId,
      vendorId: req.params.id 
    });

    // Check permissions
    if (!this.requireRole(req, res, ['admin'])) return;

    try {
      const vendorId = parseInt(req.params.id);
      if (isNaN(vendorId)) {
        DebugLogger.log('Invalid vendor ID for stats', { vendorId: req.params.id }, 'WARNING');
        return ApiResponseUtil.error(res, 'Invalid vendor ID', 400, 'INVALID_ID');
      }

      const stats = await VendorRepository.getVendorStats(vendorId);

      DebugLogger.log('Vendor stats retrieved successfully', { vendorId });

      this.logAction('VENDOR_STATS_RETRIEVED', req.user!.userId, { vendorId });

      ApiResponseUtil.success(res, stats, 'Vendor statistics retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error retrieving vendor stats', error);
      this.logAction('VENDOR_STATS_ERROR', req.user?.userId, { 
        vendorId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error retrieving vendor stats:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/vendors/:id/equipment
   * Get all equipment for a specific vendor (admin only)
   */
  getVendorEquipment = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    DebugLogger.log('VendorController.getVendorEquipment called', { 
      userId: req.user?.userId,
      vendorId: req.params.id 
    });

    // Check permissions
    if (!this.requireRole(req, res, ['admin'])) return;

    try {
      const vendorId = parseInt(req.params.id);
      if (isNaN(vendorId)) {
        DebugLogger.log('Invalid vendor ID for equipment', { vendorId: req.params.id }, 'WARNING');
        return ApiResponseUtil.error(res, 'Invalid vendor ID', 400, 'INVALID_ID');
      }

      const equipment = await VendorRepository.getVendorEquipment(vendorId);

      DebugLogger.log('Vendor equipment retrieved successfully', { 
        vendorId, 
        count: equipment.length 
      });

      this.logAction('VENDOR_EQUIPMENT_RETRIEVED', req.user!.userId, { vendorId });

      ApiResponseUtil.success(res, equipment, 'Vendor equipment retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error retrieving vendor equipment', error);
      this.logAction('VENDOR_EQUIPMENT_ERROR', req.user?.userId, { 
        vendorId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error retrieving vendor equipment:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/vendors/specializations
   * Get all available specializations for dropdown (admin only)
   */
  getSpecializations = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    DebugLogger.log('VendorController.getSpecializations called', { 
      userId: req.user?.userId 
    });

    // Check permissions
    if (!this.requireRole(req, res, ['admin'])) return;

    try {
      const specializations = await VendorRepository.getSpecializations();

      DebugLogger.log('Specializations retrieved successfully', { 
        count: specializations.length 
      });

      ApiResponseUtil.success(res, specializations, 'Specializations retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error retrieving specializations', error);
      console.error('Error retrieving specializations:', error);
      return ApiResponseUtil.internalError(res);
    }
  });
}

// Validation schemas for vendor operations
export const createVendorValidation = [
  // User Information
  body('firstName')
    .notEmpty()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be between 1 and 50 characters'),
  body('lastName')
    .notEmpty()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be between 1 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  // Company Information
  body('companyName')
    .notEmpty()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name is required and must be between 2 and 200 characters'),
  body('businessType')
    .notEmpty()
    .isIn(['Private Limited', 'LLC', 'Partnership', 'Sole Proprietorship'])
    .withMessage('Please select a valid business type'),
  body('licenseNumber')
    .optional()
    .isLength({ max: 100 })
    .withMessage('License number must be less than 100 characters'),
  
  // Contact Information
  body('contactPersonName')
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person name is required and must be between 2 and 100 characters'),
  body('contactTitle')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Contact title must be less than 100 characters'),
  body('primaryEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid primary email address'),
  body('primaryPhone')
    .notEmpty()
    .matches(/^\+94\s?\d{2}\s?\d{3}\s?\d{4}$/)
    .withMessage('Please provide a valid Sri Lankan phone number (format: +94 XX XXX XXXX)'),
  
  // Address Information
  body('streetAddress')
    .notEmpty()
    .isLength({ min: 5, max: 255 })
    .withMessage('Street address is required and must be between 5 and 255 characters'),
  body('city')
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('City is required and must be between 2 and 100 characters'),
  body('state')
    .notEmpty()
    .isIn(['Western Province', 'Central Province', 'Southern Province', 'Northern Province', 'Eastern Province', 'North Western Province', 'North Central Province', 'Uva Province', 'Sabaragamuwa Province'])
    .withMessage('Please select a valid Sri Lankan province'),
  body('zipCode')
    .notEmpty()
    .matches(/^\d{5}$/)
    .withMessage('Please provide a valid 5-digit ZIP code'),
  body('country')
    .optional()
    .equals('Sri Lanka')
    .withMessage('Country must be Sri Lanka'),
  
  // Specializations
  body('specializations')
    .isArray({ min: 1 })
    .withMessage('Please select at least one specialization'),
  body('specializations.*')
    .isIn(['Fire Extinguishers', 'Sprinkler Systems', 'Fire Alarms', 'Emergency Lighting', 'Fire Suppression Systems', 'Exit Signs', 'Fire Safety Inspections', 'Fire Safety Training'])
    .withMessage('Please select valid specializations')
];

export const updateVendorValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('first_name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('last_name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
];