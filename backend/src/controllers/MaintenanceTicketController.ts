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
import { emailService } from '../services/emailService';
import { emailRepository } from '../models/EmailRepository';
import { pool } from '../config/database';
import SmsService from '../services/SmsService';
import { SmsMessageType, SmsTemplates } from '../config/sms';

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
    this.sendHighPriorityTicketSms = this.sendHighPriorityTicketSms.bind(this);
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
      
      // Parse total_tickets string to number for pagination
      const totalTickets = parseInt(ticketData.total_tickets) || 0;
      
      const response = {
        // Summary statistics
        total_tickets: ticketData.total_tickets,
        open_tickets: ticketData.open_tickets,
        high_priority: ticketData.high_priority,
        resolved_tickets: ticketData.resolved_tickets,
        // Tickets array
        tickets: ticketData.tickets,
        pagination: {
          total: totalTickets,
          limit: filters.limit || 25,
          offset: filters.offset || 0,
          hasMore: (filters.offset || 0) + ticketData.tickets.length < totalTickets
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

      // Get current user ID for auto-assignment
      const currentUserId = (req as AuthenticatedRequest).user?.userId;
      
      const ticketData: CreateTicketData = {
        equipment_instance_id: req.body.equipment_instance_id ? parseInt(req.body.equipment_instance_id) : undefined,
        client_id: req.body.client_id ? parseInt(req.body.client_id) : undefined,
        support_type,
        issue_description,
        priority,
        scheduled_date: req.body.scheduled_date || undefined,
        // Auto-assign to current vendor user, or use provided technician ID
        assigned_technician: req.body.assigned_technician ? parseInt(req.body.assigned_technician) : currentUserId
      };

      const result = await MaintenanceTicketRepository.createTicket(vendorId, ticketData);
      
      // Send email notification to client
      this.sendTicketCreatedEmail(result.id).catch(err => {
        console.error('Failed to send ticket creation email:', err);
        // Don't fail the request if email fails
      });
      
      // Send SMS for high priority tickets
      if (priority === 'high') {
        this.sendHighPriorityTicketSms(result.id, vendorId, ticketData.client_id).catch((err: any) => {
          console.error('Failed to send high priority SMS:', err);
          // Don't fail the request if SMS fails
        });
      }
      
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

      // Remove undefined values and empty strings
      Object.keys(updateData).forEach(key => {
        const value = updateData[key as keyof UpdateTicketData];
        if (value === undefined || value === '' || value === null) {
          delete updateData[key as keyof UpdateTicketData];
        }
      });

      const result = await MaintenanceTicketRepository.updateTicket(ticketId, vendorId, updateData);
      
      // Send email notification to client for significant updates
      if (updateData.ticket_status || updateData.scheduled_date) {
        this.sendTicketUpdatedEmail(ticketId, req.body.update_reason).catch(err => {
          console.error('Failed to send ticket update email:', err);
          // Don't fail the request if email fails
        });
      }
      
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
      
      const idParam = req.params.id;
      let ticketNumber: string;
      
      // Check if it's a numeric ID or ticket number
      const isNumericId = /^\d+$/.test(idParam);
      
      if (isNumericId) {
        // Convert numeric ID to ticket number by fetching the ticket first
        const ticketId = parseInt(idParam);
        const basicTicket = await MaintenanceTicketRepository.getTicketById(ticketId, vendorId);
        
        if (!basicTicket) {
          ApiResponseUtil.notFound(res, 'Ticket not found');
          return;
        }
        
        ticketNumber = basicTicket.ticket_number;
      } else {
        // Use as ticket number directly
        ticketNumber = idParam;
      }

      const { resolution_description } = req.body;
      
      if (!resolution_description) {
        ApiResponseUtil.badRequest(res, 'Resolution description is required');
        return;
      }

      const resolveData: ResolveTicketData = {
        resolution_description,
        actual_hours: req.body.actual_hours ? parseFloat(req.body.actual_hours) : undefined,
      };

      const result = await MaintenanceTicketRepository.resolveTicket(ticketNumber, vendorId, resolveData);
      
      // Get ticket details for email notification
      const ticketDetails = await MTRepository.getTicketDetailsByNumber(ticketNumber, vendorId);
      if (ticketDetails && ticketDetails.id) {
        this.sendTicketCompletedEmail(ticketDetails.id).catch((err: Error) => {
          console.error('Failed to send ticket completion email:', err);
        });
      }
      
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
      
      // Send closure notification
      this.sendTicketUpdatedEmail(ticketId, 'Ticket has been closed').catch(err => {
        console.error('Failed to send ticket closure email:', err);
      });
      
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

  /**
   * Send ticket created email to client
   * Private helper method
   */
  private async sendTicketCreatedEmail(ticketId: number): Promise<void> {
    try {
      console.log('\n===== SENDING TICKET CREATED EMAILS =====');
      console.log('[Ticket ID]:', ticketId);
      console.log('[Timestamp]:', new Date().toISOString());
      
      // Get ticket details with both client and vendor info
      const query = `
        SELECT 
          mt.id,
          mt.ticket_number,
          mt.issue_description,
          mt.priority,
          mt.ticket_status,
          mt.scheduled_date,
          eq.equipment_name,
          ei.serial_number,
          c.company_name as client_name,
          cu.email as client_email,
          v.company_name as vendor_name,
          vu.email as vendor_email
        FROM maintenance_ticket mt
        LEFT JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
        LEFT JOIN equipment eq ON ei.equipment_id = eq.id
        JOIN clients c ON mt.client_id = c.id
        JOIN "user" cu ON c.user_id = cu.id
        JOIN vendors v ON mt.vendor_id = v.id
        JOIN "user" vu ON v.user_id = vu.id
        WHERE mt.id = $1;
      `;

      const result = await pool.query(query, [ticketId]);
      
      if (result.rows.length === 0) {
        console.warn(`⚠️ Ticket ${ticketId} not found for email notification`);
        return;
      }

      const ticket = result.rows[0];
      console.log('[Ticket Details Retrieved]');
      console.log('   - Ticket #:', ticket.ticket_number);
      console.log('   - Equipment:', ticket.equipment_name);
      console.log('   - Client:', ticket.client_name, '(' + ticket.client_email + ')');
      console.log('   - Vendor:', ticket.vendor_name, '(' + ticket.vendor_email + ')');
      console.log('   - Priority:', ticket.priority);
      console.log('   - Status:', ticket.ticket_status);
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      console.log('\n[Sending email to CLIENT]');
      // Send email to CLIENT
      const clientEmailResult = await emailService.sendMaintenanceTicketCreated({
        to: ticket.client_email,
        clientName: ticket.client_name,
        ticketId: ticketId,
        equipmentName: ticket.equipment_name || 'General Maintenance',
        serialNumber: ticket.serial_number || 'N/A',
        scheduledDate: ticket.scheduled_date 
          ? new Date(ticket.scheduled_date).toLocaleDateString() 
          : 'To be scheduled',
        priority: ticket.priority,
        status: ticket.ticket_status,
        description: ticket.issue_description,
        dashboardUrl: `${frontendUrl}/client/tickets/${ticket.ticket_number}`,
      });

      // Log client email
      await emailRepository.logEmail({
        recipientEmail: ticket.client_email,
        templateType: 'maintenanceTicketCreated',
        subject: `New Maintenance Ticket Created - #${ticketId}`,
        status: clientEmailResult.success ? 'sent' : 'failed',
        messageId: clientEmailResult.messageId,
        errorMessage: clientEmailResult.error,
        metadata: { ticketId, ticketNumber: ticket.ticket_number, recipient: 'client' },
      });
      
      if (clientEmailResult.success) {
        console.log('[SUCCESS] Client email sent successfully');
      } else {
        console.log('[FAILED] Client email failed:', clientEmailResult.error);
      }

      console.log('\n[Sending email to VENDOR]');
      // Send email to VENDOR
      const vendorEmailResult = await emailService.sendMaintenanceTicketCreated({
        to: ticket.vendor_email,
        clientName: ticket.vendor_name,
        ticketId: ticketId,
        equipmentName: ticket.equipment_name || 'General Maintenance',
        serialNumber: ticket.serial_number || 'N/A',
        scheduledDate: ticket.scheduled_date 
          ? new Date(ticket.scheduled_date).toLocaleDateString() 
          : 'To be scheduled',
        priority: ticket.priority,
        status: ticket.ticket_status,
        description: ticket.issue_description,
        dashboardUrl: `${frontendUrl}/vendor/tickets/${ticket.ticket_number}`,
      });

      // Log vendor email
      await emailRepository.logEmail({
        recipientEmail: ticket.vendor_email,
        templateType: 'maintenanceTicketCreated',
        subject: `New Maintenance Ticket Created - #${ticketId}`,
        status: vendorEmailResult.success ? 'sent' : 'failed',
        messageId: vendorEmailResult.messageId,
        errorMessage: vendorEmailResult.error,
        metadata: { ticketId, ticketNumber: ticket.ticket_number, recipient: 'vendor' },
      });
      
      if (vendorEmailResult.success) {
        console.log('[SUCCESS] Vendor email sent successfully');
      } else {
        console.log('[FAILED] Vendor email failed:', vendorEmailResult.error);
      }
      
      console.log('\n[TICKET CREATED EMAIL PROCESS COMPLETED]');
      console.log('   - Client Email:', clientEmailResult.success ? '[SENT]' : '[FAILED]');
      console.log('   - Vendor Email:', vendorEmailResult.success ? '[SENT]' : '[FAILED]');
      console.log('===========================\n');
    } catch (error) {
      console.error('\n[ERROR IN TICKET CREATED EMAIL PROCESS]');
      console.error('[Ticket ID]:', ticketId);
      console.error('[Error]:', error);
      console.error('===========================\n');
      throw error;
    }
  }

  /**
   * Send ticket updated email to client
   * Private helper method
   */
  private async sendTicketUpdatedEmail(ticketId: number, updateReason?: string): Promise<void> {
    console.log('\n===== SENDING TICKET UPDATED EMAILS =====');
    console.log('[Ticket ID]:', ticketId);
    if (updateReason) console.log('[Update Reason]:', updateReason);
    console.log('[Timestamp]:', new Date().toISOString());
    try {
      // Get ticket details with both client and vendor info
      const query = `
        SELECT 
          mt.id,
          mt.ticket_number,
          mt.ticket_status,
          mt.resolved_at as completed_at,
          mt.resolution_description as technician_notes,
          eq.equipment_name,
          c.company_name as client_name,
          cu.email as client_email,
          v.company_name as vendor_name,
          vu.email as vendor_email,
          tech_user.first_name || ' ' || tech_user.last_name as technician_name
        FROM maintenance_ticket mt
        LEFT JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
        LEFT JOIN equipment eq ON ei.equipment_id = eq.id
        JOIN clients c ON mt.client_id = c.id
        JOIN "user" cu ON c.user_id = cu.id
        JOIN vendors v ON mt.vendor_id = v.id
        JOIN "user" vu ON v.user_id = vu.id
        LEFT JOIN "user" tech_user ON mt.assigned_technician = tech_user.id
        WHERE mt.id = $1;
      `;

      const result = await pool.query(query, [ticketId]);
      
      if (result.rows.length === 0) {
        console.warn(`Ticket ${ticketId} not found for email notification`);
        return;
      }

      const ticket = result.rows[0];
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Send emails to both CLIENT and VENDOR
      const isCompleted = ticket.ticket_status === 'resolved' && ticket.completed_at;
      
      // Send to CLIENT
      let clientEmailResult;
      if (isCompleted) {
        clientEmailResult = await emailService.sendMaintenanceCompleted({
          to: ticket.client_email,
          clientName: ticket.client_name,
          ticketId: ticketId,
          equipmentName: ticket.equipment_name || 'General Maintenance',
          completedDate: new Date(ticket.completed_at).toLocaleDateString(),
          technicianName: ticket.technician_name || 'Service Team',
          technicianNotes: ticket.technician_notes,
          complianceStatus: 'Compliant',
          nextMaintenanceDate: 'To be determined',
          dashboardUrl: `${frontendUrl}/client/tickets/${ticket.ticket_number}`,
        });
      } else {
        clientEmailResult = await emailService.sendMaintenanceTicketUpdated({
          to: ticket.client_email,
          clientName: ticket.client_name,
          ticketId: ticketId,
          equipmentName: ticket.equipment_name || 'General Maintenance',
          status: ticket.ticket_status,
          completedDate: ticket.completed_at ? new Date(ticket.completed_at).toLocaleDateString() : undefined,
          technicianName: ticket.technician_name,
          technicianNotes: ticket.technician_notes,
          updateReason: updateReason,
          dashboardUrl: `${frontendUrl}/client/tickets/${ticket.ticket_number}`,
        });
      }

      // Log client email
      await emailRepository.logEmail({
        recipientEmail: ticket.client_email,
        templateType: isCompleted ? 'maintenanceCompleted' : 'maintenanceTicketUpdated',
        subject: `Maintenance Ticket Updated - #${ticketId}`,
        status: clientEmailResult.success ? 'sent' : 'failed',
        messageId: clientEmailResult.messageId,
        errorMessage: clientEmailResult.error,
        metadata: { ticketId, ticketNumber: ticket.ticket_number, recipient: 'client' },
      });

      // Send to VENDOR
      let vendorEmailResult;
      if (isCompleted) {
        vendorEmailResult = await emailService.sendMaintenanceCompleted({
          to: ticket.vendor_email,
          clientName: ticket.vendor_name,
          ticketId: ticketId,
          equipmentName: ticket.equipment_name || 'General Maintenance',
          completedDate: new Date(ticket.completed_at).toLocaleDateString(),
          technicianName: ticket.technician_name || 'Service Team',
          technicianNotes: ticket.technician_notes,
          complianceStatus: 'Compliant',
          nextMaintenanceDate: 'To be determined',
          dashboardUrl: `${frontendUrl}/vendor/tickets/${ticket.ticket_number}`,
        });
      } else {
        vendorEmailResult = await emailService.sendMaintenanceTicketUpdated({
          to: ticket.vendor_email,
          clientName: ticket.vendor_name,
          ticketId: ticketId,
          equipmentName: ticket.equipment_name || 'General Maintenance',
          status: ticket.ticket_status,
          completedDate: ticket.completed_at ? new Date(ticket.completed_at).toLocaleDateString() : undefined,
          technicianName: ticket.technician_name,
          technicianNotes: ticket.technician_notes,
          updateReason: updateReason,
          dashboardUrl: `${frontendUrl}/vendor/tickets/${ticket.ticket_number}`,
        });
      }

      // Log vendor email
      await emailRepository.logEmail({
        recipientEmail: ticket.vendor_email,
        templateType: isCompleted ? 'maintenanceCompleted' : 'maintenanceTicketUpdated',
        subject: `Maintenance Ticket Updated - #${ticketId}`,
        status: vendorEmailResult.success ? 'sent' : 'failed',
        messageId: vendorEmailResult.messageId,
        errorMessage: vendorEmailResult.error,
        metadata: { ticketId, ticketNumber: ticket.ticket_number, recipient: 'vendor' },
      });
    } catch (error) {
      console.error('Error sending ticket updated email:', error);
      throw error;
    }
  }

  /**
   * Send ticket completion email to client and vendor
   * Private helper method
   */
  private async sendTicketCompletedEmail(ticketId: number): Promise<void> {
    try {
      console.log('\n===== SENDING TICKET COMPLETED EMAILS =====');
      console.log('[Ticket ID]:', ticketId);
      console.log('[Timestamp]:', new Date().toISOString());
      
      // Get ticket details with completion info
      const query = `
        SELECT 
          mt.id,
          mt.ticket_number,
          mt.ticket_status,
          mt.resolved_at as completed_at,
          mt.resolution_description as technician_notes,
          eq.equipment_name,
          c.company_name as client_name,
          cu.email as client_email,
          v.company_name as vendor_name,
          vu.email as vendor_email,
          tech_user.first_name || ' ' || tech_user.last_name as technician_name
        FROM maintenance_ticket mt
        LEFT JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
        LEFT JOIN equipment eq ON ei.equipment_id = eq.id
        JOIN clients c ON mt.client_id = c.id
        JOIN "user" cu ON c.user_id = cu.id
        JOIN vendors v ON mt.vendor_id = v.id
        JOIN "user" vu ON v.user_id = vu.id
        LEFT JOIN "user" tech_user ON mt.assigned_technician = tech_user.id
        WHERE mt.id = $1;
      `;

      const result = await pool.query(query, [ticketId]);
      
      if (result.rows.length === 0) {
        console.warn('[WARNING] Ticket', ticketId, 'not found for completion email');
        return;
      }

      const ticket = result.rows[0];
      console.log('[Ticket Completion Details]');
      console.log('   - Ticket #:', ticket.ticket_number);
      console.log('   - Equipment:', ticket.equipment_name);
      console.log('   - Status:', ticket.ticket_status);
      console.log('   - Technician:', ticket.technician_name);
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      console.log('\n[Sending completion email to CLIENT]');
      // Send completion email to CLIENT
      const clientEmailResult = await emailService.sendMaintenanceCompleted({
        to: ticket.client_email,
        clientName: ticket.client_name,
        ticketId: ticketId,
        equipmentName: ticket.equipment_name || 'Equipment',
        completedDate: ticket.completed_at 
          ? new Date(ticket.completed_at).toLocaleDateString() 
          : new Date().toLocaleDateString(),
        technicianName: ticket.technician_name || 'Service Team',
        technicianNotes: ticket.technician_notes,
        complianceStatus: 'Compliant',
        nextMaintenanceDate: 'To be scheduled',
        dashboardUrl: `${frontendUrl}/service-requests`,
      });

      await emailRepository.logEmail({
        recipientEmail: ticket.client_email,
        templateType: 'maintenanceCompleted',
        subject: `Service Request Completed - #${ticketId}`,
        status: clientEmailResult.success ? 'sent' : 'failed',
        messageId: clientEmailResult.messageId,
        errorMessage: clientEmailResult.error,
        metadata: { ticketId, ticketNumber: ticket.ticket_number, recipient: 'client' },
      });
      
      if (clientEmailResult.success) {
        console.log('[SUCCESS] Client completion email sent');
      } else {
        console.log('[FAILED] Client completion email failed:', clientEmailResult.error);
      }

      console.log('\n[Sending completion email to VENDOR]');
      // Send completion email to VENDOR
      const vendorEmailResult = await emailService.sendMaintenanceCompleted({
        to: ticket.vendor_email,
        clientName: ticket.vendor_name,
        ticketId: ticketId,
        equipmentName: ticket.equipment_name || 'Equipment',
        completedDate: ticket.completed_at 
          ? new Date(ticket.completed_at).toLocaleDateString() 
          : new Date().toLocaleDateString(),
        technicianName: ticket.technician_name || 'Service Team',
        technicianNotes: ticket.technician_notes,
        complianceStatus: 'Compliant',
        nextMaintenanceDate: 'To be scheduled',
        dashboardUrl: `${frontendUrl}/vendors/tickets`,
      });

      await emailRepository.logEmail({
        recipientEmail: ticket.vendor_email,
        templateType: 'maintenanceCompleted',
        subject: `Service Request Completed - #${ticketId}`,
        status: vendorEmailResult.success ? 'sent' : 'failed',
        messageId: vendorEmailResult.messageId,
        errorMessage: vendorEmailResult.error,
        metadata: { ticketId, ticketNumber: ticket.ticket_number, recipient: 'vendor' },
      });
      
      if (vendorEmailResult.success) {
        console.log('[SUCCESS] Vendor completion email sent');
      } else {
        console.log('[FAILED] Vendor completion email failed:', vendorEmailResult.error);
      }
      
      console.log('\n[TICKET COMPLETED EMAIL PROCESS FINISHED]');
      console.log('   - Client Email:', clientEmailResult.success ? '[SENT]' : '[FAILED]');
      console.log('   - Vendor Email:', vendorEmailResult.success ? '[SENT]' : '[FAILED]');
      console.log('===========================\n');
    } catch (error) {
      console.error('\n[ERROR IN TICKET COMPLETED EMAIL PROCESS]');
      console.error('[Ticket ID]:', ticketId);
      console.error('[Error]:', error);
      console.error('===========================\n');
      throw error;
    }
  }

  /**
   * Send SMS for high priority tickets
   * Private helper method
   */
  private async sendHighPriorityTicketSms(ticketId: number, vendorId: number, clientId?: number): Promise<void> {
    try {
      console.log('\n===== SENDING HIGH PRIORITY TICKET SMS =====');
      console.log('[Ticket ID]:', ticketId);
      console.log('[Timestamp]:', new Date().toISOString());
      
      // Get ticket details with phone numbers
      const query = `
        SELECT 
          mt.id,
          mt.ticket_number,
          eq.equipment_name,
          c.company_name as client_name,
          cu.id as client_user_id,
          cu.phone as client_phone,
          v.company_name as vendor_name,
          vu.id as vendor_user_id,
          vu.phone as vendor_phone
        FROM maintenance_ticket mt
        LEFT JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
        LEFT JOIN equipment eq ON ei.equipment_id = eq.id
        JOIN clients c ON mt.client_id = c.id
        JOIN "user" cu ON c.user_id = cu.id
        JOIN vendors v ON mt.vendor_id = v.id
        JOIN "user" vu ON v.user_id = vu.id
        WHERE mt.id = $1;
      `;

      const result = await pool.query(query, [ticketId]);
      
      if (result.rows.length === 0) {
        console.warn(`⚠️ Ticket ${ticketId} not found for SMS notification`);
        return;
      }

      const ticket = result.rows[0];
      console.log('[Ticket Details Retrieved]');
      console.log('   - Ticket #:', ticket.ticket_number);
      console.log('   - Equipment:', ticket.equipment_name);
      console.log('   - Client Phone:', ticket.client_phone || 'N/A');
      console.log('   - Vendor Phone:', ticket.vendor_phone || 'N/A');
      
      // Prepare recipients
      const recipients: any[] = [];
      if (ticket.client_user_id && ticket.client_phone) {
        recipients.push({
          userId: ticket.client_user_id,
          phoneNumber: ticket.client_phone,
          userType: 'client',
        });
      }
      if (ticket.vendor_user_id && ticket.vendor_phone) {
        recipients.push({
          userId: ticket.vendor_user_id,
          phoneNumber: ticket.vendor_phone,
          userType: 'vendor',
        });
      }

      if (recipients.length === 0) {
        console.log('[SKIPPED] No phone numbers available');
        return;
      }

      // Generate message
      const equipmentName = ticket.equipment_name || 'equipment';
      const message = SmsTemplates[SmsMessageType.HIGH_PRIORITY_TICKET](
        ticket.ticket_number,
        equipmentName
      );

      console.log('[Message]:', message);
      console.log('[Recipients]:', recipients.length);
      
      // Send SMS
      const smsResult = await SmsService.sendSms(
        recipients,
        message,
        SmsMessageType.HIGH_PRIORITY_TICKET,
        'ticket',
        ticketId
      );
      
      if (smsResult.success) {
        console.log('[SUCCESS] SMS sent to', smsResult.recipientCount, 'recipient(s)');
      } else {
        console.log('[FAILED] SMS sending failed:', smsResult.statusMessage);
      }
      
      console.log('===========================\n');
    } catch (error) {
      console.error('\n[ERROR IN HIGH PRIORITY SMS PROCESS]');
      console.error('[Ticket ID]:', ticketId);
      console.error('[Error]:', error);
      console.error('===========================\n');
      throw error;
    }
  }
}

export default new MaintenanceTicketController();