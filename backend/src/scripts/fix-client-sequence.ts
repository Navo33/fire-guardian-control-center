#!/usr/bin/env node

/**
 * Fix client sequence issue
 */

import dotenv from 'dotenv';
import { pool, closePool } from '../config/database';

// Load environment variables
dotenv.config();

async function fixClientSequence() {
  try {
    console.log('🔧 Fixing client sequence...');
    
    // Get the current max ID from clients table
    const maxIdResult = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM clients');
    const maxId = maxIdResult.rows[0].max_id;
    
    console.log(`📊 Current max client ID: ${maxId}`);
    
    // Set the sequence to the next available value
    const nextId = maxId + 1;
    await pool.query('SELECT setval(\'client_id_seq\', $1, false)', [nextId]);
    
    console.log(`✅ Client sequence reset to ${nextId}`);
    
    // Verify the sequence
    const seqResult = await pool.query('SELECT nextval(\'client_id_seq\')');
    console.log(`🔍 Next client ID will be: ${seqResult.rows[0].nextval}`);
    
  } catch (error) {
    console.error('❌ Error fixing client sequence:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

fixClientSequence();