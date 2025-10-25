/**
 * Database Seed Runner
 * Manages seeding of initial data using SQL file
 */

import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed all initial data using SQL file
 */
export const seedAll = async (): Promise<void> => {
  console.log('🌱 Seeding database...');
  
  try {
    const seedSqlPath = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedSqlPath, 'utf-8');
    
    // Execute the seed SQL
    await pool.query(seedSql);
    
    console.log('✅ All seed data loaded successfully');
    console.log('🔑 Admin credentials: admin@fireguardian.com | FireGuardian2024!');
    console.log('🔑 Vendor credentials: VendorPass2025!');
    console.log('🔑 Client credentials: ClientPass2025!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};
