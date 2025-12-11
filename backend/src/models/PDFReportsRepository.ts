import { pool } from '../config/database';

export interface ClientReportData {
  clientInfo: {
    id: number;
    companyName: string;
    businessType: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email: string;
  };
  vendorInfo: {
    companyName: string;
    licenseNumber: string;
    phone: string;
    address: string;
  };
  reportMetadata: {
    reportDate: string;
    dateRangeStart: string;
    dateRangeEnd: string;
    reportNumber: string;
  };
  equipmentSummary: {
    totalEquipment: number;
    compliantEquipment: number;
    expiringSoon: number;
    expired: number;
    maintenanceDue: number;
  };
  equipmentDetails: Array<{
    equipmentName: string;
    equipmentType: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    location: string;
    purchaseDate: string;
    expiryDate: string;
    lastMaintenanceDate: string;
    nextMaintenanceDate: string;
    complianceStatus: string;
    status: string;
    conditionRating: number;
  }>;
  maintenanceHistory: Array<{
    ticketNumber: string;
    equipmentName: string;
    serialNumber: string;
    issueDescription: string;
    resolution: string;
    technicianName: string;
    scheduledDate: string;
    completedDate: string;
    status: string;
    category: string;
  }>;
  complianceSummary: {
    nfpaCompliant: boolean;
    totalInspections: number;
    passedInspections: number;
    failedInspections: number;
    upcomingInspections: number;
  };
}

