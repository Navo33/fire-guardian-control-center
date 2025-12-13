const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fire_guardian',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function addColumn() {
  try {
    console.log('Adding is_temporary_password column to user table...');
    
    // Add the column
    await pool.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS is_temporary_password BOOLEAN DEFAULT false;
    `);
    console.log('✅ Column added successfully');
    
    // Add index for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_is_temporary_password 
      ON "user" (is_temporary_password);
    `);
    console.log('✅ Index created successfully');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user' AND column_name = 'is_temporary_password'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verification successful:', result.rows[0]);
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

addColumn();
