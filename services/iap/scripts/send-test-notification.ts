#!/usr/bin/env bun
/**
 * Send a test notification to your webhook endpoint via Apple's App Store Server API
 *
 * Usage:
 *   bun run scripts/send-test-notification.ts
 *
 * Required environment variables:
 *   APPLE_KEY_ID - Your App Store Connect API Key ID (In-App Purchase key)
 *   APPLE_ISSUER_ID - Your App Store Connect Issuer ID
 *   APPLE_PRIVATE_KEY_PATH - Path to your .p8 private key file
 *   APPLE_BUNDLE_ID - Your app's bundle ID
 *
 * Optional:
 *   APPLE_ENVIRONMENT - 'sandbox' (default) or 'production'
 */

import {
  AppStoreServerAPIClient,
  Environment,
  type SendTestNotificationResponse,
} from '@apple/app-store-server-library';
import { readFileSync } from 'fs';

// Configuration from environment
const KEY_ID = process.env.APPLE_KEY_ID;
const ISSUER_ID = process.env.APPLE_ISSUER_ID;
const BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.itsnisu.spinroute';
const ENVIRONMENT = process.env.APPLE_ENVIRONMENT || 'sandbox';
const PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH;

function validateConfig() {
  const missing: string[] = [];
  if (!KEY_ID) missing.push('APPLE_KEY_ID');
  if (!ISSUER_ID) missing.push('APPLE_ISSUER_ID');
  if (!PRIVATE_KEY_PATH) missing.push('APPLE_PRIVATE_KEY_PATH');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error('\nSee script comments for setup instructions.');
    process.exit(1);
  }

  console.log('🔑 Configuration:');
  console.log(`   Key ID: ${KEY_ID}`);
  console.log(`   Issuer ID: ${ISSUER_ID}`);
  console.log(`   Bundle ID: ${BUNDLE_ID}`);
  console.log(`   Private Key Path: ${PRIVATE_KEY_PATH}`);
  console.log(`   Environment: ${ENVIRONMENT}`);
  console.log('');
}

async function sendTestNotification(): Promise<void> {
  console.log('🍎 App Store Server API - Test Notification\n');

  validateConfig();

  // Read the private key
  const encodedKey = readFileSync(PRIVATE_KEY_PATH!, 'utf-8');
  console.log(`✅ Private key loaded (${encodedKey.length} chars)\n`);

  // Create the client using Apple's official library
  const environment = ENVIRONMENT === 'production' ? Environment.PRODUCTION : Environment.SANDBOX;

  const client = new AppStoreServerAPIClient(
    encodedKey,
    KEY_ID!,
    ISSUER_ID!,
    BUNDLE_ID,
    environment,
  );

  console.log('📤 Sending test notification request...\n');

  try {
    const response: SendTestNotificationResponse = await client.requestTestNotification();

    console.log('✅ Test notification request successful!\n');
    console.log('Response:', JSON.stringify(response, null, 2));

    if (response.testNotificationToken) {
      console.log('\n📋 Test Notification Token:', response.testNotificationToken);
    }

    console.log('\n🔍 Check your webhook logs to see if the TEST notification was received.');
    console.log('   fly logs -c services/iap/fly.toml');
  } catch (error) {
    console.error('❌ Request failed:\n');
    console.error(error);

    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.error('\n💡 401 Unauthorized - Check that your:');
        console.error('   - APPLE_KEY_ID matches the Key ID in App Store Connect');
        console.error('   - APPLE_ISSUER_ID matches the Issuer ID in App Store Connect');
        console.error('   - Private key file is the correct .p8 key');
        console.error(
          '\n⚠️  Note: You need an In-App Purchase key, not an App Store Connect API key.',
        );
        console.error('   Go to: Users and Access > Integrations > In-App Purchase');
      } else if (error.message.includes('404')) {
        console.error('\n💡 404 Not Found - Make sure you have configured the');
        console.error(`   ${ENVIRONMENT} webhook URL in App Store Connect.`);
        console.error(
          '   Go to: Your App > General > App Information > App Store Server Notifications',
        );
      }
    }
  }
}

// Main
await sendTestNotification();
