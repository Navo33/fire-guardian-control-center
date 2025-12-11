import PDFDocument from 'pdfkit';
import { ClientReportData } from '../models/PDFReportsRepository';

export class PDFReportService {
  /**
   * Generate Fire Equipment Status & Maintenance Report PDF
   */
  generateClientReport(data: ClientReportData): PDFKit.PDFDocument {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Header with Fire Guardian branding
    this.addHeader(doc, data);
    
    // Report Title
    this.addReportTitle(doc);
    
    // Client & Service Provider Information
    this.addClientAndVendorInfo(doc, data);
    
    // Executive Summary
    this.addExecutiveSummary(doc, data);
    
    // Equipment Inventory Table
    this.addEquipmentInventory(doc, data);
    
    // New page for maintenance history
    doc.addPage();
    
    // Maintenance History Table
    this.addMaintenanceHistory(doc, data);
    
    // Compliance Summary & Recommendations
    this.addComplianceSummary(doc, data);
    
    // Footer with signatures
    this.addFooter(doc);

    doc.end();
    return doc;
  }

  private addHeader(doc: PDFKit.PDFDocument, data: ClientReportData) {
    // Company name/logo at top left
    doc
      .fontSize(18)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('FIRE GUARDIAN', 50, 45);
    
    doc
      .fontSize(8)
      .fillColor('#000000')
      .font('Helvetica')
      .text('Control Center', 50, 66);

    // Report metadata on right
    doc
      .fontSize(8)
      .fillColor('#000000')
      .font('Helvetica')
      .text(`Report No: ${data.reportMetadata.reportNumber}`, 350, 45, { align: 'right', width: 195 })
      .text(`Date: ${data.reportMetadata.reportDate}`, 350, 57, { align: 'right', width: 195 })
      .text(`Period: ${data.reportMetadata.dateRangeStart} to ${data.reportMetadata.dateRangeEnd}`, 350, 69, { align: 'right', width: 195 });

    // Horizontal line
    doc
      .strokeColor('#000000')
      .lineWidth(0.5)
      .moveTo(50, 88)
      .lineTo(545, 88)
      .stroke();
  }

  private addReportTitle(doc: PDFKit.PDFDocument) {
    doc
      .fontSize(14)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('FIRE EQUIPMENT STATUS & MAINTENANCE REPORT', 50, 105, { align: 'center', width: 495 });
    
    doc
      .fontSize(8)
      .fillColor('#000000')
      .font('Helvetica')
      .text('In Accordance with NFPA Standards', 50, 122, { align: 'center', width: 495 });
    
    doc.y = 145;
  }

  private addClientAndVendorInfo(doc: PDFKit.PDFDocument, data: ClientReportData) {
    const startY = doc.y;
    
    // Client Information Box
    doc
      .fontSize(9)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('CLIENT INFORMATION', 50, startY);
    
    doc
      .fontSize(8)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('Company Name:', 50, startY + 16)
      .font('Helvetica')
      .text(data.clientInfo.companyName, 125, startY + 16);
    
    doc
      .font('Helvetica-Bold')
      .text('Business Type:', 50, startY + 28)
      .font('Helvetica')
      .text(data.clientInfo.businessType, 125, startY + 28);
    
    doc
      .font('Helvetica-Bold')
      .text('Address:', 50, startY + 40)
      .font('Helvetica')
      .text(`${data.clientInfo.address}`, 125, startY + 40);
    
    doc
      .text(`${data.clientInfo.city}, ${data.clientInfo.state} ${data.clientInfo.zipCode}`, 125, startY + 52);
    
    doc
      .font('Helvetica-Bold')
      .text('Contact:', 50, startY + 64)
      .font('Helvetica')
      .text(`${data.clientInfo.phone}`, 125, startY + 64);
    
    doc
      .text(`${data.clientInfo.email}`, 125, startY + 76);

    // Service Provider Information Box
    doc
      .fontSize(9)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('SERVICE PROVIDER', 310, startY);
    
    doc
      .fontSize(8)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('Company:', 310, startY + 16)
      .font('Helvetica')
      .text(data.vendorInfo.companyName, 370, startY + 16);
    
    doc
      .font('Helvetica-Bold')
      .text('License No:', 310, startY + 28)
      .font('Helvetica')
      .text(data.vendorInfo.licenseNumber, 370, startY + 28);
    
    doc
      .font('Helvetica-Bold')
      .text('Phone:', 310, startY + 40)
      .font('Helvetica')
      .text(data.vendorInfo.phone, 370, startY + 40);

    doc.y = startY + 95;
    
    // Divider line
    doc
      .strokeColor('#000000')
      .lineWidth(0.5)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    
    doc.y += 15;
  }

