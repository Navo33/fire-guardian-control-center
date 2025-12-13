import { Router } from 'express';
import { authenticateToken, requireVendorOrAdmin } from '../middleware/auth';
import MaintenanceTicketController from '../controllers/MaintenanceTicketController';
import { body, param, query } from 'express-validator';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);
router.use(requireVendorOrAdmin);

/**
 * Validation middleware
 */
const validateTicketId = [
  param('id').isInt({ min: 1 }).withMessage('Ticket ID must be a positive integer')
];

const validateTicketIdOrNumber = [
  param('id')
    .custom((value) => {
      // Accept either numeric ID or ticket number format (TKT-YYYYMMDD-XXX)
      const isNumeric = /^\d+$/.test(value);
      const isTicketNumber = /^TKT-\d{8}-\d{3}$/.test(value);
      
      if (!isNumeric && !isTicketNumber) {
        throw new Error('ID must be a numeric ticket ID or ticket number (TKT-YYYYMMDD-XXX)');
      }
      
      return true;
    })
];

const validateCreateTicket = [
  body('support_type')
    .isIn(['maintenance', 'system', 'user'])
    .withMessage('Support type must be one of: maintenance, system, user'),
  body('issue_description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Issue description must be between 10 and 1000 characters'),
  body('priority')
    .isIn(['low', 'normal', 'high'])
    .withMessage('Priority must be one of: low, normal, high'),
  body('equipment_instance_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Equipment instance ID must be a positive integer'),
  body('client_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Client ID must be a positive integer'),
  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('assigned_technician')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Assigned technician must be a positive integer')
];

const validateUpdateTicket = [
  body('ticket_status')
    .optional()
    .isIn(['open', 'resolved', 'closed'])
    .withMessage('Ticket status must be one of: open, resolved, closed'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high'])
    .withMessage('Priority must be one of: low, normal, high'),
  body('issue_description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Issue description must be between 10 and 1000 characters'),
  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('assigned_technician')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Assigned technician must be a positive integer')
];

const validateResolveTicket = [
  body('resolution_description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Resolution description must be between 10 and 1000 characters'),
  body('actual_hours')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('Actual hours must be between 0 and 999.99'),
  body('cost')
    .optional()
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Cost must be between 0 and 999999.99')
];

const validateTicketFilters = [
  query('status')
    .optional()
    .isIn(['open', 'resolved', 'closed'])
    .withMessage('Status must be one of: open, resolved, closed'),
  query('support_type')
    .optional()
    .isIn(['maintenance', 'system', 'user'])
    .withMessage('Support type must be one of: maintenance, system, user'),
  query('priority')
    .optional()
    .isIn(['low', 'normal', 'high'])
    .withMessage('Priority must be one of: low, normal, high'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search term must be at most 255 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative')
];

/**
 * Routes
 */

// GET /api/vendor/tickets/kpis - Get KPI data for dashboard
router.get('/kpis', MaintenanceTicketController.getTicketKPIs);

// GET /api/vendor/tickets/clients - Get clients for dropdown
router.get('/clients', MaintenanceTicketController.getClientsForDropdown);

// GET /api/vendor/tickets/equipment - Get equipment for dropdown
router.get('/equipment', MaintenanceTicketController.getEquipmentForDropdown);

// GET /api/vendor/tickets/equipment/:clientId - Get equipment for specific client
router.get('/equipment/:clientId', param('clientId').isInt({ min: 1 }), MaintenanceTicketController.getEquipmentForClient);

// GET /api/vendor/tickets/technicians - Get technicians for dropdown
router.get('/technicians', MaintenanceTicketController.getTechniciansForDropdown);

// GET /api/vendor/tickets - Get paginated ticket list with filters
router.get('/', validateTicketFilters, MaintenanceTicketController.getTickets);

// POST /api/vendor/tickets - Create new ticket
router.post('/', validateCreateTicket, MaintenanceTicketController.createTicket);

// GET /api/vendor/tickets/:id - Get ticket details
router.get('/:id', validateTicketId, MaintenanceTicketController.getTicketDetails);

// GET /api/vendor/tickets/:id/related - Get related tickets
router.get('/:id/related', validateTicketId, MaintenanceTicketController.getRelatedTickets);

// PUT /api/vendor/tickets/:id - Update ticket
router.put('/:id', validateTicketId, validateUpdateTicket, MaintenanceTicketController.updateTicket);

// PUT /api/vendor/tickets/:id/resolve - Resolve ticket
router.put('/:id/resolve', validateTicketIdOrNumber, validateResolveTicket, MaintenanceTicketController.resolveTicket);

// PUT /api/vendor/tickets/:id/close - Close ticket
router.put('/:id/close', validateTicketId, MaintenanceTicketController.closeTicket);

// DELETE /api/vendor/tickets/:id - Delete ticket (disabled for safety)
router.delete('/:id', validateTicketId, MaintenanceTicketController.deleteTicket);

export default router;