import { Request, Response } from 'express';
import ReportsRepository from '../models/ReportsRepository';
import { BaseController } from './BaseController';
import { AuthenticatedRequest } from '../types/api';
import { DashboardRepository } from '../models/DashboardRepository';

export class ReportsController extends BaseController {

  /**
   * Get vendor ID from authenticated user
   */
  private async getVendorId(req: AuthenticatedRequest): Promise<number | null> {
    console.log('DEBUG: getVendorId called with req.user:', req.user);
    if (!req.user?.userId) {
      console.log('DEBUG: No user or userId found');
      return null;
    }
    console.log('DEBUG: Looking up vendor for userId:', req.user.userId);
    const vendorId = await DashboardRepository.getVendorIdFromUserId(req.user.userId);
    console.log('DEBUG: Found vendorId:', vendorId);
    return vendorId;
  }

  /**
   * Get all KPI data for vendor dashboard
   */
  async getKPIData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const kpiData = await ReportsRepository.getKPIData(vendorId);
      res.json({ success: true, data: kpiData });
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch KPI data' });
    }
  }

  /**
   * Get compliance chart data
   */
  async getComplianceChartData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const chartData = await ReportsRepository.getComplianceChartData(vendorId);
      res.json({ success: true, data: chartData });
    } catch (error) {
      console.error('Error fetching compliance chart data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch compliance data' });
    }
  }

  /**
   * Get ticket resolution chart data
   */
  async getTicketChartData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const chartData = await ReportsRepository.getTicketChartData(vendorId);
      res.json({ success: true, data: chartData });
    } catch (error) {
      console.error('Error fetching ticket chart data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch ticket data' });
    }
  }

  /**
   * Get client performance analytics
   */
  async getClientPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const clientData = await ReportsRepository.getClientPerformance(vendorId);
      res.json({ success: true, data: clientData });
    } catch (error) {
      console.error('Error fetching client performance data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch client performance data' });
    }
  }

  /**
   * Get equipment analytics by type
   */
  async getEquipmentAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const equipmentData = await ReportsRepository.getEquipmentAnalytics(vendorId);
      res.json({ success: true, data: equipmentData });
    } catch (error) {
      console.error('Error fetching equipment analytics:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment analytics' });
    }
  }

  /**
   * Get maintenance analytics over time (last 12 months)
   */
  async getMaintenanceAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const maintenanceData = await ReportsRepository.getMaintenanceAnalytics(vendorId);
      res.json({ success: true, data: maintenanceData });
    } catch (error) {
      console.error('Error fetching maintenance analytics:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch maintenance analytics' });
    }
  }

  /**
   * Get revenue analytics over time (last 12 months)
   */
  async getRevenueAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const revenueData = await ReportsRepository.getRevenueAnalytics(vendorId);
      res.json({ success: true, data: revenueData });
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics' });
    }
  }

  /**
   * Get upcoming maintenance tasks
   */
  async getUpcomingMaintenance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const upcomingTasks = await ReportsRepository.getUpcomingMaintenance(vendorId, limit);
      res.json({ success: true, data: upcomingTasks });
    } catch (error) {
      console.error('Error fetching upcoming maintenance:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch upcoming maintenance' });
    }
  }

  /**
   * Get clients for dropdown
   */
  async getClientsForDropdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const clients = await ReportsRepository.getClientsForDropdown(vendorId);
      res.json({ success: true, data: clients });
    } catch (error) {
      console.error('Error fetching clients for dropdown:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch clients' });
    }
  }

  /**
   * Get equipment types for dropdown
   */
  async getEquipmentTypesForDropdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const equipmentTypes = await ReportsRepository.getEquipmentTypesForDropdown(vendorId);
      res.json({ success: true, data: equipmentTypes });
    } catch (error) {
      console.error('Error fetching equipment types for dropdown:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment types' });
    }
  }

  /**
   * Generate comprehensive equipment compliance report
   */
  async generateEquipmentComplianceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { startDate, endDate, clientId, equipmentType } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ success: false, message: 'Start date and end date are required' });
        return;
      }

      const reportData = await ReportsRepository.generateEquipmentComplianceReport(
        vendorId,
        startDate as string,
        endDate as string,
        clientId ? parseInt(clientId as string) : undefined,
        equipmentType as string
      );

      res.json({ success: true, data: reportData });
    } catch (error) {
      console.error('Error generating equipment compliance report:', error);
      res.status(500).json({ success: false, message: 'Failed to generate compliance report' });
    }
  }

  /**
   * Generate maintenance performance report
   */
  async generateMaintenanceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { startDate, endDate, clientId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ success: false, message: 'Start date and end date are required' });
        return;
      }

      const reportData = await ReportsRepository.generateMaintenanceReport(
        vendorId,
        startDate as string,
        endDate as string,
        clientId ? parseInt(clientId as string) : undefined
      );

      res.json({ success: true, data: reportData });
    } catch (error) {
      console.error('Error generating maintenance report:', error);
      res.status(500).json({ success: false, message: 'Failed to generate maintenance report' });
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Fetch all dashboard data in parallel
      const [
        kpiData,
        complianceData,
        ticketData,
        upcomingMaintenance
      ] = await Promise.all([
        ReportsRepository.getKPIData(vendorId),
        ReportsRepository.getComplianceChartData(vendorId),
        ReportsRepository.getTicketChartData(vendorId),
        ReportsRepository.getUpcomingMaintenance(vendorId, 5)
      ]);

      const dashboardData = {
        kpis: kpiData,
        compliance: complianceData,
        tickets: ticketData,
        upcomingMaintenance
      };

      res.json({ success: true, data: dashboardData });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
  }

  /**
   * Get enhanced KPI data with trends
   */
  async getEnhancedKPIData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const enhancedKpiData = await ReportsRepository.getEnhancedKPIData(vendorId);
      res.json({ success: true, data: enhancedKpiData });
    } catch (error) {
      console.error('Error fetching enhanced KPI data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch enhanced KPI data' });
    }
  }

  /**
   * Get equipment type distribution chart
   */
  async getEquipmentTypeChart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { startDate, endDate } = req.query;
      const dateRange = startDate && endDate ? 
        { startDate: startDate as string, endDate: endDate as string } : undefined;

      const chartData = await ReportsRepository.getEquipmentTypeChartData(vendorId, dateRange);
      res.json({ success: true, data: chartData });
    } catch (error) {
      console.error('Error fetching equipment type chart:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment type chart' });
    }
  }

  /**
   * Get maintenance trends chart
   */
  async getMaintenanceTrendsChart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const months = parseInt(req.query.months as string) || 12;
      const chartData = await ReportsRepository.getMaintenanceTrendsChartData(vendorId, months);
      res.json({ success: true, data: chartData });
    } catch (error) {
      console.error('Error fetching maintenance trends chart:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch maintenance trends chart' });
    }
  }

  /**
   * Get equipment value distribution chart
   */
  async getEquipmentValueChart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const chartData = await ReportsRepository.getEquipmentValueChartData(vendorId);
      res.json({ success: true, data: chartData });
    } catch (error) {
      console.error('Error fetching equipment value chart:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment value chart' });
    }
  }

  /**
   * Get client satisfaction chart
   */
  async getClientSatisfactionChart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const chartData = await ReportsRepository.getClientSatisfactionChartData(vendorId);
      res.json({ success: true, data: chartData });
    } catch (error) {
      console.error('Error fetching client satisfaction chart:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch client satisfaction chart' });
    }
  }

  /**
   * Get compliance trends chart
   */
  async getComplianceTrendsChart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const months = parseInt(req.query.months as string) || 6;
      const chartData = await ReportsRepository.getComplianceTrendsChartData(vendorId, months);
      res.json({ success: true, data: chartData });
    } catch (error) {
      console.error('Error fetching compliance trends chart:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch compliance trends chart' });
    }
  }

  // Table Data Methods for Business Insights

  /**
   * Get top performing clients
   */
  async getTopClients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const clientsData = await ReportsRepository.getTopClients(vendorId, limit);
      res.json({ success: true, data: clientsData });
    } catch (error) {
      console.error('Error fetching top clients:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch top clients' });
    }
  }

  /**
   * Get equipment performance metrics
   */
  async getEquipmentPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const performanceData = await ReportsRepository.getEquipmentPerformance(vendorId);
      res.json({ success: true, data: performanceData });
    } catch (error) {
      console.error('Error fetching equipment performance:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment performance' });
    }
  }

  /**
   * Get maintenance backlog
   */
  async getMaintenanceBacklog(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const backlogData = await ReportsRepository.getMaintenanceBacklog(vendorId);
      res.json({ success: true, data: backlogData });
    } catch (error) {
      console.error('Error fetching maintenance backlog:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch maintenance backlog' });
    }
  }

  /**
   * Get revenue by client
   */
  async getRevenueByClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      
      // Default to last 30 days if not provided
      const end = endDate || new Date().toISOString().split('T')[0];
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const revenueData = await ReportsRepository.getRevenueByClient(vendorId, start, end);
      res.json({ success: true, data: revenueData });
    } catch (error) {
      console.error('Error fetching revenue by client:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch revenue by client' });
    }
  }

  /**
   * Get compliance issues
   */
  async getComplianceIssues(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const issuesData = await ReportsRepository.getComplianceIssues(vendorId);
      res.json({ success: true, data: issuesData });
    } catch (error) {
      console.error('Error fetching compliance issues:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch compliance issues' });
    }
  }
}

export default new ReportsController();