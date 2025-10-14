-- Additional Vendor Tables for Detailed Information
-- Run this after the existing schema.sql

-- Vendor Company Details Table
CREATE TABLE vendor_company (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    license_number VARCHAR(100),
    tax_id VARCHAR(100),
    website VARCHAR(255),
    years_in_business INTEGER DEFAULT 0,
    employee_count INTEGER DEFAULT 1,
    service_areas TEXT,
    certifications TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Contact Information Table
CREATE TABLE vendor_contact (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
    contact_person_name VARCHAR(100) NOT NULL,
    contact_title VARCHAR(100),
    primary_email VARCHAR(100) NOT NULL,
    secondary_email VARCHAR(100),
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Address Information Table
CREATE TABLE vendor_address (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Sri Lanka',
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Specializations Table (many-to-many relationship)
CREATE TABLE specialization (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendor_specialization (
    vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
    specialization_id INT REFERENCES specialization(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(vendor_id, specialization_id)
);

-- Insert default specializations
INSERT INTO specialization (name, category) VALUES
('Fire Extinguishers', 'Equipment'),
('Sprinkler Systems', 'Equipment'),
('Fire Alarms', 'Equipment'),
('Emergency Lighting', 'Equipment'),
('Fire Suppression Systems', 'Equipment'),
('Exit Signs', 'Equipment'),
('Emergency Equipment', 'Equipment'),
('Fire Safety Inspections', 'Service'),
('Fire Safety Training', 'Service'),
('Hazmat Services', 'Service');

-- Add indexes for better performance
CREATE INDEX idx_vendor_company_vendor_id ON vendor_company(vendor_id);
CREATE INDEX idx_vendor_contact_vendor_id ON vendor_contact(vendor_id);
CREATE INDEX idx_vendor_address_vendor_id ON vendor_address(vendor_id);
CREATE INDEX idx_vendor_specialization_vendor_id ON vendor_specialization(vendor_id);
CREATE INDEX idx_vendor_company_company_name ON vendor_company(company_name);
CREATE INDEX idx_vendor_contact_primary_email ON vendor_contact(primary_email);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendor_company_updated_at BEFORE UPDATE ON vendor_company FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_contact_updated_at BEFORE UPDATE ON vendor_contact FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_address_updated_at BEFORE UPDATE ON vendor_address FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();