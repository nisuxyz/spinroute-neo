---
inclusion: manual
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 
Apple App Store Server Node.js Library

The Node.js server library for the App Store Server API, App Store Server Notifications, and Retention Messaging API. Also available in Swift, Python, and Java.
Table of Contents

    Installation
    Documentation
    Usage
    Support

Installation
Requirements

    Node 16+

NPM/Yarn

# With NPM
npm install @apple/app-store-server-library --save
# With Yarn
yarn add @apple/app-store-server-library

Documentation

Documentation

WWDC Video
Obtaining an In-App Purchase key from App Store Connect

To use the App Store Server API or create promotional offer signatures, a signing key downloaded from App Store Connect is required. To obtain this key, you must have the Admin role. Go to Users and Access > Integrations > In-App Purchase. Here you can create and manage keys, as well as find your issuer ID. When using a key, you'll need the key ID and issuer ID as well.
Obtaining Apple Root Certificates

Download and store the root certificates found in the Apple Root Certificates section of the Apple PKI site. Provide these certificates as an array to a SignedDataVerifier to allow verifying the signed data comes from Apple.
Usage
API Usage

import { AppStoreServerAPIClient, Environment, SendTestNotificationResponse } from "@apple/app-store-server-library"

const issuerId = "99b16628-15e4-4668-972b-eeff55eeff55"
const keyId = "ABCDEFGHIJ"
const bundleId = "com.example"
const filePath = "/path/to/key/SubscriptionKey_ABCDEFGHIJ.p8"
const encodedKey = readFile(filePath) // Specific implementation may vary
const environment = Environment.SANDBOX

const client = new AppStoreServerAPIClient(encodedKey, keyId, issuerId, bundleId, environment)

try {
    const response: SendTestNotificationResponse = await client.requestTestNotification()
    console.log(response)
} catch (e) {
    console.error(e)
}

Verification Usage

import { SignedDataVerifier } from "@apple/app-store-server-library"

const bundleId = "com.example"
const appleRootCAs: Buffer[] = loadRootCAs() // Specific implementation may vary
const enableOnlineChecks = true
const environment = Environment.SANDBOX
const appAppleId = undefined // appAppleId is required when the environment is Production
const verifier = new SignedDataVerifier(appleRootCAs, enableOnlineChecks, environment, bundleId, appAppleId)

const notificationPayload = "ey..."
const verifiedNotification = await verifier.verifyAndDecodeNotification(notificationPayload)
console.log(verifiedNotification)

Receipt Usage

import { AppStoreServerAPIClient, Environment, GetTransactionHistoryVersion, ReceiptUtility, Order, ProductType, HistoryResponse, TransactionHistoryRequest } from "@apple/app-store-server-library"

const issuerId = "99b16628-15e4-4668-972b-eeff55eeff55"
const keyId = "ABCDEFGHIJ"
const bundleId = "com.example"
const filePath = "/path/to/key/SubscriptionKey_ABCDEFGHIJ.p8"
const encodedKey = readFile(filePath) // Specific implementation may vary
const environment = Environment.SANDBOX

const client =
        new AppStoreServerAPIClient(encodedKey, keyId, issuerId, bundleId, environment)

const appReceipt = "MI..."
const receiptUtil = new ReceiptUtility()
const transactionId = receiptUtil.extractTransactionIdFromAppReceipt(appReceipt)
if (transactionId != null) {
    const transactionHistoryRequest: TransactionHistoryRequest = {
        sort: Order.ASCENDING,
        revoked: false,
        productTypes: [ProductType.AUTO_RENEWABLE]
    }
    let response: HistoryResponse | null = null
    let transactions: string[] = []
    do {
        const revisionToken = response !== null && response.revision !== null ? response.revision : null
        response = await client.getTransactionHistory(transactionId, revisionToken, transactionHistoryRequest, GetTransactionHistoryVersion.V2)
        if (response.signedTransactions) {
            transactions = transactions.concat(response.signedTransactions)
        }
    } while (response.hasMore)
    console.log(transactions)
}

Promotional Offer Signature Creation

import { PromotionalOfferSignatureCreator } from "@apple/app-store-server-library"

const keyId = "ABCDEFGHIJ"
const bundleId = "com.example"
const filePath = "/path/to/key/SubscriptionKey_ABCDEFGHIJ.p8"
const encodedKey = readFile(filePath) // Specific implementation may vary

const productId = "<product_id>"
const subscriptionOfferId = "<subscription_offer_id>"
const appAccountToken = "<app_account_token>"
const nonce = "<nonce>"
const timestamp = Date.now()
const signatureCreator = new PromotionalOfferSignatureCreator(encodedKey, keyId, bundleId)

const signature = signatureCreator.createSignature(productId, subscriptionOfferId, appAccountToken, nonce, timestamp)
console.log(signature)

Support
Only the latest major version of the library will receive updates, including security updates. Therefore, it is recommended to update to new major versions.