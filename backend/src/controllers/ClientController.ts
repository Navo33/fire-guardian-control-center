import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { BaseController } from './BaseController';
import { ClientRepository } from '../models/ClientRepository';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../types/api';

export class ClientController extends BaseController {
  private clientRepository: ClientRepository;

  constructor(clientRepository: ClientRepository) {
    super();
    this.clientRepository = clientRepository;
  }

  /**
   * Get vendor ID for the authenticated user
   */
  private async getVendorId(req: AuthenticatedRequest): Promise<number | null> {
    if (!req.user || req.user.user_type !== 'vendor') {
      return null;
    }
    return await this.clientRepository.getVendorIdByUserId(req.user.userId);
  }

  /**
   * Get KPI data for vendor's clients
   * GET /api/vendor/clients/kpis
   */
  getClientKPIs = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendorId = await this.getVendorId(req);
    if (!vendorId) {
      return ApiResponseUtil.forbidden(res, 'Access denied. Vendor role required.');
    }

    const kpis = await this.clientRepository.getClientKPIs(vendorId);
    return ApiResponseUtil.success(res, kpis, 'Client KPIs retrieved successfully');
  });

  /**
   * Get paginated list of clients for vendor
   * GET /api/vendor/clients
   */
  getClientList = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendorId = await this.getVendorId(req);
    if (!vendorId) {
      return ApiResponseUtil.forbidden(res, 'Access denied. Vendor role required.');
    }

    const filters = {
      status: req.query.status as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25
    };

    const result = await this.clientRepository.getClientList(vendorId, filters);
    return ApiResponseUtil.success(res, result, 'Client list retrieved successfully');
  });

  /**
   * Get detailed information for a specific client
   * GET /api/vendor/clients/:id
   */
  getClientDetails = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendorId = await this.getVendorId(req);
    if (!vendorId) {
      return ApiResponseUtil.forbidden(res, 'Access denied. Vendor role required.');
    }

    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
      return ApiResponseUtil.error(res, 'Invalid client ID', 400);
    }

    const client = await this.clientRepository.getClientDetails(clientId, vendorId);
    if (!client) {
      return ApiResponseUtil.notFound(res, 'Client not found');
    }

    return ApiResponseUtil.success(res, client, 'Client details retrieved successfully');
  });

  /**
   * Get equipment assigned to a client
   * GET /api/vendor/clients/:id/equipment
   */
  getClientEquipment = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendorId = await this.getVendorId(req);
    if (!vendorId) {
      return ApiResponseUtil.forbidden(res, 'Access denied. Vendor role required.');
    }

    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
      return ApiResponseUtil.error(res, 'Invalid client ID', 400);
    }

    const equipment = await this.clientRepository.getClientEquipment(clientId, vendorId);
    return ApiResponseUtil.success(res, equipment, 'Client equipment retrieved successfully');
  });

  /**
   * Get maintenance history for a client
   * GET /api/vendor/clients/:id/maintenance
   */
  getClientMaintenanceHistory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendorId = await this.getVendorId(req);
    if (!vendorId) {
      return ApiResponseUtil.forbidden(res, 'Access denied. Vendor role required.');
    }

    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
      return ApiResponseUtil.error(res, 'Invalid client ID', 400);
    }

    const maintenance = await this.clientRepository.getClientMaintenanceHistory(clientId, vendorId);
    return ApiResponseUtil.success(res, maintenance, 'Client maintenance history retrieved successfully');
  });

  /**
   * Create a new client
   * POST /api/vendor/clients
   */
  createClient = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendorId = await this.getVendorId(req);
    if (!vendorId) {
      return ApiResponseUtil.forbidden(res, 'Access denied. Vendor role required.');
    }

    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      company_name,
      business_type,
      primary_phone,
      street_address,
      city,
      zip_code,
      country
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'first_name', 'last_name', 'email', 'password', 'phone',
      'company_name', 'business_type', 'primary_phone', 
      'street_address', 'city', 'zip_code', 'country'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return ApiResponseUtil.error(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ApiResponseUtil.error(res, 'Invalid email format', 400);
    }

    // Check email uniqueness
    const isEmailUnique = await this.clientRepository.isEmailUnique(email);
    if (!isEmailUnique) {
      return ApiResponseUtil.error(res, 'Email address is already in use', 400);
    }

    // Validate password length (minimum 8 characters)
    if (password.length < 8) {
      return ApiResponseUtil.error(res, 'Password must be at least 8 characters long', 400);
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create client
    const clientData = {
      first_name,
      last_name,
      email,
      password: hashedPassword,
      phone,
      company_name,
      business_type,
      primary_phone,
      street_address,
      city,
      zip_code,
      country
    };

    const newClient = await this.clientRepository.createClient(vendorId, clientData);
    return ApiResponseUtil.created(res, newClient, 'Client created successfully');
  });

  /**
   * Update client information
   * PUT /api/vendor/clients/:id
   */
  updateClient = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendorId = await this.getVendorId(req);
    if (!vendorId) {
      return ApiResponseUtil.forbidden(res, 'Access denied. Vendor role required.');
    }

    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
      return ApiResponseUtil.error(res, 'Invalid client ID', 400);
    }

    const updateData = req.body;

    // Validate email if provided
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return ApiResponseUtil.error(res, 'Invalid email format', 400);
      }

      // Check email uniqueness (excluding current user)
      const client = await this.clientRepository.getClientDetails(clientId, vendorId);
      if (!client) {
        return ApiResponseUtil.notFound(res, 'Client not found');
      }

      const isEmailUnique = await this.clientRepository.isEmailUnique(updateData.email, clientId);
      if (!isEmailUnique) {
        return ApiResponseUtil.error(res, 'Email address is already in use', 400);
      }
    }

    // Validate status if provided
    if (updateData.status && !['active', 'inactive', 'pending'].includes(updateData.status)) {
      return ApiResponseUtil.error(res, 'Invalid status. Must be active, inactive, or pending', 400);
    }

    const updatedClient = await this.clientRepository.updateClient(clientId, vendorId, updateData);
    return ApiResponseUtil.success(res, updatedClient, 'Client updated successfully');
  });

  /**
   * Delete a client (soft delete)
   * DELETE /api/vendor/clients/:id
   */
  deleteClient = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendorId = await this.getVendorId(req);
    if (!vendorId) {
      return ApiResponseUtil.forbidden(res, 'Access denied. Vendor role required.');
    }

    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
      return ApiResponseUtil.error(res, 'Invalid client ID', 400);
    }

    // Check if client has assigned equipment
    const hasEquipment = await this.clientRepository.hasAssignedEquipment(clientId);
    if (hasEquipment) {
      return ApiResponseUtil.error(res, 'Cannot delete client with assigned equipment. Please unassign equipment first.', 400);
    }

    try {
      const deletedClient = await this.clientRepository.deleteClient(clientId, vendorId);
      return ApiResponseUtil.success(res, deletedClient, 'Client deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return ApiResponseUtil.notFound(res, 'Client not found');
      }
      throw error;
    }
  });
}