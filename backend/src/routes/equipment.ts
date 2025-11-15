import express from 'express';
import { EquipmentController } from '../controllers/EquipmentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const equipmentController = new EquipmentController();

/**
 * Equipment Routes
 * All routes require authentication and vendor role
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/equipment
 * @desc Get equipment list with filtering and pagination
 * @access Vendor
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 25)
 * @query status - Filter by status (active, inactive, maintenance)
 * @query compliance_status - Filter by compliance (compliant, non-compliant, expired)
 * @query search - Search by serial number, location, or notes
 */
router.get('/', equipmentController.getEquipmentList);

/**
 * @route GET /api/equipment/types
 * @desc Get equipment types for dropdown
 * @access Vendor
 */
router.get('/types', equipmentController.getEquipmentTypes);

/**
 * @route POST /api/equipment/types
 * @desc Create new equipment type
 * @access Vendor/Admin
 * @body equipment_code - Unique equipment code
 * @body equipment_name - Name of the equipment
 * @body equipment_type - Category type
 * @body manufacturer - Equipment manufacturer
 * @body model - Equipment model
 * @body description - Optional description
 * @body specifications - JSON specifications object
 * @body weight_kg - Weight in kilograms
 * @body dimensions - Physical dimensions
 * @body warranty_years - Warranty period
 * @body default_lifespan_years - Default lifespan
 */
router.post('/types', equipmentController.createEquipmentType);

/**
 * @route GET /api/equipment/stats
 * @desc Get aggregated equipment statistics for management page
 * @access Vendor/Admin
 */
router.get('/stats', equipmentController.getEquipmentStats);

/**
 * @route GET /api/equipment/clients
 * @desc Get clients for assignment modal
 * @access Vendor
 */
router.get('/clients', equipmentController.getClientsForAssignment);

/**
 * @route POST /api/equipment/assign
 * @desc Assign equipment instances to a client
 * @access Vendor
 * @body client_id - Client user ID
 * @body equipment_instances - Array of instance IDs
 * @body assignment_date - Assignment date
 * @body notes - Assignment notes (optional)
 */
router.post('/assign', equipmentController.bulkAssignEquipment);

/**
 * @route DELETE /api/equipment/:id/remove-assignment
 * @desc Remove equipment assignment from client
 * @access Vendor
 */
router.delete('/:id/remove-assignment', equipmentController.removeEquipmentAssignment);

/**
 * @route POST /api/equipment
 * @desc Add new equipment instance
 * @access Vendor
 * @body equipment_id - Equipment type ID
 * @body serial_number - Unique serial number
 * @body purchase_date - Purchase date
 * @body warranty_expiry - Warranty expiry date (optional)
 * @body maintenance_interval_days - Maintenance interval (default: 365)
 * @body location - Equipment location (optional)
 * @body notes - Additional notes (optional)
 */
router.post('/', equipmentController.addEquipmentInstance);

/**
 * @route GET /api/equipment/:id
 * @desc Get equipment type details with comprehensive metrics
 * @access Vendor/Admin
 * @param id - Equipment type ID
 */
router.get('/:id', equipmentController.getEquipmentDetails);

/**
 * @route PUT /api/equipment/:id
 * @desc Update equipment instance
 * @access Vendor
 * @param id - Equipment instance ID
 * @body status - Equipment status (optional)
 * @body next_maintenance_date - Next maintenance date (optional)
 * @body location - Equipment location (optional)
 * @body notes - Additional notes (optional)
 */
router.put('/:id', equipmentController.updateEquipmentInstance);

/**
 * @route DELETE /api/equipment/:id
 * @desc Soft delete equipment instance
 * @access Vendor
 * @param id - Equipment instance ID
 */
router.delete('/:id', equipmentController.deleteEquipmentInstance);

/**
 * @route GET /api/equipment/:id/related
 * @desc Get related equipment instances
 * @access Vendor
 * @param id - Equipment instance ID
 */
router.get('/:id/related', equipmentController.getRelatedEquipment);

/**
 * @route GET /api/equipment/:id/assignments
 * @desc Get assignment history for equipment
 * @access Vendor
 * @param id - Equipment instance ID
 */
router.get('/:id/assignments', equipmentController.getAssignmentHistory);

/**
 * @route GET /api/equipment/:id/maintenance
 * @desc Get maintenance history for equipment
 * @access Vendor
 * @param id - Equipment instance ID
 */
router.get('/:id/maintenance', equipmentController.getMaintenanceHistory);

/**
 * @route POST /api/equipment/:id/assign
 * @desc Assign equipment to client
 * @access Vendor
 * @param id - Equipment instance ID
 * @body client_id - Client ID to assign to
 * @body unit_cost - Unit cost for assignment
 * @body total_cost - Total cost for assignment
 */
router.post('/:id/assign', equipmentController.assignEquipment);

export default router;