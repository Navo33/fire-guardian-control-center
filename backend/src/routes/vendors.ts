import { Router } from 'express';
import { body } from 'express-validator';
import { VendorController } from '../controllers/VendorController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const vendorController = new VendorController();

/**
 * Apply authentication middleware to all vendor routes
 * Only super_admin and vendors can access these routes
 */
router.use(authenticateToken);

/**
 * @route   GET /api/vendors/specializations
 * @desc    Get all available specializations for filter dropdown
 * @access  Private (super_admin only)
 */
router.get('/specializations', vendorController.getSpecializations);

/**
 * @route   GET /api/vendors
 * @desc    Get paginated list of vendors with optional filters
 * @access  Private (super_admin, vendor)
 * @query   page, limit, sort, order, search, status, specialization
 */
router.get('/', vendorController.getVendors);

/**
 * @route   POST /api/vendors
 * @desc    Create a new vendor with detailed information
 * @access  Private (super_admin only)
 * @body    CreateVendorRequest schema
 */
router.post('/', 
  [
    // Company Information
    body('companyName')
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Company name must be between 2 and 200 characters'),
    
    body('businessType')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Business type is required'),
      
    body('licenseNumber')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('License number must be less than 100 characters'),
      
    body('taxId')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Tax ID must be less than 100 characters'),
    
    // Contact Information
    body('contactPersonName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Contact person name is required and must be between 2 and 100 characters'),
    
    body('contactTitle')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Contact title must be less than 100 characters'),
      
    body('primaryEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid primary email is required'),
      
    body('secondaryEmail')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Secondary email must be valid if provided'),
      
    body('primaryPhone')
      .trim()
      .isLength({ min: 10, max: 20 })
      .withMessage('Primary phone number is required'),
      
    body('secondaryPhone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Secondary phone must be less than 20 characters'),
    
    // Address Information
    body('streetAddress')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Street address is required and must be between 5 and 500 characters'),
      
    body('city')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('City is required'),
      
    body('state')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('State is required'),
      
    body('zipCode')
      .trim()
      .isLength({ min: 5, max: 20 })
      .withMessage('Valid ZIP code is required'),
      
    body('country')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Country is required'),
    
    // Business Details
    body('website')
      .optional()
      .isURL()
      .withMessage('Website must be a valid URL if provided'),
      
    body('yearsInBusiness')
      .optional()
      .isInt({ min: 0, max: 200 })
      .withMessage('Years in business must be a valid number'),
      
    body('employeeCount')
      .optional()
      .isInt({ min: 1, max: 100000 })
      .withMessage('Employee count must be a valid number'),
      
    body('serviceAreas')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Service areas must be less than 1000 characters'),
    
    // Specializations
    body('specializations')
      .isArray({ min: 1 })
      .withMessage('At least one specialization is required'),
      
    body('specializations.*')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each specialization must be valid'),
      
    body('certifications')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Certifications must be less than 1000 characters'),
      
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters')
  ],
  vendorController.createVendor
);

/**
 * @route   GET /api/vendors/:id
 * @desc    Get vendor details by ID
 * @access  Private (super_admin, vendor owns the record)
 * @params  id
 */
router.get('/:id', vendorController.getVendorById);

/**
 * @route   PUT /api/vendors/:id
 * @desc    Update vendor information
 * @access  Private (super_admin, vendor owns the record)
 * @params  id
 * @body    first_name?, last_name?, email?
 */
router.put('/:id',
  [
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be between 1 and 100 characters'),
    
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be between 1 and 100 characters'),
      
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format')
  ],
  vendorController.updateVendor
);

/**
 * @route   DELETE /api/vendors/:id
 * @desc    Soft delete vendor
 * @access  Private (super_admin only)
 * @params  id
 */
router.delete('/:id', vendorController.deleteVendor);

/**
 * @route   GET /api/vendors/:id/stats
 * @desc    Get vendor statistics (equipment, clients, locations, etc.)
 * @access  Private (super_admin, vendor owns the record)
 * @params  id
 */
router.get('/:id/stats', vendorController.getVendorStats);

/**
 * @route   GET /api/vendors/:id/equipment
 * @desc    Get all equipment for a specific vendor
 * @access  Private (super_admin only)
 * @params  id
 */
router.get('/:id/equipment', vendorController.getVendorEquipment);

export default router;