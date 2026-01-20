#!/usr/bin/env ts-node

/**
 * Emergency Warnings Diagnostic Test Script
 * Tests RSS feed fetching and identifies hanging issues
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

dotenv.config();

const RSS_URL = 'https://www.dmc.gov.lk/index.php?option=com_content&view=category&layout=blog&id=16&Itemid=237&format=feed&type=rss&lang=en';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

const testRSSFeedFetch = async (): Promise<TestResult> => {
  const name = '🌐 RSS Feed Fetch';
  const start = Date.now();
  
  try {
    console.log('\n' + name + '...');
    const response = await axios.get(RSS_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Fire Guardian Control Center/1.0'
      }
    });
    
    const duration = Date.now() - start;
    console.log(`✅ HTTP Status: ${response.status}`);
    console.log(`✅ Response size: ${response.data.length} bytes`);
    console.log(`✅ Content-Type: ${response.headers['content-type']}`);
    console.log(`✅ Completed in ${duration}ms`);
    
    return { name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error: ${errorMsg}`);
    return { name, passed: false, duration, error: errorMsg };
  }
};

const testXMLParsing = async (): Promise<TestResult> => {
  const name = '📄 XML Parsing';
  const start = Date.now();
  
  try {
    console.log('\n' + name + '...');
    const response = await axios.get(RSS_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Fire Guardian Control Center/1.0'
      }
    });
    
    const parsed = await parseStringPromise(response.data, { explicitArray: false });
    const channel = parsed.rss.channel;
    
    const duration = Date.now() - start;
    console.log(`✅ Feed Title: ${channel.title}`);
    console.log(`✅ Feed Link: ${channel.link}`);
    console.log(`✅ Last Build Date: ${channel.lastBuildDate}`);
    
    if (channel.item) {
      const itemArray = Array.isArray(channel.item) ? channel.item : [channel.item];
      console.log(`✅ Items found: ${itemArray.length}`);
      if (itemArray.length > 0) {
        console.log(`   First item: ${itemArray[0].title}`);
      }
    } else {
      console.log(`⚠️  No items found in feed (empty feed)`);
    }
    
    console.log(`✅ Completed in ${duration}ms`);
    
    return { name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error: ${errorMsg}`);
    return { name, passed: false, duration, error: errorMsg };
  }
};

const testMultipleRequests = async (): Promise<TestResult> => {
  const name = '🔄 Multiple Requests (5x)';
  const start = Date.now();
  
  try {
    console.log('\n' + name + '...');
    
    for (let i = 0; i < 5; i++) {
      const reqStart = Date.now();
      try {
        const response = await axios.get(RSS_URL, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Fire Guardian Control Center/1.0'
          }
        });
        const reqDuration = Date.now() - reqStart;
        console.log(`  ✅ Request ${i + 1}: ${response.status} (${reqDuration}ms)`);
      } catch (error) {
        const reqDuration = Date.now() - reqStart;
        console.error(`  ❌ Request ${i + 1}: ${error instanceof Error ? error.message : String(error)} (${reqDuration}ms)`);
        throw error;
      }
    }
    
    const duration = Date.now() - start;
    console.log(`✅ All requests completed in ${duration}ms (avg: ${(duration / 5).toFixed(0)}ms)`);
    
    return { name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error: ${errorMsg}`);
    return { name, passed: false, duration, error: errorMsg };
  }
};

const testTimeoutBehavior = async (): Promise<TestResult> => {
  const name = '⏱️  Timeout Behavior';
  const start = Date.now();
  
  try {
    console.log('\n' + name + '...');
    console.log('   Testing with 2-second timeout...');
    
    const response = await axios.get(RSS_URL, {
      timeout: 2000, // Short timeout
      headers: {
        'User-Agent': 'Fire Guardian Control Center/1.0'
      }
    });
    
    const duration = Date.now() - start;
    console.log(`✅ Completed in ${duration}ms (within timeout)`);
    
    return { name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes('timeout')) {
      console.log(`✅ Timeout correctly triggered after 2 seconds`);
      return { name, passed: true, duration };
    } else {
      console.error(`❌ Error: ${errorMsg}`);
      return { name, passed: false, duration, error: errorMsg };
    }
  }
};

const runAllTests = async () => {
  console.log('='.repeat(70));
  console.log('🚨 Emergency Warnings Feed Diagnostic Tests');
  console.log('='.repeat(70));
  console.log(`Target URL: ${RSS_URL}`);
  console.log('='.repeat(70));

  try {
    results.push(await testRSSFeedFetch());
    results.push(await testXMLParsing());
    results.push(await testMultipleRequests());
    results.push(await testTimeoutBehavior());
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
  } finally {
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 Test Summary:');
    console.log('='.repeat(70));
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const errorMsg = result.error ? ` - ${result.error}` : '';
      console.log(`${status} | ${result.name.padEnd(30)} | ${result.duration}ms${errorMsg}`);
    });

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log('='.repeat(70));
    console.log(`\n📈 Result: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('✅ All tests passed! RSS feed is accessible.');
    } else {
      console.log('❌ Some tests failed. See details above.');
    }

    process.exit(passed === total ? 0 : 1);
  }
};

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
