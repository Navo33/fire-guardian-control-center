#!/usr/bin/env ts-node

/**
 * Dialog eSMS Send Test Script
 * Simple test to send SMS to a phone number and debug the configuration
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Set TEST_PHONE environment variable or provide it as command line argument
const TEST_PHONE = process.env.TEST_PHONE || process.argv[2];
const LOGIN_URL = 'https://e-sms.dialog.lk/api/v1/login';
const SMS_URL = 'https://e-sms.dialog.lk/api/v1/sms';

interface LoginResponse {
  status: string;
  comment: string;
  token?: string;
  refreshToken?: string;
  expiration?: number;
  userData?: any;
  errCode?: string;
}

interface SMSResponse {
  status: string;
  message?: string;
  transactionId?: string;
  errCode?: string;
  data?: any;
  comment?: string;
}

const testSmsSend = async () => {
  console.log('='.repeat(70));
  console.log('🚨 Dialog eSMS Send Test');
  console.log('='.repeat(70));

  const username = process.env.DIALOG_SMS_USERNAME;
  const password = process.env.DIALOG_SMS_PASSWORD;
  const sourceAddress = process.env.DIALOG_SMS_SOURCE_ADDRESS;

  if (!TEST_PHONE) {
    console.error('\n❌ Missing TEST_PHONE. Provide via:');
    console.error('   Option 1: npx ts-node src/scripts/test-sms-send.ts +94702053903');
    console.error('   Option 2: TEST_PHONE=+94702053903 npx ts-node src/scripts/test-sms-send.ts');
    process.exit(1);
  }

  // Phone number: extract just 9 digits (without country code)
  const phoneDigits = TEST_PHONE.replace(/\D/g, '').slice(-9);

  console.log('\n📋 Configuration:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Source Address: ${sourceAddress}`);
  console.log(`   Test Phone: ${TEST_PHONE}`);
  console.log(`   Formatted (9 digits): ${phoneDigits}`);

  if (!username || !password || !sourceAddress) {
    console.error('\n❌ Missing required environment variables');
    process.exit(1);
  }

  try {
    // Step 1: Get Token
    console.log('\n1️⃣  Getting authentication token...');
    const loginResponse = await axios.post<LoginResponse>(LOGIN_URL, {
      username: username,
      password: password,
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      httpAgent: null,
      httpsAgent: null,
    });

    const loginData = loginResponse.data;
    console.log(`   Status: ${loginData.status}`);
    console.log(`   Comment: ${loginData.comment}`);

    if (loginData.status !== 'success' || !loginData.token) {
      console.error(`\n❌ Login failed!`);
      console.error(`   Error Code: ${loginData.errCode}`);
      console.error(`   Full Response:`, JSON.stringify(loginData, null, 2));
      process.exit(1);
    }

    const token = loginData.token;
    console.log(`   ✅ Token received (${token.substring(0, 20)}...)`);
    console.log(`   ✅ Expires in: ${loginData.expiration} seconds (${(loginData.expiration || 0) / 3600} hours)`);
    console.log(`   ✅ Wallet Balance: ${loginData.userData?.walletBalance}`);
    console.log(`   ✅ Default Mask: ${loginData.userData?.defaultMask}`);
    
    // Show additional masks if available
    if (loginData.userData?.additional_mask && loginData.userData.additional_mask.length > 0) {
      console.log(`   ✅ Additional Masks:`, loginData.userData.additional_mask.map((m: any) => m.mask).join(', '));
    }

    // Step 2: Send SMS
    console.log('\n2️⃣  Sending SMS...');
    console.log(`   Formatted phone (9 digits): ${phoneDigits}`);

    // transaction_id MUST be a unique integer (1-19 digits)
    const transactionId = Math.floor(Math.random() * 9000000000000000000) + 1000000000000000000;

    const smsPayload = {
      sourceAddress: sourceAddress,
      message: 'Test message from Fire Guardian Control Center',
      transaction_id: transactionId.toString(),
      msisdn: [
        { mobile: phoneDigits }
      ]
    };

    console.log(`   Transaction ID: ${transactionId}`);
    console.log(`   Payload:`, JSON.stringify(smsPayload, null, 2));

    const smsResponse = await axios.post<SMSResponse>(SMS_URL, smsPayload, {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      httpAgent: null,
      httpsAgent: null,
    });

    const smsData = smsResponse.data;
    console.log(`\n   ✅ SMS Response Status: ${smsData.status}`);
    console.log(`   Comment: ${smsData.comment}`);
    
    if (smsData.data?.campaignId) {
      console.log(`   Campaign ID: ${smsData.data.campaignId}`);
      console.log(`   Campaign Cost: ${smsData.data.campaignCost}`);
      console.log(`   Remaining Balance: ${smsData.data.walletBalance}`);
    }

    if (smsData.errCode) {
      console.log(`   Error Code: ${smsData.errCode}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ SMS Test Completed Successfully!');
    console.log('='.repeat(70));
    console.log('\nIf you received the SMS on your phone, the configuration is CORRECT! ✨');

  } catch (error: any) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ Test Failed!');
    console.error('='.repeat(70));
    
    if (error.response) {
      console.error('\nAPI Response:');
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('\nNo response from server:');
      console.error(error.message);
    } else {
      console.error('\nError:', error.message);
    }

    process.exit(1);
  }
};

testSmsSend();
