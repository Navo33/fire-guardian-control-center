import { Router } from 'express';
import { pool } from '../config/database';
import { VendorAnalyticsRepository } from '../models/VendorAnalyticsRepository';
import { VendorAnalyticsController } from '../controllers/VendorAnalyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Initialize repository and controller
const vendorAnalyticsRepo = new VendorAnalyticsRepository(pool);
const vendorAnalyticsController = new VendorAnalyticsController(vendorAnalyticsRepo);

/**
 * Vendor Analytics Routes
 * All routes require authentication and vendor-specific access
 * Base path: /api/vendor/
 */

// Vendor Overview Section
router.get('/overview', authenticateToken, (req, res) => {
  vendorAnalyticsController.getVendorOverview(req, res);
});

// Compliance Analytics Section
router.get('/compliance/by-client', authenticateToken, (req, res) => {
  vendorAnalyticsController.getComplianceByClient(req, res);
});

router.get('/compliance/trend', authenticateToken, (req, res) => {
  vendorAnalyticsController.getComplianceTrend(req, res);
});

// Tickets & Maintenance Section
router.get('/tickets/trend', authenticateToken, (req, res) => {
  vendorAnalyticsController.getTicketTrends(req, res);
});

router.get('/tickets/by-type', authenticateToken, (req, res) => {
  vendorAnalyticsController.getTicketsByType(req, res);
});

// Client Performance Section
router.get('/clients/ranking', authenticateToken, (req, res) => {
  vendorAnalyticsController.getClientRankings(req, res);
});

router.get('/clients/dropdown', authenticateToken, (req, res) => {
  vendorAnalyticsController.getClientsForDropdown(req, res);
});

// Equipment Trends Section
router.get('/equipment/categories', authenticateToken, (req, res) => {
  vendorAnalyticsController.getEquipmentCategories(req, res);
});

router.get('/equipment/high-risk', authenticateToken, (req, res) => {
  vendorAnalyticsController.getHighRiskEquipment(req, res);
});

router.get('/equipment/types', authenticateToken, (req, res) => {
  vendorAnalyticsController.getEquipmentTypesForDropdown(req, res);
});

// User & Security Section (Vendor Staff)
router.get('/users/technicians', authenticateToken, (req, res) => {
  vendorAnalyticsController.getTechnicianPerformance(req, res);
});

router.get('/users/logins', authenticateToken, (req, res) => {
  vendorAnalyticsController.getUserLoginTrends(req, res);
});

router.get('/users/resets', authenticateToken, (req, res) => {
  vendorAnalyticsController.getPasswordResets(req, res);
});

// Audit Section
router.get('/audit/recent', authenticateToken, (req, res) => {
  vendorAnalyticsController.getRecentVendorAudits(req, res);
});

export default router;