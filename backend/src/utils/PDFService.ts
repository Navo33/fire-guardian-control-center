import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

type PDFDoc = typeof PDFDocument;

export interface PDFReportData {
  clientName: string;
  clientId: number;
  overview: any;
  equipmentList: any[];
  complianceSummary: any;
  upcomingEvents: any[];
  unresolvedTickets: any[];
  generatedAt: string;
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
}

export class PDFService {
  /**
   * Generate a comprehensive analytics PDF report
   */
  static generateReport(data: PDFReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Fire Safety Analytics Report - ${data.clientName}`,
            Author: 'Fire Guardian Control Center',
            Subject: 'Equipment Compliance & Analytics Report',
            Keywords: 'fire safety, compliance, analytics, equipment',
            CreationDate: new Date(),
            ModDate: new Date()
          }
        });

        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate PDF content
        this.addHeader(doc, data);
        this.addExecutiveSummary(doc, data);
        this.addComplianceOverview(doc, data);
        this.addEquipmentDetails(doc, data);
        this.addUpcomingEvents(doc, data);
        this.addUnresolvedTickets(doc, data);
        this.addFooter(doc, data);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header section with logo and title
   */
  private static addHeader(doc: PDFDoc, data: PDFReportData) {
    // Header background
    doc.rect(0, 0, doc.page.width, 120)
       .fill('#1e40af');

    // Reset to white text for header
    doc.fillColor('white');

    // Title
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Fire Safety Analytics Report', 50, 30);

    // Client name
    doc.fontSize(16)
       .font('Helvetica')
       .text(data.clientName, 50, 60);

    // Report date
    const reportDate = new Date(data.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.fontSize(12)
       .text(`Generated: ${reportDate}`, 50, 85);

    // Period
    const startDate = new Date(data.reportPeriod.startDate).toLocaleDateString();
    const endDate = new Date(data.reportPeriod.endDate).toLocaleDateString();
    doc.text(`Report Period: ${startDate} - ${endDate}`, 350, 85);

    // Move cursor below header
    doc.y = 140;
    doc.fillColor('black');
  }

  /**
   * Add executive summary section
   */
  private static addExecutiveSummary(doc: PDFDoc, data: PDFReportData) {
    this.addSectionTitle(doc, 'Executive Summary');

    const { complianceSummary, overview } = data;
    
    // Key metrics in a grid
    const metrics = [
      { label: 'Total Equipment', value: complianceSummary.total_equipment || 0 },
      { label: 'Compliance Rate', value: `${complianceSummary.compliance_percentage || 0}%` },
      { label: 'Compliant Units', value: complianceSummary.compliant_count || 0 },
      { label: 'Due Soon', value: complianceSummary.due_soon_count || 0 },
      { label: 'Overdue', value: complianceSummary.overdue_count || 0 },
      { label: 'Out of Service', value: complianceSummary.out_of_service_count || 0 }
    ];

    const startX = 50;
    let currentX = startX;
    let currentY = doc.y;
    const boxWidth = 160;
    const boxHeight = 60;
    const spacing = 20;

    metrics.forEach((metric, index) => {
      if (index % 3 === 0 && index > 0) {
        currentY += boxHeight + spacing;
        currentX = startX;
      }

      // Draw metric box
      doc.rect(currentX, currentY, boxWidth, boxHeight)
         .stroke('#e5e7eb');

      // Metric value
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text(metric.value.toString(), currentX + 10, currentY + 10, {
           width: boxWidth - 20,
           align: 'center'
         });

      // Metric label
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text(metric.label, currentX + 10, currentY + 35, {
           width: boxWidth - 20,
           align: 'center'
         });

      currentX += boxWidth + spacing;
    });

    doc.y = currentY + boxHeight + 30;
    doc.fillColor('black');
  }

  /**
   * Add compliance overview section
   */
  private static addComplianceOverview(doc: PDFDoc, data: PDFReportData) {
    this.addSectionTitle(doc, 'Compliance Overview');

    // Compliance status legend
    const statuses = [
      { label: 'Compliant', count: data.complianceSummary.compliant_count, color: '#10b981' },
      { label: 'Due Soon', count: data.complianceSummary.due_soon_count, color: '#f59e0b' },
      { label: 'Overdue', count: data.complianceSummary.overdue_count, color: '#ef4444' },
      { label: 'Out of Service', count: data.complianceSummary.out_of_service_count, color: '#6b7280' }
    ];

    statuses.forEach((status, index) => {
      const y = doc.y + (index * 25);
      
      // Color indicator
      doc.rect(50, y, 15, 15)
         .fill(status.color);

      // Status text
      doc.fillColor('black')
         .fontSize(12)
         .font('Helvetica')
         .text(`${status.label}: ${status.count} units`, 75, y + 2);
    });

    doc.y += statuses.length * 25 + 20;
  }

  /**
   * Add detailed equipment list
   */
  private static addEquipmentDetails(doc: PDFDoc, data: PDFReportData) {
    this.addSectionTitle(doc, 'Equipment Details');

    if (data.equipmentList.length === 0) {
      doc.fontSize(12)
         .text('No equipment found for this client.', 50, doc.y);
      return;
    }

    // Table headers
    const headers = ['Tag', 'Name', 'Type', 'Status', 'Next Inspection', 'Vendor'];
    const colWidths = [80, 120, 100, 80, 90, 100];
    const startX = 50;
    let currentY = doc.y;

    // Header background
    doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 25)
       .fill('#f3f4f6');

    // Header text
    doc.fillColor('black')
       .fontSize(10)
       .font('Helvetica-Bold');

    let x = startX;
    headers.forEach((header, index) => {
      doc.text(header, x + 5, currentY + 8, {
        width: colWidths[index] - 10,
        align: 'left'
      });
      x += colWidths[index];
    });

    currentY += 25;

    // Equipment rows
    data.equipmentList.slice(0, 15).forEach((equipment, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 20)
           .fill('#fafafa');
      }

      doc.fillColor('black')
         .fontSize(9)
         .font('Helvetica');

      const rowData = [
        equipment.equipment_tag || 'N/A',
        equipment.equipment_name || 'N/A',
        equipment.equipment_type || 'N/A',
        equipment.compliance_status || 'N/A',
        equipment.next_inspection_due ? new Date(equipment.next_inspection_due).toLocaleDateString() : 'N/A',
        equipment.vendor_name || 'N/A'
      ];

      x = startX;
      rowData.forEach((cell, cellIndex) => {
        doc.text(cell, x + 5, currentY + 5, {
          width: colWidths[cellIndex] - 10,
          align: 'left'
        });
        x += colWidths[cellIndex];
      });

      currentY += 20;

      // Check if we need a new page
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }
    });

    doc.y = currentY + 20;
  }

  /**
   * Add upcoming events section
   */
  private static addUpcomingEvents(doc: PDFDoc, data: PDFReportData) {
    this.addSectionTitle(doc, 'Upcoming Inspections');

    if (data.upcomingEvents.length === 0) {
      doc.fontSize(12)
         .text('No upcoming inspections scheduled.', 50, doc.y);
      return;
    }

    data.upcomingEvents.slice(0, 10).forEach((event, index) => {
      const y = doc.y + (index * 20);
      
      // Urgency indicator
      const urgencyColor = event.urgency === 'Overdue' ? '#ef4444' : 
                          event.urgency === 'This Week' ? '#f59e0b' : '#10b981';
      
      doc.rect(50, y, 10, 15)
         .fill(urgencyColor);

      // Event details
      doc.fillColor('black')
         .fontSize(10)
         .text(`${event.equipment_tag} - ${event.equipment_name}`, 70, y + 2);
      
      const dueDate = new Date(event.next_inspection_due).toLocaleDateString();
      doc.fontSize(9)
         .fillColor('#6b7280')
         .text(`Due: ${dueDate} (${event.urgency})`, 70, y + 12);
    });

    doc.y += data.upcomingEvents.slice(0, 10).length * 20 + 20;
  }

  /**
   * Add unresolved tickets section
   */
  private static addUnresolvedTickets(doc: PDFDoc, data: PDFReportData) {
    this.addSectionTitle(doc, 'Unresolved Tickets');

    if (data.unresolvedTickets.length === 0) {
      doc.fontSize(12)
         .text('No unresolved tickets.', 50, doc.y);
      return;
    }

    data.unresolvedTickets.slice(0, 8).forEach((ticket, index) => {
      const y = doc.y + (index * 30);
      
      // Priority indicator
      const priorityColor = ticket.priority === 'critical' ? '#ef4444' : 
                           ticket.priority === 'high' ? '#f59e0b' : '#10b981';
      
      doc.rect(50, y, 5, 25)
         .fill(priorityColor);

      // Ticket details
      doc.fillColor('black')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(`#${ticket.id} - ${ticket.title}`, 65, y + 2);
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text(`${ticket.equipment_tag} | ${ticket.priority_display} Priority | ${ticket.days_open} days open`, 65, y + 15);
    });

    doc.y += data.unresolvedTickets.slice(0, 8).length * 30 + 20;
  }

  /**
   * Add footer with disclaimer and contact info
   */
  private static addFooter(doc: PDFDoc, data: PDFReportData) {
    const footerY = doc.page.height - 80;
    
    // Disclaimer
    doc.fontSize(8)
       .fillColor('#6b7280')
       .text('This report is generated automatically by Fire Guardian Control Center. Data accuracy depends on timely maintenance record updates.', 50, footerY, {
         width: doc.page.width - 100,
         align: 'center'
       });

    // Contact info
    doc.text('For questions or support, contact your system administrator.', 50, footerY + 20, {
      width: doc.page.width - 100,
      align: 'center'
    });
  }

  /**
   * Helper method to add section titles
   */
  private static addSectionTitle(doc: PDFDoc, title: string) {
    // Check if we need a new page
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#1e40af')
       .text(title, 50, doc.y);

    // Underline
    doc.moveTo(50, doc.y + 5)
       .lineTo(doc.page.width - 50, doc.y + 5)
       .strokeColor('#e5e7eb')
       .stroke();

    doc.y += 25;
    doc.fillColor('black');
  }
}