/**
 * Email System Test Script
 * 
 * This script tests the email configuration and sends a test email.
 * Run with: npm run test:email
 */

import { verifyEmailConfig } from './src/config/email';
import { emailService } from './src/services/emailService';
import dotenv from 'dotenv';

dotenv.config();

async function testEmailSystem() {
  console.log('🧪 Testing Fire Guardian Email System\n');
  console.log('═══════════════════════════════════════════\n');

  // Test 1: Verify Configuration
  console.log('Test 1: Verifying email configuration...');
  const isConfigured = await verifyEmailConfig();
  
  if (!isConfigured) {
    console.error('❌ Email configuration failed!');
    console.log('\nPlease check:');
    console.log('1. EMAIL_USER is set in .env');
    console.log('2. EMAIL_PASSWORD is set in .env (use App Password for Gmail)');
    console.log('3. EMAIL_HOST and EMAIL_PORT are correct\n');
    process.exit(1);
  }
  
  console.log('✅ Email configuration is valid\n');

  // Test 2: Send Test Email
  const testEmail = process.env.TEST_EMAIL || process.env.EMAIL_USER;
  
  if (!testEmail) {
    console.error('❌ No test email address found');
    console.log('Set TEST_EMAIL in .env or using EMAIL_USER\n');
    process.exit(1);
  }

  console.log(`Test 2: Sending test email to ${testEmail}...`);
  const result = await emailService.sendTestEmail(testEmail);

  if (result.success) {
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`\n📬 Check your inbox at ${testEmail}\n`);
  } else {
    console.error('❌ Failed to send test email');
    console.error(`   Error: ${result.error}\n`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════');
  console.log('✅ All email tests passed!');
  console.log('\nEmail system is ready to use.');
  console.log('View full documentation: backend/docs/email-system-guide.md\n');
  
  process.exit(0);
}

// Run tests
testEmailSystem().catch((error) => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
