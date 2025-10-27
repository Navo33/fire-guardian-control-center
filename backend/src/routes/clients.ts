import { Router } from 'express';
import { ClientController } from '../controllers/ClientController';
import { ClientRepository } from '../models/ClientRepository';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/database';

const router = Router();

// Initialize repository and controller
const clientRepository = new ClientRepository(pool);
const clientController = new ClientController(clientRepository);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/vendor/clients/kpis
 * @desc    Get KPI data for vendor's clients (Total, Active, Compliance)
 * @access  Vendor only
 */
router.get('/kpis', clientController.getClientKPIs);

/**
 * @route   GET /api/vendor/clients
 * @desc    Get paginated list of clients for the vendor
 * @access  Vendor only
 * @query   status, search, page, limit
 */
router.get('/', clientController.getClientList);

/**
 * @route   GET /api/vendor/clients/:id
 * @desc    Get detailed information for a specific client
 * @access  Vendor only (own clients)
 */
router.get('/:id', clientController.getClientDetails);

/**
 * @route   GET /api/vendor/clients/:id/equipment
 * @desc    Get equipment assigned to a specific client
 * @access  Vendor only (own clients)
 */
router.get('/:id/equipment', clientController.getClientEquipment);

/**
 * @route   GET /api/vendor/clients/:id/maintenance
 * @desc    Get maintenance history for a specific client
 * @access  Vendor only (own clients)
 */
router.get('/:id/maintenance', clientController.getClientMaintenanceHistory);

/**
 * @route   POST /api/vendor/clients
 * @desc    Create a new client
 * @access  Vendor only
 * @body    first_name, last_name, email, password, phone, company_name, business_type, primary_phone, street_address, city, zip_code
 */
router.post('/', clientController.createClient);

/**
 * @route   PUT /api/vendor/clients/:id
 * @desc    Update client information
 * @access  Vendor only (own clients)
 * @body    Optional fields to update
 */
router.put('/:id', clientController.updateClient);

/**
 * @route   DELETE /api/vendor/clients/:id
 * @desc    Soft delete a client
 * @access  Vendor only (own clients)
 */
router.delete('/:id', clientController.deleteClient);

export default router;