import { Request, Response } from 'express';
import { PDFReportsRepository } from '../models/PDFReportsRepository';
import { PDFReportService } from '../services/pdfReportService';

export class PDFReportsController {
  private reportsRepository: PDFReportsRepository;
  private pdfService: PDFReportService;

  constructor() {
    this.reportsRepository = new PDFReportsRepository();
    this.pdfService = new PDFReportService();
  }

  /**
   * Generate client report PDF
   * POST /api/reports/client
   * Body: { startDate: string, endDate: string }
   */
  generateClientReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userType = req.user?.user_type;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Only clients can generate their own reports
      if (userType !== 'client') {
        res.status(403).json({ error: 'Only clients can generate reports' });
        return;
      }

      const { startDate, endDate } = req.body;

      // Validate date range
      if (!startDate || !endDate) {
        res.status(400).json({ 
          error: 'Start date and end date are required',
          message: 'Please provide both startDate and endDate in YYYY-MM-DD format'
        });
        return;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        res.status(400).json({ 
          error: 'Invalid date format',
          message: 'Dates must be in YYYY-MM-DD format'
        });
        return;
      }

      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        res.status(400).json({ 
          error: 'Invalid date range',
          message: 'Start date must be before end date'
        });
        return;
      }

      // Check if date range is not too large (max 1 year)
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > oneYear) {
        res.status(400).json({ 
          error: 'Date range too large',
          message: 'Date range cannot exceed 1 year'
        });
        return;
      }

      // Fetch report data
      const reportData = await this.reportsRepository.getClientReportData(
        userId,
        startDate,
        endDate
      );

      if (!reportData) {
        res.status(404).json({ 
          error: 'Client not found',
          message: 'Unable to find client information'
        });
        return;
      }

      // Generate PDF
      const pdfDoc = this.pdfService.generateClientReport(reportData);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Fire_Equipment_Report_${reportData.clientInfo.companyName.replace(/\s+/g, '_')}_${reportData.reportMetadata.reportNumber}.pdf"`
      );

      // Pipe PDF to response
      pdfDoc.pipe(res);
    } catch (error) {
      console.error('Error generating client report:', error);
      res.status(500).json({ 
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  /**
   * Preview report data (without generating PDF)
   * GET /api/reports/client/preview?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  previewReportData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userType = req.user?.user_type;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (userType !== 'client') {
        res.status(403).json({ error: 'Only clients can preview reports' });
        return;
      }

      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ 
          error: 'Start date and end date are required'
        });
        return;
      }

      // Fetch report data
      const reportData = await this.reportsRepository.getClientReportData(
        userId,
        startDate as string,
        endDate as string
      );

      if (!reportData) {
        res.status(404).json({ 
          error: 'Client not found'
        });
        return;
      }

      res.json({
        success: true,
        data: reportData
      });
    } catch (error) {
      console.error('Error previewing report data:', error);
      res.status(500).json({ 
        error: 'Failed to preview report data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  /**
   * Get available date range for reports
   * GET /api/reports/client/date-range
   */
  getAvailableDateRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userType = req.user?.user_type;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (userType !== 'client') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Get client's first equipment assignment date and today
      const { pool } = await import('../config/database');
      
      const result = await pool.query(
        `SELECT 
          MIN(ei.created_at) as earliest_date,
          MAX(ei.created_at) as latest_date
        FROM equipment_instance ei
        JOIN clients c ON ei.assigned_to = c.id
        WHERE c.user_id = $1`,
        [userId]
      );

      const earliestDate = result.rows[0]?.earliest_date 
        ? new Date(result.rows[0].earliest_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      const latestDate = new Date().toISOString().split('T')[0];

      res.json({
        success: true,
        data: {
          earliestDate,
          latestDate,
          defaultStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
          defaultEnd: latestDate
        }
      });
    } catch (error) {
      console.error('Error getting date range:', error);
      res.status(500).json({ 
        error: 'Failed to get date range',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  /**
   * Generate vendor report for a specific client
   * POST /api/reports/vendor/client/:clientId
   * Body: { startDate: string, endDate: string }
   */
  generateVendorClientReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userType = req.user?.user_type;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Only vendors can generate reports
      if (userType !== 'vendor') {
        res.status(403).json({ error: 'Only vendors can generate client reports' });
        return;
      }

      const clientId = parseInt(req.params.clientId);
      const { startDate, endDate } = req.body;

      // Validate client ID
      if (isNaN(clientId)) {
        res.status(400).json({ 
          error: 'Invalid client ID',
          message: 'Client ID must be a valid number'
        });
        return;
      }

      // Validate date range
      if (!startDate || !endDate) {
        res.status(400).json({ 
          error: 'Start date and end date are required',
          message: 'Please provide both startDate and endDate in YYYY-MM-DD format'
        });
        return;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        res.status(400).json({ 
          error: 'Invalid date format',
          message: 'Dates must be in YYYY-MM-DD format'
        });
        return;
      }

      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        res.status(400).json({ 
          error: 'Invalid date range',
          message: 'Start date must be before end date'
        });
        return;
      }

      // Get vendor ID
      const vendorId = await this.reportsRepository.getVendorIdFromUserId(userId);
      
      if (!vendorId) {
        res.status(404).json({ 
          error: 'Vendor not found',
          message: 'Unable to find vendor information'
        });
        return;
      }

      // Fetch report data
      const reportData = await this.reportsRepository.getVendorClientReportData(
        vendorId,
        clientId,
        startDate,
        endDate
      );

      if (!reportData) {
        res.status(404).json({ 
          error: 'Client not found',
          message: 'Unable to find client information or client does not belong to this vendor'
        });
        return;
      }

      // Generate PDF
      const pdfDoc = this.pdfService.generateClientReport(reportData);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Fire_Equipment_Report_${reportData.clientInfo.companyName.replace(/\s+/g, '_')}_${reportData.reportMetadata.reportNumber}.pdf"`
      );

      // Pipe PDF to response
      pdfDoc.pipe(res);
    } catch (error) {
      console.error('Error generating vendor client report:', error);
      res.status(500).json({ 
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  /**
   * Get vendor's clients list for report filtering
   * GET /api/reports/vendor/clients
   */
  getVendorClientsList = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userType = req.user?.user_type;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (userType !== 'vendor') {
        res.status(403).json({ error: 'Only vendors can access this endpoint' });
        return;
      }

      // Get vendor ID
      const vendorId = await this.reportsRepository.getVendorIdFromUserId(userId);
      
      if (!vendorId) {
        res.status(404).json({ 
          error: 'Vendor not found'
        });
        return;
      }

      // Fetch clients list
      const clients = await this.reportsRepository.getVendorClients(vendorId);

      res.json({
        success: true,
        data: clients
      });
    } catch (error) {
      console.error('Error fetching vendor clients:', error);
      res.status(500).json({ 
        error: 'Failed to fetch clients',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  /**
   * Get available date range for vendor reports
   * GET /api/reports/vendor/date-range?clientId=123
   */
  getVendorDateRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userType = req.user?.user_type;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (userType !== 'vendor') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : null;

      // Get vendor ID
      const vendorId = await this.reportsRepository.getVendorIdFromUserId(userId);
      
      if (!vendorId) {
        res.status(404).json({ 
          error: 'Vendor not found'
        });
        return;
      }

      const { pool } = await import('../config/database');
      
      let query;
      let params;

      if (clientId) {
        // Get date range for specific client
        query = `SELECT 
          MIN(ei.created_at) as earliest_date,
          MAX(ei.created_at) as latest_date
        FROM equipment_instance ei
        WHERE ei.vendor_id = $1 AND ei.assigned_to = $2`;
        params = [vendorId, clientId];
      } else {
        // Get date range for all vendor's clients
        query = `SELECT 
          MIN(ei.created_at) as earliest_date,
          MAX(ei.created_at) as latest_date
        FROM equipment_instance ei
        WHERE ei.vendor_id = $1`;
        params = [vendorId];
      }

      const result = await pool.query(query, params);

      const earliestDate = result.rows.length > 0 && result.rows[0].earliest_date
        ? new Date(result.rows[0].earliest_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      const latestDate = new Date().toISOString().split('T')[0];

      res.json({
        success: true,
        data: {
          earliestDate,
          latestDate,
          defaultStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
          defaultEnd: latestDate
        }
      });
    } catch (error) {
      console.error('Error getting vendor date range:', error);
      res.status(500).json({ 
        error: 'Failed to get date range',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };
}
