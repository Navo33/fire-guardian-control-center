import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import MaintenanceTicketRepository, { 
  MaintenanceTicketRepository as MTRepository,
  CreateTicketData, 
  UpdateTicketData, 
  ResolveTicketData, 
  TicketFilters 
} from '../models/MaintenanceTicketRepository';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../types/api';
import { DashboardRepository } from '../models/DashboardRepository';

export class MaintenanceTicketController extends BaseController {

  constructor() {
    super();
    // Bind all methods to preserve 'this' context
    this.getTicketKPIs = this.getTicketKPIs.bind(this);
    this.getTickets = this.getTickets.bind(this);
    this.getClientsForDropdown = this.getClientsForDropdown.bind(this);
    this.getEquipmentForDropdown = this.getEquipmentForDropdown.bind(this);
    this.getTechniciansForDropdown = this.getTechniciansForDropdown.bind(this);
    this.createTicket = this.createTicket.bind(this);
    this.getTicketDetails = this.getTicketDetails.bind(this);
    this.updateTicket = this.updateTicket.bind(this);
    this.resolveTicket = this.resolveTicket.bind(this);
    this.closeTicket = this.closeTicket.bind(this);
    this.getRelatedTickets = this.getRelatedTickets.bind(this);
    this.getEquipmentForClient = this.getEquipmentForClient.bind(this);
  }

  /**
   * Get vendor ID for the authenticated user
   */
  private async getVendorId(req: AuthenticatedRequest): Promise<number | null> {
    if (!req.user || req.user.user_type !== 'vendor') {
      return null;
    }
    return await DashboardRepository.getVendorIdFromUserId(req.user.userId);
  }

