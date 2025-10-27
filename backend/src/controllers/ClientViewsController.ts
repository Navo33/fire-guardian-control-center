import { Response } from 'express';
import { BaseController } from './BaseController';
import { AuthenticatedRequest } from '../types/api';
import { ClientViewsRepository } from '../models/ClientViewsRepository';

export class ClientViewsController extends BaseController {
  
  /**
   * Get client ID from authenticated user
   */
  private static async getClientId(req: AuthenticatedRequest): Promise<number | null> {
    if (!req.user?.userId) {
      return null;
    }
    
    // Get client ID from the clients table using user_id
    const clientId = await ClientViewsRepository.getClientIdFromUserId(req.user.userId);
    return clientId;
  }

  /**
   * Get KPI data for client dashboard
   */
  static async getDashboardKPIs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const kpis = await ClientViewsRepository.getDashboardKPIs(clientId);
      res.json({ success: true, data: kpis });
    } catch (error) {
      console.error('Error fetching client dashboard KPIs:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
  }

  /**
   * Get recent activity for client
   */
  static async getRecentActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const activity = await ClientViewsRepository.getRecentActivity(clientId, req.user!.userId);
      res.json({ success: true, data: activity });
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch activity data' });
    }
  }

  /**
   * Get equipment list for client
   */
  static async getEquipmentList(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const { 
        status, 
        equipment_type, 
        search, 
        page = '1', 
        limit = '25' 
      } = req.query;

      const equipment = await ClientViewsRepository.getEquipmentList(
        clientId,
        {
          status: status as string,
          equipment_type: equipment_type as string,
          search: search as string,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.json({ success: true, data: equipment });
    } catch (error) {
      console.error('Error fetching equipment list:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment data' });
    }
  }

  /**
   * Get ticket list for client
   */
  static async getTicketList(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const { 
        status, 
        support_type, 
        priority, 
        search, 
        page = '1', 
        limit = '25' 
      } = req.query;

      const tickets = await ClientViewsRepository.getTicketList(
        clientId,
        {
          status: status as string,
          support_type: support_type as string,
          priority: priority as string,
          search: search as string,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.json({ success: true, data: tickets });
    } catch (error) {
      console.error('Error fetching ticket list:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tickets data' });
    }
  }

  /**
   * Get KPI data for client reports page
   */
  static async getReportsKPIs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const kpis = await ClientViewsRepository.getReportsKPIs(clientId);
      res.json({ success: true, data: kpis });
    } catch (error) {
      console.error('Error fetching reports KPIs:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch reports data' });
    }
  }

  /**
   * Get compliance chart data
   */
  static async getComplianceChartData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const chartData = await ClientViewsRepository.getComplianceChartData(clientId);
      res.json({ success: true, data: chartData });
    } catch (error) {
      console.error('Error fetching compliance chart data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch chart data' });
    }
  }

  /**
   * Get reports list for client
   */
  static async getReportsList(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const { 
        report_type, 
        search, 
        page = '1', 
        limit = '25' 
      } = req.query;

      const reports = await ClientViewsRepository.getReportsList(
        clientId,
        {
          report_type: report_type as string,
          search: search as string,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.json({ success: true, data: reports });
    } catch (error) {
      console.error('Error fetching reports list:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch reports' });
    }
  }

  /**
   * Get report details
   */
  static async getReportDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const { id: reportId } = req.params;
      const report = await ClientViewsRepository.getReportDetails(clientId, reportId);
      
      if (!report) {
        res.status(404).json({ success: false, message: 'Report not found' });
        return;
      }

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Error fetching report details:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch report details' });
    }
  }

  /**
   * Get related reports
   */
  static async getRelatedReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const { id: reportId } = req.params;
      const reports = await ClientViewsRepository.getRelatedReports(clientId, reportId);

      res.json({ success: true, data: reports });
    } catch (error) {
      console.error('Error fetching related reports:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch related reports' });
    }
  }

  /**
   * Export all reports
   */
  static async exportAllReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      // TODO: Implement ZIP file generation with CSV/PDF reports
      res.status(501).json({ success: false, message: 'Export functionality coming soon' });
    } catch (error) {
      console.error('Error exporting reports:', error);
      res.status(500).json({ success: false, message: 'Failed to export reports' });
    }
  }

  /**
   * Export single report
   */
  static async exportSingleReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clientId = await ClientViewsController.getClientId(req);
      if (!clientId) {
        res.status(404).json({ success: false, message: 'Client not found' });
        return;
      }

      const { id: reportId } = req.params;
      
      // TODO: Implement CSV/PDF generation
      res.status(501).json({ success: false, message: 'Export functionality coming soon' });
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({ success: false, message: 'Failed to export report' });
    }
  }
}
