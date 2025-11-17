import { Router } from 'express';
import { ClientAnalyticsController } from '../controllers/ClientAnalyticsController';
import { ClientAnalyticsRepository } from '../models/ClientAnalyticsRepository';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/database';

const router = Router();

// Create repository and controller instances
const clientAnalyticsRepo = new ClientAnalyticsRepository(pool);
const clientAnalyticsController = new ClientAnalyticsController(clientAnalyticsRepo);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Client Analytics API Routes
 * All routes are client-scoped and require client_id parameter
 */

// Overview and KPIs
router.get('/overview', clientAnalyticsController.getOverview.bind(clientAnalyticsController));

// Equipment Analytics
router.get('/equipment/status', clientAnalyticsController.getEquipmentStatus.bind(clientAnalyticsController));
router.get('/equipment/non-compliant', clientAnalyticsController.getNonCompliantEquipment.bind(clientAnalyticsController));

// Compliance Analytics
router.get('/compliance/trend', clientAnalyticsController.getComplianceTrend.bind(clientAnalyticsController));
router.get('/compliance/by-type', clientAnalyticsController.getComplianceByType.bind(clientAnalyticsController));

// Request/Ticket Analytics
router.get('/requests/trend', clientAnalyticsController.getRequestTrends.bind(clientAnalyticsController));
router.get('/requests/by-type', clientAnalyticsController.getRequestsByType.bind(clientAnalyticsController));

// Events and Notifications
router.get('/events/upcoming', clientAnalyticsController.getUpcomingEvents.bind(clientAnalyticsController));
router.get('/notifications/recent', clientAnalyticsController.getRecentNotifications.bind(clientAnalyticsController));

// Account and Security
router.get('/account/logins', clientAnalyticsController.getLoginHistory.bind(clientAnalyticsController));
router.get('/account/security', clientAnalyticsController.getAccountSecurity.bind(clientAnalyticsController));
router.get('/account/sessions', clientAnalyticsController.getActiveSessions.bind(clientAnalyticsController));

// PDF Export
router.get('/pdf-export', clientAnalyticsController.exportPDF.bind(clientAnalyticsController));

/**
 * NEW CORRECTED ROUTES BASED ON SCHEMA ANALYSIS
 */

// Corrected Analytics Routes
router.get('/ticket-stats', clientAnalyticsController.getTicketStats.bind(clientAnalyticsController));
router.get('/equipment-summary', clientAnalyticsController.getEquipmentSummary.bind(clientAnalyticsController));
router.get('/upcoming-events', clientAnalyticsController.getUpcomingEvents.bind(clientAnalyticsController));
router.get('/compliance-trends', clientAnalyticsController.getComplianceTrends.bind(clientAnalyticsController));
router.get('/maintenance-trends', clientAnalyticsController.getMaintenanceTrends.bind(clientAnalyticsController));
router.get('/equipment-compliance', clientAnalyticsController.getEquipmentCompliance.bind(clientAnalyticsController));
router.get('/ticket-types', clientAnalyticsController.getTicketTypes.bind(clientAnalyticsController));
router.get('/equipment-types', clientAnalyticsController.getEquipmentTypes.bind(clientAnalyticsController));
router.get('/non-compliant-equipment', clientAnalyticsController.getNonCompliantEquipment.bind(clientAnalyticsController));
router.get('/recent-tickets', clientAnalyticsController.getRecentTickets.bind(clientAnalyticsController));
router.get('/user-activity', clientAnalyticsController.getUserActivity.bind(clientAnalyticsController));
router.get('/notifications', clientAnalyticsController.getNotifications.bind(clientAnalyticsController));

export default router;