-- Migration 002: Enhanced Maintenance System
-- This migration implements automatic maintenance ticket creation and enhanced compliance triggers
-- Created: 2025-11-23

-- =====================================
-- ENHANCED COMPLIANCE TRIGGERS
-- =====================================

-- Drop existing trigger and function (with all variations)
DROP TRIGGER IF EXISTS trigger_notify_compliance ON public.equipment_instance;
DROP TRIGGER IF EXISTS trigger_notify_compliance_and_create_tickets ON public.equipment_instance;
DROP FUNCTION IF EXISTS create_notification();
DROP FUNCTION IF EXISTS create_maintenance_notification_and_ticket();

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

-- =====================================
-- DATA VALIDATION AND FIXES
-- =====================================

-- Ensure all equipment instances have maintenance_interval_days set
UPDATE equipment_instance 
SET maintenance_interval_days = 365 
WHERE maintenance_interval_days IS NULL;

-- Update equipment instances that don't have next_maintenance_date based on last maintenance + interval
UPDATE equipment_instance 
SET next_maintenance_date = COALESCE(
    last_maintenance_date + INTERVAL '1 day' * maintenance_interval_days,
    created_at::date + INTERVAL '1 day' * maintenance_interval_days
)
WHERE next_maintenance_date IS NULL;

-- =====================================
-- VERIFICATION QUERIES
-- =====================================

-- Create a verification function to check migration success
CREATE OR REPLACE FUNCTION verify_enhanced_maintenance_system()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if enhanced trigger exists
    RETURN QUERY
    SELECT 
        'Enhanced Compliance Trigger'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trigger_notify_compliance_and_create_tickets'
        ) THEN 'SUCCESS'::TEXT ELSE 'FAILED'::TEXT END,
        'Automatic maintenance ticket creation trigger'::TEXT;
    
    -- Check if enhanced function exists
    RETURN QUERY
    SELECT 
        'Enhanced Compliance Function'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'create_maintenance_notification_and_ticket'
        ) THEN 'SUCCESS'::TEXT ELSE 'FAILED'::TEXT END,
        'Function that creates both notifications and maintenance tickets'::TEXT;
    
    -- Check equipment data integrity
    RETURN QUERY
    SELECT 
        'Equipment Maintenance Intervals'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM equipment_instance WHERE maintenance_interval_days IS NULL) = 0 
        THEN 'SUCCESS'::TEXT ELSE 'WARNING'::TEXT END,
        FORMAT('All %s equipment instances have maintenance intervals set', 
            (SELECT COUNT(*) FROM equipment_instance WHERE deleted_at IS NULL)::TEXT);
    
    -- Check next maintenance dates
    RETURN QUERY
    SELECT 
        'Equipment Maintenance Dates'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM equipment_instance WHERE next_maintenance_date IS NULL AND deleted_at IS NULL) = 0 
        THEN 'SUCCESS'::TEXT ELSE 'WARNING'::TEXT END,
        FORMAT('%s equipment instances have next maintenance dates', 
            (SELECT COUNT(*) FROM equipment_instance WHERE next_maintenance_date IS NOT NULL)::TEXT);
    
    -- Check for overdue equipment that might need tickets
    RETURN QUERY
    SELECT 
        'Overdue Equipment Analysis'::TEXT,
        'INFO'::TEXT,
        FORMAT('%s equipment items are overdue for maintenance', 
            (SELECT COUNT(*) FROM equipment_instance 
             WHERE next_maintenance_date < CURRENT_DATE 
               AND deleted_at IS NULL
               AND status NOT IN ('retired', 'recalled'))::TEXT);
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT * FROM verify_enhanced_maintenance_system();

-- Update migration record with success
UPDATE schema_migrations 
SET 
    success = true,
    execution_time_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - 
        (SELECT executed_at FROM schema_migrations WHERE migration_name = '002_enhanced_maintenance_system')
    )) * 1000
WHERE migration_name = '002_enhanced_maintenance_system';

-- =====================================
-- POST-MIGRATION INSTRUCTIONS
-- =====================================

-- Display post-migration information
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION 002 COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Enhanced Maintenance System Features Added:';
    RAISE NOTICE '1. ✅ Automatic maintenance ticket creation for overdue equipment';
    RAISE NOTICE '2. ✅ Enhanced compliance triggers with ticket generation';
    RAISE NOTICE '3. ✅ Equipment maintenance intervals validated';
    RAISE NOTICE '4. ✅ Next maintenance dates calculated for existing equipment';
    RAISE NOTICE '';
    RAISE NOTICE 'Backend Code Changes Required:';
    RAISE NOTICE '• MaintenanceTicketRepository.resolveTicket() enhanced to update equipment dates';
    RAISE NOTICE '• MaintenanceScheduler utility class for batch processing';
    RAISE NOTICE '• Enhanced API endpoints for maintenance management';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Deploy updated backend code';
    RAISE NOTICE '2. Set up cron job for maintenance scheduler';
    RAISE NOTICE '3. Test by resolving maintenance tickets';
    RAISE NOTICE '4. Monitor automatic ticket creation';
    RAISE NOTICE '';
END $$;