export class PDFReportsRepository {
  /**
   * Get comprehensive report data for a client within a date range
   */
  async getClientReportData(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<ClientReportData | null> {
    try {
      // 1. Get client info
      const clientResult = await pool.query(
        `SELECT 
          c.id,
          c.company_name,
          c.business_type,
          c.street_address,
          c.city,
          c.state,
          c.zip_code,
          c.primary_phone,
          u.email
        FROM clients c
        JOIN "user" u ON c.user_id = u.id
        WHERE c.user_id = $1 AND c.status = 'active'`,
        [userId]
      );

      if (clientResult.rows.length === 0) {
        return null;
      }

      const client = clientResult.rows[0];

      // 2. Get vendor info (the vendor who created this client)
      const vendorResult = await pool.query(
        `SELECT 
          v.company_name,
          v.license_number,
          v.primary_phone,
          v.street_address || ', ' || v.city || ', ' || v.state || ' ' || v.zip_code as address
        FROM vendors v
        WHERE v.id = (SELECT created_by_vendor_id FROM clients WHERE id = $1)`,
        [client.id]
      );

      const vendor = vendorResult.rows[0] || {
        company_name: 'N/A',
        license_number: 'N/A',
        primary_phone: 'N/A',
        address: 'N/A'
      };

      // 3. Get equipment summary
      const summaryResult = await pool.query(
        `SELECT 
          COUNT(*) as total_equipment,
          COUNT(*) FILTER (WHERE compliance_status = 'compliant') as compliant_equipment,
          COUNT(*) FILTER (WHERE compliance_status = 'due_soon' OR 
            (expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')) as expiring_soon,
          COUNT(*) FILTER (WHERE compliance_status = 'expired' OR expiry_date < CURRENT_DATE) as expired,
          COUNT(*) FILTER (WHERE compliance_status = 'overdue' OR 
            (next_maintenance_date IS NOT NULL AND next_maintenance_date < CURRENT_DATE)) as maintenance_due
        FROM equipment_instance
        WHERE assigned_to = $1 AND deleted_at IS NULL`,
        [client.id]
      );

      const summary = summaryResult.rows[0];

      // 4. Get equipment details
      const equipmentResult = await pool.query(
        `SELECT 
          e.equipment_name,
          e.equipment_type,
          e.manufacturer,
          e.model,
          ei.serial_number,
          ei.location,
          TO_CHAR(ei.purchase_date, 'YYYY-MM-DD') as purchase_date,
          TO_CHAR(ei.expiry_date, 'YYYY-MM-DD') as expiry_date,
          TO_CHAR(ei.last_maintenance_date, 'YYYY-MM-DD') as last_maintenance_date,
          TO_CHAR(ei.next_maintenance_date, 'YYYY-MM-DD') as next_maintenance_date,
          ei.compliance_status,
          ei.status,
          ei.condition_rating
        FROM equipment_instance ei
        JOIN equipment e ON ei.equipment_id = e.id
        WHERE ei.assigned_to = $1 
          AND ei.deleted_at IS NULL
        ORDER BY e.equipment_name, ei.serial_number`,
        [client.id]
      );

      // 5. Get maintenance history within date range
      const maintenanceResult = await pool.query(
        `SELECT 
          mt.ticket_number,
          e.equipment_name,
          ei.serial_number,
          mt.issue_description,
          mt.resolution_description,
          COALESCE(u.first_name || ' ' || u.last_name, u.display_name, 'Unassigned') as technician_name,
          TO_CHAR(mt.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
          TO_CHAR(mt.resolved_at, 'YYYY-MM-DD') as completed_date,
          mt.ticket_status,
          mt.category
        FROM maintenance_ticket mt
        JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
        JOIN equipment e ON ei.equipment_id = e.id
        LEFT JOIN "user" u ON mt.assigned_technician = u.id
        WHERE mt.client_id = $1
          AND mt.created_at BETWEEN $2 AND $3
        ORDER BY mt.created_at DESC`,
        [client.id, startDate, endDate]
      );

      // 6. Calculate compliance summary
      const completedTickets = maintenanceResult.rows.filter(
        (t: any) => t.ticket_status === 'resolved' || t.ticket_status === 'closed'
      );
      const totalInspections = maintenanceResult.rows.length;
      const passedInspections = completedTickets.filter(
        (t: any) => !t.issue_description.toLowerCase().includes('fail')
      ).length;
      const upcomingInspections = parseInt(summary.maintenance_due) || 0;

      // Generate report number
      const reportNumber = `FG-${client.id}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      return {
        clientInfo: {
          id: client.id,
          companyName: client.company_name,
          businessType: client.business_type || 'N/A',
          address: client.street_address || 'N/A',
          city: client.city || 'N/A',
          state: client.state || 'N/A',
          zipCode: client.zip_code || 'N/A',
          phone: client.primary_phone || 'N/A',
          email: client.email
        },
        vendorInfo: {
          companyName: vendor.company_name,
          licenseNumber: vendor.license_number,
          phone: vendor.primary_phone,
          address: vendor.address
        },
        reportMetadata: {
          reportDate: new Date().toISOString().split('T')[0],
          dateRangeStart: startDate,
          dateRangeEnd: endDate,
          reportNumber: reportNumber
        },
        equipmentSummary: {
          totalEquipment: parseInt(summary.total_equipment) || 0,
          compliantEquipment: parseInt(summary.compliant_equipment) || 0,
          expiringSoon: parseInt(summary.expiring_soon) || 0,
          expired: parseInt(summary.expired) || 0,
          maintenanceDue: parseInt(summary.maintenance_due) || 0
        },
        equipmentDetails: equipmentResult.rows.map((eq: any) => ({
          equipmentName: eq.equipment_name,
          equipmentType: eq.equipment_type,
          manufacturer: eq.manufacturer || 'N/A',
          model: eq.model || 'N/A',
          serialNumber: eq.serial_number,
          location: eq.location || 'N/A',
          purchaseDate: eq.purchase_date || 'N/A',
          expiryDate: eq.expiry_date,
          lastMaintenanceDate: eq.last_maintenance_date || 'N/A',
          nextMaintenanceDate: eq.next_maintenance_date || 'N/A',
          complianceStatus: eq.compliance_status,
          status: eq.status,
          conditionRating: eq.condition_rating || 0
        })),
        maintenanceHistory: maintenanceResult.rows.map((mt: any) => ({
          ticketNumber: mt.ticket_number,
          equipmentName: mt.equipment_name,
          serialNumber: mt.serial_number,
          issueDescription: mt.issue_description,
          resolution: mt.resolution_description || 'Pending',
          technicianName: mt.technician_name,
          scheduledDate: mt.scheduled_date || 'N/A',
          completedDate: mt.completed_date || 'In Progress',
          status: mt.ticket_status,
          category: mt.category || 'General'
        })),
        complianceSummary: {
          nfpaCompliant: (parseInt(summary.compliant_equipment) || 0) >= (parseInt(summary.total_equipment) || 1) * 0.9,
          totalInspections: totalInspections,
          passedInspections: passedInspections,
          failedInspections: totalInspections - passedInspections,
          upcomingInspections: upcomingInspections
        }
      };
    } catch (error) {
      console.error('Error fetching client report data:', error);
      throw error;
    }
  }
}