  private addExecutiveSummary(doc: PDFKit.PDFDocument, data: ClientReportData) {
    doc
      .fontSize(10)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('EXECUTIVE SUMMARY', 50, doc.y);
    
    const summary = data.equipmentSummary;
    const startY = doc.y + 14;
    
    // Summary in simple table format
    doc
      .fontSize(8)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('Total Equipment:', 55, startY)
      .font('Helvetica')
      .text(summary.totalEquipment.toString(), 180, startY);
    
    doc
      .font('Helvetica-Bold')
      .text('Compliant Equipment:', 55, startY + 12)
      .font('Helvetica')
      .text(summary.compliantEquipment.toString(), 180, startY + 12);
    
    doc
      .font('Helvetica-Bold')
      .text('Expiring Soon (30 days):', 55, startY + 24)
      .font('Helvetica')
      .text(summary.expiringSoon.toString(), 180, startY + 24);
    
    doc
      .font('Helvetica-Bold')
      .text('Expired:', 55, startY + 36)
      .font('Helvetica')
      .text(summary.expired.toString(), 180, startY + 36);
    
    doc
      .font('Helvetica-Bold')
      .text('Maintenance Due:', 55, startY + 48)
      .font('Helvetica')
      .text(summary.maintenanceDue.toString(), 180, startY + 48);
    
    const complianceRate = summary.totalEquipment > 0 
      ? ((summary.compliantEquipment / summary.totalEquipment) * 100).toFixed(1)
      : '0.0';
    
    doc
      .font('Helvetica-Bold')
      .text('Compliance Rate:', 55, startY + 60)
      .font('Helvetica')
      .text(`${complianceRate}%`, 180, startY + 60);
    
    doc.y = startY + 78;
  }

  private addEquipmentInventory(doc: PDFKit.PDFDocument, data: ClientReportData) {
    doc
      .fontSize(10)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('EQUIPMENT INVENTORY', 50, doc.y);
    
    const tableTop = doc.y + 12;
    const rowHeight = 20;
    
    // Header with border
    doc
      .rect(50, tableTop, 495, rowHeight)
      .stroke('#000000');
    
    // Header text
    doc
      .fontSize(7)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('Equipment Type', 53, tableTop + 6, { width: 85 })
      .text('Serial No.', 140, tableTop + 6, { width: 60 })
      .text('Location', 203, tableTop + 6, { width: 68 })
      .text('Last Maint.', 273, tableTop + 6, { width: 58 })
      .text('Next Maint.', 333, tableTop + 6, { width: 58 })
      .text('Expiry', 393, tableTop + 6, { width: 50 })
      .text('Status', 445, tableTop + 6, { width: 95 });

    let currentY = tableTop + rowHeight;
    
    // Table rows
    data.equipmentDetails.slice(0, 20).forEach((equipment, index) => {
      // Check if we need a new page
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
        
        // Repeat headers on new page
        doc
          .rect(50, currentY, 495, rowHeight)
          .stroke('#000000');
        
        doc
          .fontSize(8)
          .fillColor('#000000')
          .font('Helvetica-Bold')
          .text('Equipment Type', 55, currentY + 5, { width: 90 })
          .text('Serial No.', 150, currentY + 5, { width: 65 })
          .text('Location', 220, currentY + 5, { width: 70 })
          .text('Last Maint.', 295, currentY + 5, { width: 60 })
          .text('Next Maint.', 360, currentY + 5, { width: 60 })
          .text('Expiry', 425, currentY + 5, { width: 50 })
          .text('Status', 480, currentY + 5, { width: 60 });
        
        currentY += rowHeight;
      }
      
      // Row border
      doc
        .rect(50, currentY, 495, rowHeight)
        .stroke('#CCCCCC');
      
      // Row data
      doc
        .fontSize(6.5)
        .fillColor('#000000')
        .font('Helvetica')
        .text(equipment.equipmentName.substring(0, 22), 53, currentY + 6, { width: 85 })
        .text(equipment.serialNumber.substring(0, 14), 140, currentY + 6, { width: 60 })
        .text(equipment.location.substring(0, 18), 203, currentY + 6, { width: 68 })
        .text(equipment.lastMaintenanceDate, 273, currentY + 6, { width: 58 })
        .text(equipment.nextMaintenanceDate, 333, currentY + 6, { width: 58 })
        .text(equipment.expiryDate, 393, currentY + 6, { width: 50 })
        .text(equipment.complianceStatus.replace('_', ' '), 445, currentY + 6, { width: 95 });
      
      currentY += rowHeight;
    });
    
