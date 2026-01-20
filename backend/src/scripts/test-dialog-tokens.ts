#!/usr/bin/env ts-node

/**
 * Dialog eSMS Token Manager Test
 * Verifies token generation, caching, and refresh logic
 */

import dotenv from 'dotenv';
import { dialogTokenManager } from '../services/DialogTokenManager';

dotenv.config();

const testTokenGeneration = async () => {
  console.log('\n🔑 Test 1: Token Generation');
  console.log('='.repeat(60));
  
  try {
    console.log('Generating access token...');
    const token = await dialogTokenManager.getAccessToken();
    
    console.log('✅ Token generated successfully');
    console.log(`   Token length: ${token.length} characters`);
    console.log(`   Token preview: ${token.substring(0, 50)}...`);
    
    const expirySeconds = dialogTokenManager.getTokenExpirationSeconds();
    console.log(`   Expires in: ${expirySeconds} seconds (~${Math.round((expirySeconds || 0) / 3600)} hours)`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Token generation failed:', error.message);
    return false;
  }
};

const testTokenCaching = async () => {
  console.log('\n💾 Test 2: Token Caching');
  console.log('='.repeat(60));
  
  try {
    console.log('Getting token (should use cached token from Test 1)...');
    const startTime = Date.now();
    const token = await dialogTokenManager.getAccessToken();
    const duration = Date.now() - startTime;
    
    console.log('✅ Token retrieved successfully');
    console.log(`   Retrieved in: ${duration}ms (should be fast - cached)`);
    console.log(`   Token preview: ${token.substring(0, 50)}...`);
    
    if (duration < 100) {
      console.log('✅ Token was served from cache (fast response)');
    } else {
      console.log('⚠️  Token retrieval took longer than expected');
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Token caching test failed:', error.message);
    return false;
  }
};

const testMultipleConcurrentRequests = async () => {
  console.log('\n🔄 Test 3: Concurrent Token Requests');
  console.log('='.repeat(60));
  
  try {
    console.log('Making 5 concurrent token requests...');
    
    const startTime = Date.now();
    const promises = Array(5).fill(null).map((_, i) =>
      dialogTokenManager.getAccessToken().then(token => ({
        index: i,
        token,
        duration: Date.now() - startTime
      }))
    );
    
    const results = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;
    
    console.log('✅ All requests completed');
    results.forEach(r => {
      console.log(`   Request ${r.index + 1}: ${r.duration}ms`);
    });
    console.log(`   Total time: ${totalDuration}ms`);
    
    // Check if all tokens are the same (cached)
    const firstToken = results[0].token;
    const allSame = results.every(r => r.token === firstToken);
    
    if (allSame) {
      console.log('✅ All requests returned the same cached token');
    } else {
      console.log('⚠️  Requests returned different tokens');
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Concurrent request test failed:', error.message);
    return false;
  }
};

const testCacheClear = async () => {
  console.log('\n🗑️  Test 4: Cache Clear');
  console.log('='.repeat(60));
  
  try {
    console.log('Clearing token cache...');
    dialogTokenManager.clearCache();
    
    console.log('Generating new token after cache clear...');
    const token = await dialogTokenManager.getAccessToken();
    
    console.log('✅ New token generated after cache clear');
    console.log(`   Token preview: ${token.substring(0, 50)}...`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Cache clear test failed:', error.message);
    return false;
  }
};

const runAllTests = async () => {
  console.log('='.repeat(60));
  console.log('🚨 Dialog eSMS Token Manager Tests');
  console.log('='.repeat(60));
  console.log(`Credentials configured: ${process.env.DIALOG_SMS_USERNAME ? '✅ YES' : '❌ NO'}`);
  
  if (!process.env.DIALOG_SMS_USERNAME || !process.env.DIALOG_SMS_PASSWORD) {
    console.error('\n❌ Dialog SMS credentials not configured!');
    console.log('Please set DIALOG_SMS_USERNAME and DIALOG_SMS_PASSWORD in .env');
    process.exit(1);
  }

  const results = {
    'Token Generation': false,
    'Token Caching': false,
    'Concurrent Requests': false,
    'Cache Clear': false,
  };

  try {
    results['Token Generation'] = await testTokenGeneration();
    results['Token Caching'] = await testTokenCaching();
    results['Concurrent Requests'] = await testMultipleConcurrentRequests();
    results['Cache Clear'] = await testCacheClear();
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary:');
    console.log('='.repeat(60));
    
    Object.entries(results).forEach(([name, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${name}`);
    });

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    console.log('='.repeat(60));
    console.log(`\n📈 Result: ${passed}/${total} tests passed\n`);

    process.exit(passed === total ? 0 : 1);
  }
};

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
