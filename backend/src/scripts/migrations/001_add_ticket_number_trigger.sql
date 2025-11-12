-- Migration: Add automatic ticket number generation trigger
-- This trigger will automatically generate ticket numbers in the format TKT-YYYYMMDD-XXX

-- First, create a sequence for daily ticket numbers
CREATE SEQUENCE IF NOT EXISTS daily_ticket_seq;

-- Create a function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    date_str TEXT;
    daily_count INTEGER;
    ticket_num TEXT;
BEGIN
    -- Get current date in YYYYMMDD format
    date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get the count of tickets created today + 1
    SELECT COALESCE(MAX(
        CASE 
            WHEN ticket_number LIKE 'TKT-' || date_str || '-%' 
            THEN CAST(SPLIT_PART(ticket_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO daily_count
    FROM maintenance_ticket
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Generate ticket number
    ticket_num := 'TKT-' || date_str || '-' || LPAD(daily_count::TEXT, 3, '0');
    
    -- Ensure uniqueness (in case of race condition)
    WHILE EXISTS (SELECT 1 FROM maintenance_ticket WHERE ticket_number = ticket_num) LOOP
        daily_count := daily_count + 1;
        ticket_num := 'TKT-' || date_str || '-' || LPAD(daily_count::TEXT, 3, '0');
    END LOOP;
    
    -- Set the ticket number
    NEW.ticket_number := ticket_num;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_generate_ticket_number ON maintenance_ticket;
CREATE TRIGGER auto_generate_ticket_number
    BEFORE INSERT ON maintenance_ticket
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
    EXECUTE FUNCTION generate_ticket_number();

-- Update existing records that might have empty ticket numbers
UPDATE maintenance_ticket 
SET ticket_number = 'TKT-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(id::TEXT, 3, '0')
WHERE ticket_number IS NULL OR ticket_number = '';