/**
 * Apple App Store Server API Client
 *
 * Uses the official @apple/app-store-server-library for:
 * - JWS signature verification
 * - Certificate management
 * - Type-safe API interactions
 */

import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  ReceiptUtility,
} from '@apple/app-store-server-library';
import { config } from '../config';
import { createLogger } from '../logger';

const logger = createLogger('AppleClient');

// Environment configuration
const ENVIRONMENT =
  process.env.APPLE_ENVIRONMENT === 'production' ? Environment.PRODUCTION : Environment.SANDBOX;

/**
 * Load private key from file or environment variable
 */
function loadPrivateKey(): string | null {
  // Try to load from file path first
  const keyPath = process.env.APPLE_PRIVATE_KEY_PATH;
  if (keyPath) {
    try {
      const fs = require('fs');
      const key = fs.readFileSync(keyPath, 'utf8');
      logger.info('Loaded Apple private key from file', { keyPath });
      return key;
    } catch (error) {
      logger.error('Failed to load private key from file', error, { keyPath });
    }
  }

  // Fall back to environment variable
  const key = process.env.APPLE_PRIVATE_KEY;
  if (key) {
    logger.info('Loaded Apple private key from environment variable');
    return key;
  }

  logger.warn('No Apple private key configured');
  return null;
}

/**
 * Create an App Store Server API client
 * Requires Apple credentials to be configured
 */
export function createAppleClient(): AppStoreServerAPIClient | null {
  const keyId = process.env.APPLE_KEY_ID;
  const issuerId = process.env.APPLE_ISSUER_ID;
  const privateKey = loadPrivateKey();
  const bundleId = config.apple.bundleId;

  if (!keyId || !issuerId || !privateKey || !bundleId) {
    logger.warn('Apple API credentials not fully configured', {
      hasKeyId: !!keyId,
      hasIssuerId: !!issuerId,
      hasPrivateKey: !!privateKey,
      hasBundleId: !!bundleId,
    });
    return null;
  }

  try {
    return new AppStoreServerAPIClient(privateKey, keyId, issuerId, bundleId, ENVIRONMENT);
  } catch (error) {
    logger.error('Failed to create Apple API client', error);
    return null;
  }
}

/**
 * Load Apple Root CA certificates
 * These are required for signature verification
 * Download from: https://www.apple.com/certificateauthority/
 */
function loadAppleRootCAs(): Buffer[] {
  try {
    const fs = require('fs');
    const path = require('path');

    const certsDir = path.join(__dirname, '../../certs');
    const certs: Buffer[] = [];

    // Try to load G3 certificate
    try {
      const g3Path = path.join(certsDir, 'AppleRootCA-G3.cer');
      const g3Cert = fs.readFileSync(g3Path);
      certs.push(g3Cert);
      logger.info('Loaded Apple Root CA G3 certificate', { path: g3Path });
    } catch (error) {
      logger.warn('Apple Root CA G3 certificate not found', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Try to load G2 certificate
    try {
      const g2Path = path.join(certsDir, 'AppleRootCA-G2.cer');
      const g2Cert = fs.readFileSync(g2Path);
      certs.push(g2Cert);
      logger.info('Loaded Apple Root CA G2 certificate', { path: g2Path });
    } catch (error) {
      logger.warn('Apple Root CA G2 certificate not found', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (certs.length === 0) {
      logger.warn('No Apple Root CA certificates found, will rely on online checks');
    }

    return certs;
  } catch (error) {
    logger.error('Failed to load Apple Root CA certificates', error);
    return [];
  }
}

/**
 * Create a signed data verifier for JWS validation
 * This verifies signatures using Apple's public certificates
 *
 * According to the official library:
 * new SignedDataVerifier(appleRootCAs, enableOnlineChecks, environment, bundleId, appAppleId)
 */
export function createSignedDataVerifier(): SignedDataVerifier | null {
  const bundleId = config.apple.bundleId;
  const appAppleId = process.env.APPLE_APP_ID;

  if (!bundleId) {
    logger.warn('Bundle ID not configured for signature verification');
    return null;
  }

  // App Apple ID is required for Production environment
  if (ENVIRONMENT === Environment.PRODUCTION && !appAppleId) {
    logger.error('App Apple ID is required for Production environment');
    return null;
  }

  try {
    const appleRootCAs = loadAppleRootCAs();
    const enableOnlineChecks = true; // Enable online certificate fetching

    // Constructor signature: (appleRootCAs, enableOnlineChecks, environment, bundleId, appAppleId)
    const verifier = new SignedDataVerifier(
      appleRootCAs,
      enableOnlineChecks,
      ENVIRONMENT,
      bundleId,
      appAppleId ? parseInt(appAppleId) : undefined,
    );

    logger.info('Created signed data verifier', {
      bundleId,
      environment: ENVIRONMENT,
      hasAppId: !!appAppleId,
      hasRootCAs: appleRootCAs.length > 0,
      onlineChecksEnabled: enableOnlineChecks,
    });

    return verifier;
  } catch (error) {
    logger.error('Failed to create signed data verifier', error);
    return null;
  }
}

/**
 * Extract transaction ID from a JWS receipt
 * According to the library: ReceiptUtility.extractTransactionIdFromAppReceipt(appReceipt)
 */
export function extractTransactionId(jwsReceipt: string): string | null {
  try {
    const receiptUtil = new ReceiptUtility();
    return receiptUtil.extractTransactionIdFromAppReceipt(jwsReceipt);
  } catch (error) {
    logger.error('Failed to extract transaction ID from receipt', error);
    return null;
  }
}