    doc.y = currentY + 10;
    
    // Note if more equipment exists
    if (data.equipmentDetails.length > 20) {
      doc
        .fontSize(7)
        .fillColor('#000000')
        .font('Helvetica-Oblique')
        .text(`Note: Showing first 20 of ${data.equipmentDetails.length} equipment items. Full inventory available in system.`, 50, doc.y);
    }
  }

  private addMaintenanceHistory(doc: PDFKit.PDFDocument, data: ClientReportData) {
    doc
      .fontSize(10)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('MAINTENANCE HISTORY', 50, 50);
    
    if (data.maintenanceHistory.length === 0) {
      doc
        .fontSize(8)
        .fillColor('#000000')
        .font('Helvetica')
        .text('No maintenance records found for the selected date range.', 50, 72);
      return;
    }

    // Table headers
    const tableTop = 72;
    const rowHeight = 22;
    
    // Header with border
    doc
      .rect(50, tableTop, 495, 20)
      .stroke('#000000');
    
    // Header text
    doc
      .fontSize(7)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('Ticket', 53, tableTop + 6, { width: 42 })
      .text('Equipment', 98, tableTop + 6, { width: 72 })
      .text('Issue Description', 173, tableTop + 6, { width: 95 })
      .text('Technician', 271, tableTop + 6, { width: 62 })
      .text('Scheduled', 336, tableTop + 6, { width: 52 })
      .text('Completed', 391, tableTop + 6, { width: 52 })
      .text('Status', 446, tableTop + 6, { width: 94 });

    let currentY = tableTop + 18;
    
    // Table rows (limit to 25 records to fit page)
    data.maintenanceHistory.slice(0, 25).forEach((record, index) => {
      // Check if we need a new page
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
        
        // Repeat headers
        doc
          .rect(50, currentY, 495, 18)
          .stroke('#000000');
        
        doc
          .fontSize(8)
          .fillColor('#000000')
          .font('Helvetica-Bold')
          .text('Ticket', 55, currentY + 5, { width: 45 })
          .text('Equipment', 105, currentY + 5, { width: 75 })
          .text('Issue Description', 185, currentY + 5, { width: 100 })
          .text('Technician', 290, currentY + 5, { width: 65 })
          .text('Scheduled', 360, currentY + 5, { width: 55 })
          .text('Completed', 420, currentY + 5, { width: 55 })
          .text('Status', 480, currentY + 5, { width: 60 });
        
        currentY += 18;
      }
      
      // Row border
      doc
        .rect(50, currentY, 495, rowHeight)
        .stroke('#CCCCCC');
      
      // Row data
      doc
        .fontSize(6.5)
        .fillColor('#000000')
        .font('Helvetica')
        .text(record.ticketNumber, 53, currentY + 6, { width: 42 })
        .text(record.equipmentName.substring(0, 18), 98, currentY + 6, { width: 72 })
        .text(record.issueDescription.substring(0, 45), 173, currentY + 6, { width: 95, height: 16 })
        .text(record.technicianName.substring(0, 16), 271, currentY + 6, { width: 62 })
        .text(record.scheduledDate, 336, currentY + 6, { width: 52 })
        .text(record.completedDate, 391, currentY + 6, { width: 52 })
        .text(record.status, 446, currentY + 6, { width: 94 });
      
      currentY += rowHeight;
    });
    
    doc.y = currentY + 10;
    
    if (data.maintenanceHistory.length > 25) {
      doc
        .fontSize(7)
        .fillColor('#000000')
        .font('Helvetica-Oblique')
        .text(`Note: Showing first 25 of ${data.maintenanceHistory.length} maintenance records. Full history available in system.`, 50, doc.y);
    }
  }

  private addComplianceSummary(doc: PDFKit.PDFDocument, data: ClientReportData) {
    const startY = doc.y + 20;
    
    doc
      .fontSize(10)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('COMPLIANCE SUMMARY & RECOMMENDATIONS', 50, startY);

    const compliance = data.complianceSummary;
    const statusText = compliance.nfpaCompliant ? 'COMPLIANT' : 'NON-COMPLIANT';
    
    // Compliance status
    doc
      .fontSize(8)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('NFPA Compliance Status:', 55, startY + 16)
      .font('Helvetica')
      .text(statusText, 180, startY + 16);

    // Inspection statistics
    doc
      .font('Helvetica-Bold')
      .text('Inspection Summary:', 55, startY + 32);
    
    doc
      .fontSize(7.5)
      .font('Helvetica')
      .text(`Total Inspections: ${compliance.totalInspections}`, 60, startY + 44)
      .text(`Passed Inspections: ${compliance.passedInspections}`, 60, startY + 55)
      .text(`Failed Inspections: ${compliance.failedInspections}`, 60, startY + 66)
      .text(`Upcoming Inspections: ${compliance.upcomingInspections}`, 60, startY + 77);
    
    // Recommendations
    doc
      .fontSize(8)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('Recommendations:', 55, startY + 93);
    
    doc
      .fontSize(7.5)
      .fillColor('#000000')
      .font('Helvetica')
      .text('1. Schedule immediate maintenance for all overdue equipment to maintain compliance.', 60, startY + 106, { width: 480 })
      .text('2. Review and update equipment locations to ensure accurate tracking.', 60, startY + 118, { width: 480 })
      .text('3. Plan for replacement of equipment nearing end-of-life (expiring within 6 months).', 60, startY + 130, { width: 480 })
      .text('4. Conduct regular fire safety training and drills for all personnel.', 60, startY + 142, { width: 480 })
      .text('5. Maintain detailed documentation of all maintenance activities for audit purposes.', 60, startY + 154, { width: 480 });
    
    doc.y = startY + 170;
  }

  private addFooter(doc: PDFKit.PDFDocument) {
    // Signature lines
    const signatureY = doc.y > 680 ? doc.y + 20 : 680;
    
    doc
      .fontSize(7.5)
      .fillColor('#000000')
      .font('Helvetica')
      .text('_____________________________', 65, signatureY)
      .text('Service Provider Signature', 65, signatureY + 10)
      .text('Date: _______________', 65, signatureY + 22);
    
    doc
      .text('_____________________________', 340, signatureY)
      .text('Client Signature', 340, signatureY + 10)
      .text('Date: _______________', 340, signatureY + 22);
    
    // Footer note
    doc
      .fontSize(6.5)
      .fillColor('#000000')
      .font('Helvetica-Oblique')
      .text(
        'This report is generated by Fire Guardian Control Center. For questions, contact your service provider.',
        50,
        signatureY + 48,
        { width: 495, align: 'center' }
      );
  }
}
