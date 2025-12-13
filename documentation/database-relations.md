# Fire Guardian Control Center - Database Relations

## Core Entities and Relationships

### 1. **User Management**
```
user (Central user table)
├── vendors (1:1 with user where user_type='vendor')
├── clients (1:1 with user where user_type='client') 
├── role (Many users can have same role)
└── system_settings (updated_by references user)
```

### 2. **Vendor-Client Ecosystem**
```
vendors
├── clients (created_by_vendor_id - vendors can create client accounts)
├── equipment_instance (vendor_id - vendors own equipment)
├── vendor_specialization (Many-to-Many with specialization)
├── equipment_assignment (vendor assigns equipment to clients)
└── maintenance_ticket (vendor handles tickets)
```

### 3. **Equipment Management**
```
equipment (Master catalog/types)
└── equipment_instance (Actual physical equipment)
    ├── vendor_id (Who owns it)
    ├── assigned_to (Which client it's assigned to)
    ├── equipment_assignment (Assignment records)
    └── maintenance_ticket (Service tickets)
```

### 4. **Service & Maintenance**
```
maintenance_ticket
├── equipment_instance_id (What equipment)
├── client_id (Which client)
├── vendor_id (Which vendor handles it)
├── assigned_technician (user_id of technician)
└── ticket_status ('open', 'resolved', 'closed')
```

### 5. **Assignments & Tracking**
```
equipment_assignment (Assignment batches)
├── client_id
├── vendor_id
└── assignment_item (Individual equipment in assignment)
    └── equipment_instance_id
```

### 6. **Notifications & Alerts**
```
notification
├── user_id (Who gets notified)
├── type ('info', 'alert', 'warning')
├── priority ('normal', 'high')
└── category ('equipment', 'maintenance', 'system')
```

### 7. **Compliance & Status Tracking**
```
equipment_instance
├── compliance_status ('compliant', 'expired', 'overdue', 'due_soon')
├── expiry_date (When equipment expires)
├── next_maintenance_date (When maintenance is due)
└── status ('available', 'assigned', 'maintenance')
```

## Key Business Logic

### Compliance Status Auto-Calculation
- **expired**: expiry_date < CURRENT_DATE
- **overdue**: next_maintenance_date < CURRENT_DATE  
- **due_soon**: next_maintenance_date <= CURRENT_DATE + 30 days
- **compliant**: Everything up to date

### Automatic Notifications
- Triggers auto-generate notifications when compliance_status changes
- Notifications sent to vendor's user_id when their equipment has issues

### Critical Alerts Logic
- Based on notification table with type='alert' and priority='high'
- Equipment with 'expired' or 'overdue' status generates high priority alerts

### Vendor Statistics
- **Active Vendors**: user_type='vendor' AND deleted_at IS NULL
- **Total Equipment**: COUNT(equipment_instance) per vendor
- **Client Count**: COUNT(DISTINCT assigned_to) from equipment_instance

### Maintenance Metrics
- **Pending Inspections**: next_maintenance_date <= CURRENT_DATE + 7 days
- **Overdue Maintenance**: next_maintenance_date < CURRENT_DATE
- **Open Tickets**: ticket_status = 'open'

## Views Available
1. **vendor_compliance**: Vendor-level compliance summary
2. **equipment_inventory**: Full equipment overview with relationships
3. **compliance_report**: Aggregated compliance metrics per vendor