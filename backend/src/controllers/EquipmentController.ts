import { Response } from 'express';
import { BaseController } from './BaseController';
import { EquipmentRepository, EquipmentFilters, CreateEquipmentInstanceData, UpdateEquipmentInstanceData, AssignEquipmentData, BulkAssignEquipmentData, CreateEquipmentTypeData, UpdateEquipmentTypeData } from '../models/EquipmentRepository';
import { DashboardRepository } from '../models/DashboardRepository';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { DebugLogger } from '../utils/DebugLogger';
import { AuthenticatedRequest, PaginationQuery } from '../types/api';

/**
 * Equipment Controller
 * Handles equipment management operations for vendors
 */
export class EquipmentController extends BaseController {

  /**
   * GET /api/equipment
   * Get equipment list for vendor with filtering and pagination
   */
  getEquipmentList = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', '/api/equipment', req.query);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      if (userType !== 'vendor') {
        DebugLogger.error('Non-vendor user attempted to access equipment list', { userId, userType });
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      // Get vendor ID from user ID
  const vendorId = (await DashboardRepository.getVendorIdFromUserId(userId)) ?? undefined;
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      const { page = '1', limit = '25', status, compliance_status, search, equipment_type_id } = req.query;

      const pagination: PaginationQuery = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const filters: EquipmentFilters = {
        status: status as string,
        compliance_status: compliance_status as string,
        search: search as string,
        equipment_type_id: equipment_type_id ? parseInt(equipment_type_id as string) : undefined
      };

      DebugLogger.log('Fetching equipment list', { vendorId, pagination, filters }, 'EQUIPMENT');

      const [equipment, totalCount] = await Promise.all([
        EquipmentRepository.getEquipmentList(vendorId, pagination, filters),
        EquipmentRepository.getEquipmentCount(vendorId, filters)
      ]);

      const totalPages = Math.ceil(totalCount / pagination.limit!);

