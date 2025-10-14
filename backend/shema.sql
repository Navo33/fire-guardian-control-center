-- ------------------------------
-- FirGardian Database Schema
-- ------------------------------

-- Users Table
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    display_name VARCHAR(100) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('admin','vendor','client')),
    role_id INT,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMP NULL,
    failed_login_attempts SMALLINT DEFAULT 0,
    last_login TIMESTAMP NULL,
    last_login_ip VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Roles & Permissions
CREATE TABLE role (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permission (
    id SERIAL PRIMARY KEY,
    permission_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permission (
    role_id INT REFERENCES role(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permission(id) ON DELETE CASCADE,
    granted_by INT REFERENCES "user"(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(role_id, permission_id)
);

-- Vendors / Client Locations (if needed)
CREATE TABLE vendor_location (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES "user"(id),
    location_name VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment Master Table
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    equipment_code VARCHAR(50) UNIQUE,
    equipment_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Equipment Instances (like batches)
CREATE TABLE equipment_instance (
    id SERIAL PRIMARY KEY,
    equipment_id INT REFERENCES equipment(id),
    serial_number VARCHAR(100) UNIQUE,
    vendor_location_id INT REFERENCES vendor_location(id),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','maintenance','retired')),
    assigned_to INT REFERENCES "user"(id) NULL,
    assigned_at TIMESTAMP NULL,
    due_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Equipment Assignments (like sales)
CREATE TABLE equipment_assignment (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES "user"(id),
    assigned_by INT REFERENCES "user"(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
    notes TEXT
);

CREATE TABLE assignment_item (
    assignment_id INT REFERENCES equipment_assignment(id),
    equipment_instance_id INT REFERENCES equipment_instance(id),
    PRIMARY KEY(assignment_id, equipment_instance_id)
);

-- Equipment Returns
CREATE TABLE equipment_return (
    id SERIAL PRIMARY KEY,
    assignment_id INT REFERENCES equipment_assignment(id),
    returned_by INT REFERENCES "user"(id),
    return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
    notes TEXT
);

CREATE TABLE equipment_return_item (
    return_id INT REFERENCES equipment_return(id),
    equipment_instance_id INT REFERENCES equipment_instance(id),
    PRIMARY KEY(return_id, equipment_instance_id)
);

-- Notifications
CREATE TABLE notification (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(10) DEFAULT 'info' CHECK (type IN ('info','warning','error','success')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL
);

-- Audit Logs
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id JSONB NOT NULL,
    action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('INSERT','UPDATE','DELETE','LOGIN','LOGOUT')),
    changes JSONB NULL,
    metadata JSONB NULL,
    changed_by INT REFERENCES "user"(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Resets
CREATE TABLE password_reset (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
