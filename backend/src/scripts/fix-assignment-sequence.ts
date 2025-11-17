#!/usr/bin/env ts-node
/**
 * Fix equipment_assignment sequence issue
 * This script resets the sequence to avoid primary key conflicts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fire_guardian_db',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function fixAssignmentSequence() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing equipment_assignment sequence...');

    // Get the current maximum ID from the table
    const maxIdResult = await client.query(`
      SELECT COALESCE(MAX(id), 0) as max_id 
      FROM equipment_assignment
    `);
    
    const maxId = parseInt(maxIdResult.rows[0].max_id);
    console.log(`📊 Current maximum ID in equipment_assignment: ${maxId}`);

    // Get current sequence value
    const seqResult = await client.query(`
      SELECT last_value FROM equipment_assignment_id_seq
    `);
    
    const currentSeqValue = parseInt(seqResult.rows[0].last_value);
    console.log(`📊 Current sequence value: ${currentSeqValue}`);

    // Reset sequence to max_id + 1
    const newSeqValue = maxId + 1;
    
    await client.query(`
      SELECT setval('equipment_assignment_id_seq', $1, false)
    `, [newSeqValue]);

    console.log(`✅ Sequence reset to: ${newSeqValue}`);

    // Verify the fix
    const verifyResult = await client.query(`
      SELECT last_value FROM equipment_assignment_id_seq
    `);
    
    console.log(`✅ Verified sequence value: ${verifyResult.rows[0].last_value}`);
    console.log('🎉 Equipment assignment sequence fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing sequence:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixAssignmentSequence()
  .then(() => {
    console.log('✅ Sequence fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sequence fix failed:', error);
    process.exit(1);
  });