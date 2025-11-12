import { Response } from 'express';
import { BaseController } from './BaseController';
import { AuthenticatedRequest } from '../types/api';
import { AdminAnalyticsRepository } from '../models/AdminAnalyticsRepository';

export class AdminAnalyticsController extends BaseController {

  /**
   * Get system overview statistics
   */
  static async getSystemOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      // Default to last 30 days if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const start = (startDate as string) || defaultStartDate;
      const end = (endDate as string) || defaultEndDate;

      const overview = await AdminAnalyticsRepository.getSystemOverview(start, end);
      res.json({ success: true, data: overview });
    } catch (error) {
      console.error('Error fetching system overview:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch system overview' });
    }
  }

  /**
   * Get compliance analytics summary
   */
  static async getComplianceSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const summary = await AdminAnalyticsRepository.getComplianceSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Error fetching compliance summary:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch compliance summary' });
    }
  }

  /**
   * Get compliance trend over time
   */
  static async getComplianceTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      // Default to last 12 months if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const start = (startDate as string) || defaultStartDate;
      const end = (endDate as string) || defaultEndDate;

      const trend = await AdminAnalyticsRepository.getComplianceTrend(start, end);
      res.json({ success: true, data: trend });
    } catch (error) {
      console.error('Error fetching compliance trend:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch compliance trend' });
    }
  }

  /**
   * Get compliance by vendor
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
   * Get ticket trends over time
   */
  static async getTicketTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      // Default to last 12 months if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const start = (startDate as string) || defaultStartDate;
      const end = (endDate as string) || defaultEndDate;

      const trends = await AdminAnalyticsRepository.getTicketTrends(start, end);
      res.json({ success: true, data: trends });
    } catch (error) {
      console.error('Error fetching ticket trends:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch ticket trends' });
    }
  }

  /**
   * Get tickets by type
   */
  static async getTicketsByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await AdminAnalyticsRepository.getTicketsByType();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error fetching tickets by type:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tickets by type' });
    }
  }

  /**
   * Get tickets overview
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
   * Get vendor performance rankings
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
   * Get recent high-priority tickets
   */
  static async getRecentHighPriorityTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tickets = await AdminAnalyticsRepository.getRecentHighPriorityTickets();
      res.json({ success: true, data: tickets });
    } catch (error) {
      console.error('Error fetching recent high-priority tickets:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch recent high-priority tickets' });
    }
  }

  /**
   * Get audit log trends
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
   * Get recent audit events
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
   * Get equipment categories breakdown
   */
  static async getEquipmentCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const categories = await AdminAnalyticsRepository.getEquipmentCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Error fetching equipment categories:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment categories' });
    }
  }

  /**
   * Get security summary
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