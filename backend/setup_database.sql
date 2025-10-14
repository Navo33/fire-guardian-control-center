-- PostgreSQL Setup Script for Fire Guardian
-- Run this script as the postgres superuser

-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE firgardian_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'firgardian_db')\gexec

-- Connect to the fire guardian database
\c firgardian_db

-- Create user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'firgardian_user') THEN
        CREATE ROLE firgardian_user WITH LOGIN PASSWORD 'fire1234';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE firgardian_db TO firgardian_user;
GRANT USAGE ON SCHEMA public TO firgardian_user;
GRANT CREATE ON SCHEMA public TO firgardian_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO firgardian_user;

-- Grant permissions on all tables (for existing and future tables)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO firgardian_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO firgardian_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO firgardian_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO firgardian_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO firgardian_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO firgardian_user;

-- Display confirmation
SELECT 'Database setup completed successfully!' as status;