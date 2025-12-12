-- Fix compliance status logic to correctly handle overdue vs due_soon
-- The issue: "due_soon" was showing for overdue maintenance because the condition
-- checked next_maintenance_date <= CURRENT_DATE + 30 days (which includes past dates)

-- Update the compliance status function
CREATE OR REPLACE FUNCTION update_compliance_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.compliance_status := CASE 
        -- Check expired first (expiry_date in the past)
        WHEN NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN 'expired'
        -- Check overdue (maintenance date in the past)
        WHEN NEW.next_maintenance_date IS NOT NULL AND NEW.next_maintenance_date < CURRENT_DATE THEN 'overdue'
        -- Check due soon (maintenance date between today and 30 days from now)
        WHEN NEW.next_maintenance_date IS NOT NULL AND NEW.next_maintenance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        -- Otherwise compliant
        ELSE 'compliant'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update all existing equipment instances to recalculate compliance status
UPDATE equipment_instance 
SET updated_at = CURRENT_TIMESTAMP
WHERE deleted_at IS NULL;

-- Verify the update
SELECT 
    compliance_status,
    COUNT(*) as count
FROM equipment_instance
WHERE deleted_at IS NULL
GROUP BY compliance_status
ORDER BY compliance_status;
