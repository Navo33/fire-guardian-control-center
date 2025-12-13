const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fire_guardian',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function testTemporaryPassword() {
  try {
    console.log('Testing temporary password flag...\n');
    
    // Check all users with their is_temporary_password status
    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        user_type,
        is_temporary_password,
        last_password_change
      FROM "user" 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('Recent users:');
    console.table(result.rows);
    
    // Count users with temporary passwords
    const tempCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM "user"
      WHERE is_temporary_password = true
      AND deleted_at IS NULL
    `);
    
    console.log(`\nUsers with temporary passwords: ${tempCount.rows[0].count}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

testTemporaryPassword();
