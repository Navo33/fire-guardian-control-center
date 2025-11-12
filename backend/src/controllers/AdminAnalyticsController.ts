import { Response } from 'express';
import { BaseController } from './BaseController';
import { AuthenticatedRequest } from '../types/api';
import { AdminAnalyticsRepository } from '../models/AdminAnalyticsRepository';

export class AdminAnalyticsController extends BaseController {

  /**
   * 1. Get system overview statistics with vendor filtering and user metrics
   */
  static async getSystemOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, vendorId } = req.query;
      
      // Default to last 30 days if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const start = (startDate as string) || defaultStartDate;
      const end = (endDate as string) || defaultEndDate;
      const vendor = vendorId ? parseInt(vendorId as string) : undefined;

      const overview = await AdminAnalyticsRepository.getSystemOverview(start, end, vendor);
      res.json({ success: true, data: overview });
    } catch (error) {
      console.error('Error fetching system overview:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch system overview' });
    }
  }

  /**
   * 2. Get compliance analytics summary with vendor filtering
   */
  static async getComplianceSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { vendorId } = req.query;
      const vendor = vendorId ? parseInt(vendorId as string) : undefined;

      const summary = await AdminAnalyticsRepository.getComplianceSummary(vendor);
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Error fetching compliance summary:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch compliance summary' });
    }
  }

  /**
   * 3. Get compliance trend over time with vendor filtering
   */
  static async getComplianceTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, vendorId } = req.query;
      
      // Default to last 12 months if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const start = (startDate as string) || defaultStartDate;
      const end = (endDate as string) || defaultEndDate;
      const vendor = vendorId ? parseInt(vendorId as string) : undefined;

      const trend = await AdminAnalyticsRepository.getComplianceTrend(start, end, vendor);
      res.json({ success: true, data: trend });
    } catch (error) {
      console.error('Error fetching compliance trend:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch compliance trend' });
    }
  }

  /**
   * 4. Get compliance by vendor (stacked bar chart)
   */
  static async getComplianceByVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await AdminAnalyticsRepository.getComplianceByVendor();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error fetching compliance by vendor:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch compliance by vendor' });
    }
  }

  /**
   * 5. Get ticket trends over time with vendor filtering
   */
  static async getTicketTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, vendorId } = req.query;
      
      // Default to last 12 months if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const start = (startDate as string) || defaultStartDate;
      const end = (endDate as string) || defaultEndDate;
      const vendor = vendorId ? parseInt(vendorId as string) : undefined;

      const trends = await AdminAnalyticsRepository.getTicketTrends(start, end, vendor);
      res.json({ success: true, data: trends });
    } catch (error) {
      console.error('Error fetching ticket trends:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch ticket trends' });
    }
  }

  /**
   * 6. Get tickets by type with vendor filtering
   */
  static async getTicketsByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { vendorId } = req.query;
      const vendor = vendorId ? parseInt(vendorId as string) : undefined;

      const data = await AdminAnalyticsRepository.getTicketsByType(vendor);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error fetching tickets by type:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tickets by type' });
    }
  }

  /**
   * Legacy: Get tickets overview
   */
  static async getTicketsOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const overview = await AdminAnalyticsRepository.getTicketsOverview();
      res.json({ success: true, data: overview });
    } catch (error) {
      console.error('Error fetching tickets overview:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tickets overview' });
    }
  }

  /**
   * 7. Get vendor performance rankings with user metrics
   */
  static async getVendorRankings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rankings = await AdminAnalyticsRepository.getVendorRankings();
      res.json({ success: true, data: rankings });
    } catch (error) {
      console.error('Error fetching vendor rankings:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch vendor rankings' });
    }
  }

  /**
   * 8. Get recent high-priority tickets with vendor filtering
   */
  static async getRecentHighPriorityTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { vendorId } = req.query;
      const vendor = vendorId ? parseInt(vendorId as string) : undefined;

      const tickets = await AdminAnalyticsRepository.getRecentHighPriorityTickets(vendor);
      res.json({ success: true, data: tickets });
    } catch (error) {
      console.error('Error fetching recent high-priority tickets:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch recent high-priority tickets' });
    }
  }

  /**
   * 9. Get user & security trends (NEW - User engagement line chart)
   */
  static async getUserTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      // Default to last 90 days if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const start = (startDate as string) || defaultStartDate;
      const end = (endDate as string) || defaultEndDate;

      const trends = await AdminAnalyticsRepository.getUserTrends(start, end);
      res.json({ success: true, data: trends });
    } catch (error) {
      console.error('Error fetching user trends:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user trends' });
    }
  }

  /**
   * 10. Get password resets breakdown (NEW - Pie chart by reason)
   */
  static async getPasswordResets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await AdminAnalyticsRepository.getPasswordResets();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error fetching password resets:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch password resets' });
    }
  }

  /**
   * 11. Get equipment categories breakdown with vendor filtering
   */
  static async getEquipmentCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { vendorId } = req.query;
      const vendor = vendorId ? parseInt(vendorId as string) : undefined;

      const categories = await AdminAnalyticsRepository.getEquipmentCategories(vendor);
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Error fetching equipment categories:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment categories' });
    }
  }

  /**
   * 12. Get audit log trends
   */
  static async getAuditTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      // Default to last 30 days if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const start = (startDate as string) || defaultStartDate;
      const end = (endDate as string) || defaultEndDate;

      const trends = await AdminAnalyticsRepository.getAuditTrends(start, end);
      res.json({ success: true, data: trends });
    } catch (error) {
      console.error('Error fetching audit trends:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch audit trends' });
    }
  }

  /**
   * 13. Get recent audit events
   */
  static async getRecentAuditEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const events = await AdminAnalyticsRepository.getRecentAuditEvents();
      res.json({ success: true, data: events });
    } catch (error) {
      console.error('Error fetching recent audit events:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch recent audit events' });
    }
  }

  /**
   * Legacy: Get security summary (Enhanced)
   */
  static async getSecuritySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const summary = await AdminAnalyticsRepository.getSecuritySummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Error fetching security summary:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch security summary' });
    }
  }
}