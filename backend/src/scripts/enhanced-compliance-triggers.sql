-- Enhanced compliance trigger that creates both notifications AND maintenance tickets
-- This replaces the existing create_notification() function

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_notify_compliance ON public.equipment_instance;
DROP FUNCTION IF EXISTS create_notification();

-- Enhanced function that creates notifications and maintenance tickets
CREATE OR REPLACE FUNCTION create_maintenance_notification_and_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification (existing logic)
    IF NEW.compliance_status IN ('expired', 'overdue', 'due_soon') THEN
        INSERT INTO public.notification (user_id, title, message, type, priority, category, created_at)
        SELECT 
            v.user_id,
            CASE NEW.compliance_status
                WHEN 'expired' THEN 'Equipment Expired'
                WHEN 'overdue' THEN 'Maintenance Overdue'
                ELSE 'Maintenance Due Soon'
            END,
            'Equipment ' || NEW.serial_number || ' is ' || NEW.compliance_status || '. Action required by ' || COALESCE(NEW.next_maintenance_date::text, NEW.expiry_date::text),
            'alert',
            CASE NEW.compliance_status WHEN 'expired' THEN 'high' ELSE 'normal' END,
            'equipment',
            CURRENT_TIMESTAMP
        FROM public.vendors v
        WHERE v.id = NEW.vendor_id;
        
        -- Auto-create maintenance ticket for overdue equipment (NEW LOGIC)
        IF NEW.compliance_status = 'overdue' AND NOT EXISTS (
            SELECT 1 FROM maintenance_ticket 
            WHERE equipment_instance_id = NEW.id 
              AND ticket_status IN ('open', 'resolved')
              AND support_type = 'maintenance'
        ) THEN
            -- Get equipment details for ticket description
            INSERT INTO maintenance_ticket (
                equipment_instance_id, 
                client_id, 
                vendor_id,
                ticket_status, 
                support_type, 
                priority,
                issue_description, 
                category
            )
            SELECT 
                NEW.id,
                NEW.assigned_to,
                NEW.vendor_id,
                'open',
                'maintenance',
                'normal',
                'Automated maintenance ticket for overdue equipment.' || E'\n' ||
                'Equipment: ' || e.equipment_name || ' (' || e.equipment_type || ')' || E'\n' ||
                'Serial Number: ' || NEW.serial_number || E'\n' ||
                'Last Maintenance Due: ' || COALESCE(NEW.next_maintenance_date::text, 'Not scheduled') || E'\n' ||
                'Client: ' || COALESCE(c.company_name, 'Unassigned') || E'\n' || E'\n' ||
                'This ticket was automatically created by the system when equipment became overdue for maintenance.',
                'Scheduled Maintenance'
            FROM public.equipment e
            LEFT JOIN public.clients c ON NEW.assigned_to = c.id
            WHERE e.id = NEW.equipment_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the enhanced trigger
CREATE TRIGGER trigger_notify_compliance_and_create_tickets
    AFTER INSERT OR UPDATE OF compliance_status ON public.equipment_instance
    FOR EACH ROW
    EXECUTE FUNCTION create_maintenance_notification_and_ticket();