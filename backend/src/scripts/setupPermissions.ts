import { pool } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

const setupPermissions = async () => {
  try {
    console.log('🔄 Setting up database permissions...');
    
    const dbUser = process.env.DB_USER;
    if (!dbUser) {
      throw new Error('DB_USER not found in environment variables');
    }

    // Grant schema permissions
    await pool.query(`GRANT USAGE ON SCHEMA public TO ${dbUser}`);
    await pool.query(`GRANT CREATE ON SCHEMA public TO ${dbUser}`);
    await pool.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO ${dbUser}`);

    // Grant table permissions
    await pool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${dbUser}`);
    await pool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${dbUser}`);

    // Set default privileges
    await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${dbUser}`);
    await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${dbUser}`);

    console.log('✅ Database permissions set successfully');
    
  } catch (error: any) {
    if (error.code === '42501') {
      console.error('❌ Need superuser privileges to grant permissions');
      console.error('Please run as postgres superuser or use the setup_database.sql script');
    } else {
      console.error('❌ Error setting up permissions:', error.message);
    }
    throw error;
  } finally {
    await pool.end();
  }
};

setupPermissions().catch(process.exit);