  /**
   * Get KPI data for maintenance tickets dashboard
   * GET /api/vendor/tickets/kpis
   */
  async getTicketKPIs(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      const kpis = await MaintenanceTicketRepository.getTicketKPIs(vendorId);
      
      ApiResponseUtil.success(res, kpis, 'KPI data retrieved successfully');
    } catch (error) {
      console.error('Error fetching ticket KPIs:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch KPI data');
    }
  }

  /**
   * Get paginated ticket list with filters
   * GET /api/vendor/tickets
   */
  async getTickets(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      // Parse query parameters
      const filters: TicketFilters = {
        status: req.query.status as string,
        support_type: req.query.support_type as string,
        priority: req.query.priority as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof TicketFilters] === undefined) {
          delete filters[key as keyof TicketFilters];
        }
      });

      const ticketData = await MaintenanceTicketRepository.getTicketList(vendorId, filters);
      
      const response = {
        // Summary statistics
        total_tickets: ticketData.total_tickets,
        open_tickets: ticketData.open_tickets,
        high_priority: ticketData.high_priority,
        resolved_tickets: ticketData.resolved_tickets,
        // Tickets array
        tickets: ticketData.tickets,
        pagination: {
          total: ticketData.tickets.length,
          limit: filters.limit || 25,
          offset: filters.offset || 0,
          hasMore: ticketData.tickets.length >= (filters.limit || 25)
        }
      };
      
      ApiResponseUtil.success(res, response, 'Tickets retrieved successfully');
    } catch (error) {
      console.error('Error fetching tickets:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch tickets');
    }
  }

  /**
   * Get clients for Create Ticket modal dropdown
   * GET /api/vendor/tickets/clients
   */
  getClientsForDropdown = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      const clients = await MaintenanceTicketRepository.getClientsForDropdown(vendorId);
      
      ApiResponseUtil.success(res, clients, 'Clients retrieved successfully');
    } catch (error) {
      console.error('Error fetching clients for dropdown:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch clients');
    }
  });

  /**
   * Get equipment for Create Ticket modal dropdown
   * GET /api/vendor/tickets/equipment
   */
  getEquipmentForDropdown = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      const equipment = await MaintenanceTicketRepository.getEquipmentForDropdown(vendorId);
      
      ApiResponseUtil.success(res, equipment, 'Equipment retrieved successfully');
    } catch (error) {
      console.error('Error fetching equipment for dropdown:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch equipment');
    }
  });

  /**
   * Get technicians for Create Ticket modal dropdown
   * GET /api/vendor/tickets/technicians
   */
  getTechniciansForDropdown = this.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      const technicians = await MaintenanceTicketRepository.getTechniciansForDropdown(vendorId);
      
      ApiResponseUtil.success(res, technicians, 'Technicians retrieved successfully');
    } catch (error) {
      console.error('Error fetching technicians for dropdown:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch technicians');
    }
  });

  /**
   * Create new maintenance ticket
   * POST /api/vendor/tickets
   */
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      // Validate required fields
      const { support_type, issue_description, priority } = req.body;
      
      if (!support_type || !issue_description || !priority) {
        ApiResponseUtil.badRequest(res, 'Support type, issue description, and priority are required');
        return;
      }

      // Validate enum values
      const validSupportTypes = ['maintenance', 'system', 'user'];
      const validPriorities = ['low', 'normal', 'high'];
      
      if (!validSupportTypes.includes(support_type)) {
        ApiResponseUtil.badRequest(res, 'Invalid support type');
        return;
      }
      
      if (!validPriorities.includes(priority)) {
        ApiResponseUtil.badRequest(res, 'Invalid priority');
        return;
      }

      const ticketData: CreateTicketData = {
        equipment_instance_id: req.body.equipment_instance_id ? parseInt(req.body.equipment_instance_id) : undefined,
        client_id: req.body.client_id ? parseInt(req.body.client_id) : undefined,
        support_type,
        issue_description,
        priority,
        scheduled_date: req.body.scheduled_date || undefined,
        assigned_technician: req.body.assigned_technician ? parseInt(req.body.assigned_technician) : undefined
      };

      const result = await MaintenanceTicketRepository.createTicket(vendorId, ticketData);
      
      ApiResponseUtil.created(res, result, 'Ticket created successfully');
    } catch (error) {
      console.error('Error creating ticket:', error);
      if (error instanceof Error) {
        ApiResponseUtil.badRequest(res, error.message);
      } else {
        ApiResponseUtil.internalError(res, 'Failed to create ticket');
      }
    }
  }

  /**
   * Get detailed ticket information
   * GET /api/vendor/tickets/:id
   */
  async getTicketDetails(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      const idParam = req.params.id;
      
      // Check if it's a numeric ID or ticket number
      const isNumericId = /^\d+$/.test(idParam);
      let ticket;
      
      if (isNumericId) {
        // It's a numeric ID, use the old method for backward compatibility
        const ticketId = parseInt(idParam);
        const basicTicket = await MaintenanceTicketRepository.getTicketById(ticketId, vendorId);
        
        if (!basicTicket) {
          ApiResponseUtil.notFound(res, 'Ticket not found');
          return;
        }
        
        // Get detailed information using ticket number
        ticket = await MTRepository.getTicketDetailsByNumber(basicTicket.ticket_number, vendorId);
      } else {
        // It's a ticket number, use directly
        ticket = await MTRepository.getTicketDetailsByNumber(idParam, vendorId);
      }
      
      if (!ticket) {
        ApiResponseUtil.notFound(res, 'Ticket not found');
        return;
      }
      
      ApiResponseUtil.success(res, ticket, 'Ticket details retrieved successfully');
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch ticket details');
    }
  }

  /**
   * Get related tickets for the same client or equipment
   * GET /api/vendor/tickets/:id/related
   */
  async getRelatedTickets(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        ApiResponseUtil.badRequest(res, 'Invalid ticket ID');
        return;
      }

      const relatedTickets = await MaintenanceTicketRepository.getRelatedTickets(ticketId, vendorId);
      
      ApiResponseUtil.success(res, relatedTickets, 'Related tickets retrieved successfully');
    } catch (error) {
      console.error('Error fetching related tickets:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch related tickets');
    }
  }

  /**
   * Update ticket details
   * PUT /api/vendor/tickets/:id
   */
  async updateTicket(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        ApiResponseUtil.badRequest(res, 'Invalid ticket ID');
        return;
      }

      // Validate enum values if provided
      const { ticket_status, priority } = req.body;
      
      if (ticket_status && !['open', 'resolved', 'closed'].includes(ticket_status)) {
        ApiResponseUtil.badRequest(res, 'Invalid ticket status');
        return;
      }
      
      if (priority && !['low', 'normal', 'high'].includes(priority)) {
        ApiResponseUtil.badRequest(res, 'Invalid priority');
        return;
      }

      const updateData: UpdateTicketData = {
        ticket_status: req.body.ticket_status,
        priority: req.body.priority,
        issue_description: req.body.issue_description,
        scheduled_date: req.body.scheduled_date,
        assigned_technician: req.body.assigned_technician ? parseInt(req.body.assigned_technician) : undefined
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof UpdateTicketData] === undefined) {
          delete updateData[key as keyof UpdateTicketData];
        }
      });

      const result = await MaintenanceTicketRepository.updateTicket(ticketId, vendorId, updateData);
      
      ApiResponseUtil.success(res, result, 'Ticket updated successfully');
    } catch (error) {
      console.error('Error updating ticket:', error);
      if (error instanceof Error) {
        ApiResponseUtil.badRequest(res, error.message);
      } else {
        ApiResponseUtil.internalError(res, 'Failed to update ticket');
      }
    }
  }

  /**
   * Resolve ticket with resolution details
   * PUT /api/vendor/tickets/:id/resolve
   */
  async resolveTicket(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        ApiResponseUtil.badRequest(res, 'Invalid ticket ID');
        return;
      }

      const { resolution_description } = req.body;
      
      if (!resolution_description) {
        ApiResponseUtil.badRequest(res, 'Resolution description is required');
        return;
      }

      const resolveData: ResolveTicketData = {
        resolution_description,
        actual_hours: req.body.actual_hours ? parseFloat(req.body.actual_hours) : undefined,
        cost: req.body.cost ? parseFloat(req.body.cost) : undefined
      };

      const result = await MaintenanceTicketRepository.resolveTicket(ticketId, vendorId, resolveData);
      
      ApiResponseUtil.success(res, result, 'Ticket resolved successfully');
    } catch (error) {
      console.error('Error resolving ticket:', error);
      if (error instanceof Error) {
        ApiResponseUtil.badRequest(res, error.message);
      } else {
        ApiResponseUtil.internalError(res, 'Failed to resolve ticket');
      }
    }
  }

  /**
   * Close ticket
   * PUT /api/vendor/tickets/:id/close
   */
  async closeTicket(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }
      
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        ApiResponseUtil.badRequest(res, 'Invalid ticket ID');
        return;
      }

      const result = await MaintenanceTicketRepository.closeTicket(ticketId, vendorId);
      
      ApiResponseUtil.success(res, result, 'Ticket closed successfully');
    } catch (error) {
      console.error('Error closing ticket:', error);
      if (error instanceof Error) {
        ApiResponseUtil.badRequest(res, error.message);
      } else {
        ApiResponseUtil.internalError(res, 'Failed to close ticket');
      }
    }
  }

  /**
   * Get equipment instances for a specific client (for maintenance ticket creation)
   * GET /api/vendor/tickets/equipment/:clientId
   */
  async getEquipmentForClient(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res, 'Vendor access required');
        return;
      }

      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        ApiResponseUtil.badRequest(res, 'Valid client ID is required');
        return;
      }

      const equipment = await MTRepository.getEquipmentForClient(clientId, vendorId);
      
      ApiResponseUtil.success(res, equipment);
    } catch (error) {
      console.error('Error fetching equipment for client:', error);
      if (error instanceof Error) {
        ApiResponseUtil.badRequest(res, error.message);
      } else {
        ApiResponseUtil.internalError(res, 'Failed to fetch equipment');
      }
    }
  }

  /**
   * Delete ticket (not implemented for safety)
   * DELETE /api/vendor/tickets/:id
   */
  async deleteTicket(req: Request, res: Response): Promise<void> {
    res.status(405).json({ error: 'Ticket deletion is not allowed for safety reasons' });
  }
}

export default new MaintenanceTicketController();