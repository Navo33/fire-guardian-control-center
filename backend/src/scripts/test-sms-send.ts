#!/usr/bin/env ts-node

/**
 * Dialog eSMS Send Test Script
 * Simple test to send SMS to a phone number and debug the configuration
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const TEST_PHONE = '+94702053903';
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
}

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 0, replace with 94
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.substring(1);
  }

  // If doesn't start with country code, add it
  if (!cleaned.startsWith('94')) {
    cleaned = '94' + cleaned;
  }

  return cleaned;
};

const testSmsSend = async () => {
  console.log('='.repeat(70));
  console.log('🚨 Dialog eSMS Send Test');
  console.log('='.repeat(70));

  const username = process.env.DIALOG_SMS_USERNAME;
  const password = process.env.DIALOG_SMS_PASSWORD;
  const sourceAddress = process.env.DIALOG_SMS_SOURCE_ADDRESS;

  console.log('\n📋 Configuration:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Source Address: ${sourceAddress}`);
  console.log(`   Test Phone: ${TEST_PHONE}`);

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
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
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

    // Step 2: Send SMS
    console.log('\n2️⃣  Sending SMS...');
    const formattedPhone = formatPhoneNumber(TEST_PHONE);
    console.log(`   Formatted phone: ${formattedPhone}`);

    const smsPayload = {
      sourceAddress: sourceAddress,
      message: 'Test message from Fire Guardian - If you received this, SMS is working! 🎉',
      transaction_id: `FG-TEST-${Date.now()}`,
      msisdn: [
        { mobile: formattedPhone }
      ]
    };

    console.log(`   Payload:`, JSON.stringify(smsPayload, null, 2));

    const smsResponse = await axios.post<SMSResponse>(SMS_URL, smsPayload, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const smsData = smsResponse.data;
    console.log(`\n   ✅ SMS Response Status: ${smsData.status}`);
    console.log(`   Message: ${smsData.message}`);
    console.log(`   Transaction ID: ${smsData.transactionId}`);
    
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
      console.error(error.request);
    } else {
      console.error('\nError:', error.message);
    }

    process.exit(1);
  }
};

testSmsSend();