      DebugLogger.log('Equipment list retrieved successfully', { 
        vendorId, 
        count: equipment.length,
        totalCount,
        totalPages
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_LIST_ACCESSED', userId, { vendorId, filters });

      DebugLogger.performance('Equipment list fetch', startTime, { vendorId, count: equipment.length });
      
      ApiResponseUtil.success(res, {
        equipment,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalCount,
          totalPages,
          hasNext: pagination.page! < totalPages,
          hasPrev: pagination.page! > 1
        }
      }, 'Equipment list retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting equipment list', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_LIST_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/equipment/types
   * Get equipment types catalog with filtering and instance counts
   */
  getEquipmentTypes = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', '/api/equipment/types', req.query);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      if (userType !== 'vendor') {
        DebugLogger.error('Non-vendor user attempted to access equipment types', { userId, userType });
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      const { search, category } = req.query;
      const filters = {
        search: search as string,
        category: category as string
      };

      DebugLogger.log('Fetching equipment types', { userId, vendorId, filters }, 'EQUIPMENT');

      const equipmentTypes = await EquipmentRepository.getEquipmentTypes(vendorId, filters);

      DebugLogger.log('Equipment types retrieved successfully', { 
        userId,
        vendorId,
        count: equipmentTypes.length 
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_TYPES_ACCESSED', userId, { vendorId, filters });

      DebugLogger.performance('Equipment types fetch', startTime, { count: equipmentTypes.length });
      ApiResponseUtil.success(res, equipmentTypes, 'Equipment types retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting equipment types', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_TYPES_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/equipment/stats
   * Get aggregated equipment statistics for the management page
   */
  getEquipmentStats = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', '/api/equipment/stats', req.query);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      if (userType !== 'vendor' && userType !== 'admin') {
        DebugLogger.error('Unauthorized user attempted to access equipment stats', { userId, userType });
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor or Admin access required.');
      }

      // vendorId is optional for this aggregate; we keep signature for future vendor-scoped stats
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);

      DebugLogger.log('Fetching equipment stats', { userId, vendorId }, 'EQUIPMENT');

      const stats = await EquipmentRepository.getEquipmentStats(vendorId || undefined);

      this.logAction('EQUIPMENT_STATS_ACCESSED', userId, { vendorId });

      DebugLogger.performance('Equipment stats fetch', startTime, { stats });
      ApiResponseUtil.success(res, stats, 'Equipment statistics retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting equipment stats', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_STATS_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * POST /api/equipment
   * Add new equipment instance
   */
  addEquipmentInstance = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('POST', '/api/equipment', req.body);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      if (userType !== 'vendor') {
        DebugLogger.error('Non-vendor user attempted to add equipment', { userId, userType });
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      const {
        equipment_id,
        serial_number,
        purchase_date,
        warranty_expiry,
        maintenance_interval_days = 365,
        location,
        notes
      } = req.body;

      // Validation
      if (!equipment_id || !serial_number || !purchase_date) {
        return ApiResponseUtil.badRequest(res, 'Missing required fields: equipment_id, serial_number, purchase_date');
      }

      // Check serial number uniqueness
      const isUnique = await EquipmentRepository.isSerialNumberUnique(serial_number);
      if (!isUnique) {
        return ApiResponseUtil.badRequest(res, 'Serial number already exists');
      }

      const equipmentData: CreateEquipmentInstanceData = {
        equipment_id: parseInt(equipment_id),
        serial_number,
        vendor_id: vendorId,
        purchase_date,
        warranty_expiry,
        maintenance_interval_days: parseInt(maintenance_interval_days),
        location,
        notes
      };

      DebugLogger.log('Adding equipment instance', { vendorId, equipmentData }, 'EQUIPMENT');

      const newEquipment = await EquipmentRepository.addEquipmentInstance(equipmentData);

      DebugLogger.log('Equipment instance added successfully', { 
        vendorId, 
        equipmentId: newEquipment.id,
        serialNumber: newEquipment.serial_number
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_INSTANCE_ADDED', userId, { 
        vendorId, 
        equipmentId: newEquipment.id,
        serialNumber: newEquipment.serial_number
      });

      DebugLogger.performance('Equipment instance add', startTime, { vendorId, equipmentId: newEquipment.id });
      ApiResponseUtil.success(res, newEquipment, 'Equipment instance added successfully', 201);

    } catch (error) {
      DebugLogger.error('Error adding equipment instance', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_INSTANCE_ADD_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * POST /api/equipment/assign
   * Assign multiple equipment instances to a client (bulk assignment)
   */
  bulkAssignEquipment = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('POST', '/api/equipment/assign', req.body);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      if (userType !== 'vendor') {
        DebugLogger.error('Non-vendor user attempted to assign equipment', { userId, userType });
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      const {
        client_id,
        equipment_instances,
        assignment_date,
        notes
      } = req.body;

      // Validation
      if (!client_id || !equipment_instances || !Array.isArray(equipment_instances) || equipment_instances.length === 0 || !assignment_date) {
        return ApiResponseUtil.badRequest(res, 'Missing required fields: client_id, equipment_instances (array), assignment_date');
      }

      const assignmentData: BulkAssignEquipmentData = {
        vendor_id: vendorId,
        client_id: parseInt(client_id),
        equipment_instances: equipment_instances.map(id => parseInt(id)),
        assignment_date,
        notes
      };

      DebugLogger.log('Assigning equipment to client', { vendorId, assignmentData }, 'EQUIPMENT');

      const assignment = await EquipmentRepository.bulkAssignEquipmentToClient(assignmentData);

      DebugLogger.log('Equipment assigned successfully', { 
        vendorId, 
        assignmentId: assignment.assignment_id,
        clientId: assignment.client_id,
        instanceCount: equipment_instances.length
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_ASSIGNED', userId, { 
        vendorId, 
        assignmentId: assignment.assignment_id,
        clientId: assignment.client_id,
        instanceCount: equipment_instances.length
      });

      DebugLogger.performance('Equipment assignment', startTime, { vendorId, assignmentId: assignment.assignment_id });
      ApiResponseUtil.success(res, assignment, 'Equipment assigned successfully', 201);

    } catch (error) {
      DebugLogger.error('Error assigning equipment', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_ASSIGN_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * DELETE /api/equipment/:id/remove-assignment
   * Remove equipment assignment from client
   */
  removeEquipmentAssignment = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('DELETE', `/api/equipment/${req.params.id}/remove-assignment`);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      if (userType !== 'vendor') {
        DebugLogger.error('Non-vendor user attempted to remove equipment assignment', { userId, userType });
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      const equipmentInstanceId = parseInt(req.params.id);
      if (isNaN(equipmentInstanceId)) {
        return ApiResponseUtil.badRequest(res, 'Invalid equipment instance ID');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      DebugLogger.log('Removing equipment assignment', { 
        vendorId, 
        equipmentInstanceId 
      }, 'EQUIPMENT');

      const result = await EquipmentRepository.removeEquipmentAssignment(equipmentInstanceId, vendorId);

      if (!result.success) {
        return ApiResponseUtil.notFound(res, result.message || 'Equipment instance not found or not assigned');
      }

      DebugLogger.log('Equipment assignment removed successfully', { 
        vendorId, 
        equipmentInstanceId,
        clientId: result.clientId
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_ASSIGNMENT_REMOVED', userId, { 
        vendorId, 
        equipmentInstanceId,
        clientId: result.clientId
      });

      DebugLogger.performance('Equipment assignment removal', startTime, { vendorId, equipmentInstanceId });
      ApiResponseUtil.success(res, { equipmentInstanceId, clientId: result.clientId }, 'Equipment assignment removed successfully');

    } catch (error) {
      DebugLogger.error('Error removing equipment assignment', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_ASSIGNMENT_REMOVE_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/equipment/:id
   * Get equipment type details with comprehensive metrics and instance data
   */
  getEquipmentDetails = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', `/api/equipment/${req.params.id}`, req.query);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;
      const equipmentId = parseInt(req.params.id);

      if (userType !== 'vendor' && userType !== 'admin') {
        DebugLogger.error('Unauthorized user attempted to access equipment details', { userId, userType });
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor or Admin access required.');
      }

      if (isNaN(equipmentId)) {
        return ApiResponseUtil.badRequest(res, 'Invalid equipment ID');
      }

      // Get vendor ID from user ID (optional for admins)
      const vendorId = (await DashboardRepository.getVendorIdFromUserId(userId)) ?? undefined;

      DebugLogger.log('Fetching equipment type details', { vendorId, equipmentId }, 'EQUIPMENT');

      const equipmentDetails = await EquipmentRepository.getEquipmentTypeDetails(equipmentId, vendorId);

      if (!equipmentDetails) {
        return ApiResponseUtil.notFound(res, 'Equipment type not found');
      }

      DebugLogger.log('Equipment type details retrieved successfully', { 
        vendorId, 
        equipmentId,
        name: equipmentDetails.name
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_TYPE_DETAILS_ACCESSED', userId, { vendorId, equipmentId });

      DebugLogger.performance('Equipment type details fetch', startTime, { vendorId, equipmentId });
      ApiResponseUtil.success(res, equipmentDetails, 'Equipment type details retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting equipment type details', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_TYPE_DETAILS_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/equipment/:id/related
   * Get related equipment instances
   */
  getRelatedEquipment = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', `/api/equipment/${req.params.id}/related`, req.query);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;
      const equipmentInstanceId = parseInt(req.params.id);

      if (userType !== 'vendor') {
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      if (isNaN(equipmentInstanceId)) {
        return ApiResponseUtil.badRequest(res, 'Invalid equipment instance ID');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      const relatedEquipment = await EquipmentRepository.getRelatedEquipmentInstances(equipmentInstanceId, vendorId);

      this.logAction('EQUIPMENT_RELATED_ACCESSED', userId, { vendorId, equipmentInstanceId });

      DebugLogger.performance('Related equipment fetch', startTime, { vendorId, count: relatedEquipment.length });
      ApiResponseUtil.success(res, relatedEquipment, 'Related equipment retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting related equipment', error, { userId: req.user?.userId });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/equipment/:id/assignments
   * Get assignment history for equipment instance
   */
  getAssignmentHistory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', `/api/equipment/${req.params.id}/assignments`, req.query);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;
      const equipmentInstanceId = parseInt(req.params.id);

      if (userType !== 'vendor') {
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      if (isNaN(equipmentInstanceId)) {
        return ApiResponseUtil.badRequest(res, 'Invalid equipment instance ID');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      const assignments = await EquipmentRepository.getAssignmentHistory(equipmentInstanceId, vendorId);

      this.logAction('EQUIPMENT_ASSIGNMENTS_ACCESSED', userId, { vendorId, equipmentInstanceId });

      DebugLogger.performance('Assignment history fetch', startTime, { vendorId, count: assignments.length });
      ApiResponseUtil.success(res, assignments, 'Assignment history retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting assignment history', error, { userId: req.user?.userId });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/equipment/:id/maintenance
   * Get maintenance history for equipment instance
   */
  getMaintenanceHistory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', `/api/equipment/${req.params.id}/maintenance`, req.query);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;
      const equipmentInstanceId = parseInt(req.params.id);

      if (userType !== 'vendor') {
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      if (isNaN(equipmentInstanceId)) {
        return ApiResponseUtil.badRequest(res, 'Invalid equipment instance ID');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      const maintenance = await EquipmentRepository.getMaintenanceHistory(equipmentInstanceId, vendorId);

      this.logAction('EQUIPMENT_MAINTENANCE_ACCESSED', userId, { vendorId, equipmentInstanceId });

      DebugLogger.performance('Maintenance history fetch', startTime, { vendorId, count: maintenance.length });
      ApiResponseUtil.success(res, maintenance, 'Maintenance history retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting maintenance history', error, { userId: req.user?.userId });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * PUT /api/equipment/:id
   * Update equipment instance
   */
  updateEquipmentInstance = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('PUT', `/api/equipment/${req.params.id}`, req.body);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;
      const equipmentInstanceId = parseInt(req.params.id);

      if (userType !== 'vendor') {
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      if (isNaN(equipmentInstanceId)) {
        return ApiResponseUtil.badRequest(res, 'Invalid equipment instance ID');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      const { status, next_maintenance_date, location, notes } = req.body;

      const updateData: UpdateEquipmentInstanceData = {
        status,
        next_maintenance_date,
        location,
        notes
      };

      DebugLogger.log('Updating equipment instance', { vendorId, equipmentInstanceId, updateData }, 'EQUIPMENT');

      const updatedEquipment = await EquipmentRepository.updateEquipmentInstance(equipmentInstanceId, vendorId, updateData);

      if (!updatedEquipment) {
        return ApiResponseUtil.notFound(res, 'Equipment instance not found');
      }

      DebugLogger.log('Equipment instance updated successfully', { 
        vendorId, 
        equipmentInstanceId,
        serialNumber: updatedEquipment.serial_number
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_INSTANCE_UPDATED', userId, { 
        vendorId, 
        equipmentInstanceId,
        changes: updateData
      });

      DebugLogger.performance('Equipment instance update', startTime, { vendorId, equipmentInstanceId });
      ApiResponseUtil.success(res, updatedEquipment, 'Equipment instance updated successfully');

    } catch (error) {
      DebugLogger.error('Error updating equipment instance', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_INSTANCE_UPDATE_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * DELETE /api/equipment/:id
   * Soft delete equipment instance
   */
  deleteEquipmentInstance = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('DELETE', `/api/equipment/${req.params.id}`, req.body);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;
      const equipmentInstanceId = parseInt(req.params.id);

      if (userType !== 'vendor') {
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      if (isNaN(equipmentInstanceId)) {
        return ApiResponseUtil.badRequest(res, 'Invalid equipment instance ID');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      DebugLogger.log('Deleting equipment instance', { vendorId, equipmentInstanceId }, 'EQUIPMENT');

      const deletedEquipment = await EquipmentRepository.deleteEquipmentInstance(equipmentInstanceId, vendorId);

      if (!deletedEquipment) {
        return ApiResponseUtil.notFound(res, 'Equipment instance not found');
      }

      DebugLogger.log('Equipment instance deleted successfully', { 
        vendorId, 
        equipmentInstanceId,
        serialNumber: deletedEquipment.serial_number
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_INSTANCE_DELETED', userId, { 
        vendorId, 
        equipmentInstanceId,
        serialNumber: deletedEquipment.serial_number
      });

      DebugLogger.performance('Equipment instance delete', startTime, { vendorId, equipmentInstanceId });
      ApiResponseUtil.success(res, deletedEquipment, 'Equipment instance deleted successfully');

    } catch (error) {
      DebugLogger.error('Error deleting equipment instance', error, { userId: req.user?.userId });
      
      // Check if it's the specific assignment error
      if (error instanceof Error && error.message === 'Cannot delete equipment with active assignments') {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      
      this.logAction('EQUIPMENT_INSTANCE_DELETE_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * POST /api/equipment/:id/assign
   * Assign equipment to client
   */
  assignEquipment = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('POST', `/api/equipment/${req.params.id}/assign`, req.body);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;
      const equipmentInstanceId = parseInt(req.params.id);

      if (userType !== 'vendor') {
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      if (isNaN(equipmentInstanceId)) {
        return ApiResponseUtil.badRequest(res, 'Invalid equipment instance ID');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      const { client_id, unit_cost, total_cost } = req.body;

      // Validation
      if (!client_id || !unit_cost || !total_cost) {
        return ApiResponseUtil.badRequest(res, 'Missing required fields: client_id, unit_cost, total_cost');
      }

      // Generate assignment number
      const assignment_number = await EquipmentRepository.generateAssignmentNumber();

      const assignmentData: AssignEquipmentData = {
        client_id: parseInt(client_id),
        vendor_id: vendorId,
        assignment_number,
        unit_cost: parseFloat(unit_cost),
        total_cost: parseFloat(total_cost)
      };

      DebugLogger.log('Assigning equipment', { vendorId, equipmentInstanceId, assignmentData }, 'EQUIPMENT');

      const assignment = await EquipmentRepository.assignEquipment(equipmentInstanceId, assignmentData);

      DebugLogger.log('Equipment assigned successfully', { 
        vendorId, 
        equipmentInstanceId,
        assignmentId: assignment.assignmentId,
        assignmentNumber: assignment_number
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_ASSIGNED', userId, { 
        vendorId, 
        equipmentInstanceId,
        assignmentId: assignment.assignmentId,
        clientId: client_id
      });

      DebugLogger.performance('Equipment assignment', startTime, { vendorId, equipmentInstanceId });
      ApiResponseUtil.success(res, assignment, 'Equipment assigned successfully', 201);

    } catch (error) {
      DebugLogger.error('Error assigning equipment', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_ASSIGNMENT_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/equipment/clients
   * Get clients for assignment modal
   */
  getClientsForAssignment = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', '/api/equipment/clients', req.query);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      if (userType !== 'vendor') {
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor access required.');
      }

      // Get vendor ID from user ID
      const vendorId = await DashboardRepository.getVendorIdFromUserId(userId);
      if (!vendorId) {
        return ApiResponseUtil.notFound(res, 'Vendor profile not found');
      }

      DebugLogger.log('Fetching clients for assignment', { vendorId }, 'EQUIPMENT');

      const clients = await EquipmentRepository.getClientsForAssignment(vendorId);

      DebugLogger.log('Clients for assignment retrieved successfully', { 
        vendorId, 
        count: clients.length 
      }, 'EQUIPMENT');
      
      this.logAction('EQUIPMENT_CLIENTS_ACCESSED', userId, { vendorId });

      DebugLogger.performance('Clients for assignment fetch', startTime, { vendorId, count: clients.length });
      ApiResponseUtil.success(res, clients, 'Clients retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting clients for assignment', error, { userId: req.user?.userId });
      this.logAction('EQUIPMENT_CLIENTS_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * POST /api/equipment/types
   * Create new equipment type
   */
  createEquipmentType = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('POST', '/api/equipment/types', req.body);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      if (userType !== 'vendor' && userType !== 'admin') {
        DebugLogger.error('Unauthorized user attempted to create equipment type', { userId, userType });
        return ApiResponseUtil.forbidden(res, 'Access denied. Vendor or Admin access required.');
      }

      // Get vendor ID from user ID (only for vendor users)
      let vendorId: number;
      if (userType === 'vendor') {
        const vendorIdFromUser = await DashboardRepository.getVendorIdFromUserId(userId);
        if (!vendorIdFromUser) {
          return ApiResponseUtil.notFound(res, 'Vendor profile not found');
        }
        vendorId = vendorIdFromUser;
      } else {
        // For admin users, vendor_id should be provided in request body or default to some logic
        return ApiResponseUtil.badRequest(res, 'Admin equipment type creation not yet implemented');
      }

      const {
        equipment_code,
        equipment_name,
        description,
        equipment_type,
        manufacturer,
        model,
        specifications,
        weight_kg,
        dimensions,
        warranty_years,
        default_lifespan_years
      } = req.body;

      // Validate required fields
      if (!equipment_name || !equipment_type || !manufacturer || !model) {
        return ApiResponseUtil.badRequest(res, 'Missing required fields: equipment_name, equipment_type, manufacturer, model');
      }

      const equipmentTypeData: CreateEquipmentTypeData = {
        vendor_id: vendorId,
        equipment_code,
        equipment_name,
        description,
        equipment_type,
        manufacturer,
        model,
        specifications,
        weight_kg: weight_kg ? parseFloat(weight_kg) : undefined,
        dimensions,
        warranty_years: warranty_years ? parseInt(warranty_years) : undefined,
        default_lifespan_years: default_lifespan_years ? parseInt(default_lifespan_years) : undefined
      };

      const newEquipmentType = await EquipmentRepository.createEquipmentType(equipmentTypeData);

      this.logAction('EQUIPMENT_TYPE_CREATED', userId, { 
        equipmentTypeId: newEquipmentType.id,
        equipment_code: newEquipmentType.equipment_code 
      });

      DebugLogger.performance('Equipment type creation', startTime, { 
        equipmentTypeId: newEquipmentType.id 
      });
      
      ApiResponseUtil.created(res, newEquipmentType, 'Equipment type created successfully');

    } catch (error) {
      DebugLogger.error('Error creating equipment type', error, { 
        userId: req.user?.userId,
        body: req.body 
      });
      
      this.logAction('EQUIPMENT_TYPE_CREATE_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Handle specific database errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          return ApiResponseUtil.badRequest(res, 'Equipment code already exists');
        }
      }

      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * PUT /api/equipment/types/:id
   * Update equipment type details (restricted fields)
   */
  updateEquipmentType = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;
    if (!this.requireRole(req, res, ['vendor'])) return;

    const startTime = Date.now();
    const equipmentTypeId = parseInt(req.params.id);
    
    if (!equipmentTypeId || isNaN(equipmentTypeId)) {
      return ApiResponseUtil.badRequest(res, 'Invalid equipment type ID');
    }

    try {
      const {
        equipment_name,
        manufacturer,
        model,
        description,
        warranty_years,
        weight_kg,
        dimensions,
        default_lifespan_years,
        specifications
      } = req.body;

      // Validate required fields
      if (!equipment_name?.trim()) {
        return ApiResponseUtil.badRequest(res, 'Equipment name is required');
      }

      // Get user's vendor ID
      const vendorId = req.user!.vendorId;
      if (!vendorId) {
        return ApiResponseUtil.forbidden(res, 'Vendor access required');
      }

      // Verify the equipment type exists and belongs to the vendor
      const existingEquipmentType = await EquipmentRepository.getEquipmentTypeDetails(equipmentTypeId, vendorId);
      if (!existingEquipmentType) {
        return ApiResponseUtil.notFound(res, 'Equipment type not found');
      }

      // Prepare update data (only allowed fields)
      const updateData = {
        equipment_name: equipment_name.trim(),
        manufacturer: manufacturer?.trim() || null,
        model: model?.trim() || null,
        description: description?.trim() || null,
        warranty_years: warranty_years ? parseInt(warranty_years) : null,
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
        dimensions: dimensions?.trim() || null,
        default_lifespan_years: default_lifespan_years ? parseInt(default_lifespan_years) : null,
        specifications: specifications || null
      };

      // Log the update action
      this.logAction('EQUIPMENT_TYPE_UPDATE', req.user!.userId, { 
        equipmentTypeId,
        vendorId,
        updateData
      });

      // Update the equipment type
      const updatedEquipmentType = await EquipmentRepository.updateEquipmentType(equipmentTypeId, vendorId, updateData);

      DebugLogger.performance('Equipment type update', startTime, { 
        equipmentTypeId,
        vendorId
      });
      
      ApiResponseUtil.success(res, updatedEquipmentType, 'Equipment type updated successfully');

    } catch (error) {
      DebugLogger.error('Error updating equipment type', error, { 
        userId: req.user?.userId,
        equipmentTypeId,
        body: req.body 
      });
      
      this.logAction('EQUIPMENT_TYPE_UPDATE_ERROR', req.user?.userId, { 
        equipmentTypeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return ApiResponseUtil.internalError(res);
    }
  });
}