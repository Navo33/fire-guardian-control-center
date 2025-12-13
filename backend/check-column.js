const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fire_guardian',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function checkColumn() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user' AND column_name = 'is_temporary_password'
    `);
    
    console.log('Column exists:', result.rows.length > 0 ? 'YES' : 'NO');
    if (result.rows.length > 0) {
      console.log('Column details:', result.rows[0]);
    } else {
      console.log('Column NOT FOUND in user table');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkColumn();
