import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import {
  useIAP,
  ErrorCode,
  getAvailablePurchases as getAvailablePurchasesNative,
  type Purchase,
  type ProductSubscription,
  type ProductSubscriptionAndroid,
  type ProductSubscriptionIOS,
} from 'expo-iap';
import { useSubscription } from '@/contexts/user-settings-context';
import { useAuth } from './use-auth';
import { useEnv } from './use-env';

// Subscription product IDs
export const SUBSCRIPTION_SKUS = {
  WEEKLY: 'xyz.itsnisu.spinroute.pro.weekly.v1',
  MONTHLY: 'xyz.itsnisu.spinroute.pro.monthly.v1',
  YEARLY: 'xyz.itsnisu.spinroute.pro.yearly.v1',
} as const;

const ALL_SUBSCRIPTION_SKUS = Object.values(SUBSCRIPTION_SKUS);

// Helper to get subscription price with proper platform handling
export function getSubscriptionPrice(subscription: ProductSubscription): string {
  // iOS: displayPrice is always available and correct
  if (subscription.platform === 'ios') {
    return subscription.displayPrice || '$0.00';
  }

  // Android: Access price from subscriptionOfferDetails for accurate pricing
  if (subscription.platform === 'android') {
    const androidSubscription = subscription as ProductSubscriptionAndroid;
    const offers = androidSubscription.subscriptionOfferDetailsAndroid;

    if (offers && offers.length > 0) {
      const firstOffer = offers[0];
      const pricingPhases = firstOffer.pricingPhases?.pricingPhaseList;

      if (pricingPhases && pricingPhases.length > 0) {
        return pricingPhases[0].formattedPrice || '$0.00';
      }
    }
  }

  // Fallback to displayPrice if available
  return subscription.displayPrice || '$0.00';
}

// Helper to check if subscription has introductory offer
export function hasIntroductoryOffer(subscription: ProductSubscription): boolean {
  // Check platform field on the subscription object
  if (subscription.platform === 'ios') {
    // iOS: Check if subscriptionInfoIOS exists and has introductory offer
    const iosSubscription = subscription as ProductSubscriptionIOS;
    return !!iosSubscription.subscriptionInfoIOS?.introductoryOffer;
  }

  // Android: Check for offers with intro pricing
  if (subscription.platform === 'android') {
    const androidSubscription = subscription as ProductSubscriptionAndroid;
    const offers = androidSubscription.subscriptionOfferDetailsAndroid;

    if (offers && offers.length > 0) {
      return offers.some((offer) => {
        const phases = offer.pricingPhases?.pricingPhaseList;
        return phases && phases.length > 1; // Multiple phases indicate intro pricing
      });
    }
  }

  return false;
}

interface IAPContextValue {
  // Connection state
  connected: boolean;

  // Products
  subscriptions: ProductSubscription[];
  productsLoading: boolean;

  // Purchase state
  purchasing: boolean;
  restoring: boolean;

  // Methods
  purchaseSubscription: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const IAPContext = createContext<IAPContextValue | null>(null);

interface IAPProviderProps {
  children: ReactNode;
}

export function IAPProvider({ children }: IAPProviderProps) {
  const { purchaseUUID, loading: subscriptionLoading } = useSubscription();
  const { session } = useAuth();
  const env = useEnv();

  const [productsLoading, setProductsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Validate receipt on our backend
  const validateReceipt = useCallback(
    async (purchase: Purchase) => {
      console.log('[validateReceipt] Starting validation...', {
        hasPurchaseUUID: !!purchaseUUID,
        hasSession: !!session?.access_token,
        subscriptionLoading,
      });

      if (!purchaseUUID) {
        console.error('[validateReceipt] ERROR: No purchase UUID available', {
          subscriptionLoading,
          hint: subscriptionLoading
            ? 'Subscription data still loading - this should not happen'
            : 'User profile may not have purchase_uuid set',
        });
        return false;
      }

      if (!session?.access_token) {
        console.error('[validateReceipt] ERROR: No auth session available');
        return false;
      }

      try {
        // Log purchase object to debug
        console.log('[validateReceipt] Purchase details:', {
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken ? 'present' : 'missing',
          transactionId: purchase.transactionId,
          platform: Platform.OS,
        });

        // expo-iap uses unified purchaseToken field for both platforms
        // iOS: purchaseToken contains the JWS token (receipt)
        // Android: purchaseToken contains the purchase token
        const requestBody =
          Platform.OS === 'ios'
            ? {
                platform: 'ios' as const,
                receiptData: purchase.purchaseToken || '',
                productId: purchase.productId,
              }
            : {
                platform: 'android' as const,
                purchaseToken: purchase.purchaseToken || '',
                productId: purchase.productId,
              };

        console.log('[validateReceipt] Request body:', {
          platform: requestBody.platform,
          productId: requestBody.productId,
          hasData: Platform.OS === 'ios' ? !!requestBody.receiptData : !!requestBody.purchaseToken,
        });

        // Check if we have the required data
        const hasRequiredData =
          Platform.OS === 'ios' ? !!requestBody.receiptData : !!requestBody.purchaseToken;

        if (!hasRequiredData) {
          console.error('[validateReceipt] No purchase data available');
          // Don't validate without data - this indicates a problem
          // The webhook will handle validation when Apple sends the notification
          return false;
        }

        const response = await fetch(`${env.IAP_SERVICE_URL}/api/subscription/validate-receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[validateReceipt] ERROR: API returned error:', {
            status: response.status,
            error,
          });
          return false;
        }

        const result = await response.json();
        console.log('[validateReceipt] ✅ Validation successful:', {
          success: result.success,
          tier: result.subscription?.tier,
          status: result.subscription?.status,
          expiresAt: result.subscription?.expiresAt,
          productId: result.subscription?.productId,
        });

        // Return true if validation succeeded
        // The subscription status (active/expired) is updated in the database
        // and will be reflected automatically via realtime subscription
        return result.success === true;
      } catch (error) {
        console.error('[validateReceipt] ERROR: Exception during validation:', error);
        return false;
      }
    },
    [purchaseUUID, session?.access_token, env.IAP_SERVICE_URL, subscriptionLoading],
  );

  // Handle successful purchase
  const handlePurchaseSuccess = useCallback(
    async (
      purchase: Purchase,
      finishTransaction: (params: { purchase: Purchase }) => Promise<void>,
      isNewPurchase = true, // Flag to distinguish new purchases from unfinished transactions
    ) => {
      console.log('[IAP] 🎉 Purchase successful:', {
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        isNewPurchase,
      });
      setPurchasing(false);

      try {
        // IMPORTANT: Validate receipt on server BEFORE finishing transaction
        // This is crucial for security and fraud prevention
        console.log('[IAP] Step 1: Validating receipt...');
        const isValid = await validateReceipt(purchase);

        if (isValid) {
          console.log('[IAP] ✅ Receipt validation successful');

          // Valid purchase - finish transaction
          console.log('[IAP] Step 2: Finishing transaction...');
          await finishTransaction({ purchase });
          console.log('[IAP] ✅ Transaction finished');

          // Note: Subscription state will update automatically via realtime subscription
          // No need for manual refresh - the database update triggers realtime push
          console.log('[IAP] ✅ Purchase flow complete - realtime will update UI');

          // Only show success alert for NEW purchases, not for unfinished transactions
          if (isNewPurchase) {
            Alert.alert('Success!', 'Your Pro subscription is now active.');
          }
        } else {
          console.log('[IAP] ❌ Receipt validation failed');
          // Validation failed - check if we have receipt data
          const hasReceiptData =
            Platform.OS === 'ios' ? !!purchase.purchaseToken : !!purchase.purchaseToken;

          if (!hasReceiptData) {
            // No receipt data yet - finish transaction anyway
            // The webhook will handle validation when Apple sends the notification
            console.warn(
              '[IAP] No receipt data available yet, finishing transaction for webhook processing',
            );
            await finishTransaction({ purchase });

            // Note: Realtime subscription will update UI when webhook processes
            console.log('[IAP] Waiting for webhook to process - realtime will update UI');

            // Only show processing alert for NEW purchases
            if (isNewPurchase) {
              Alert.alert(
                'Processing Purchase',
                'Your purchase is being processed. It may take a moment to activate.',
              );
            }
          } else {
            // Have receipt data but validation failed
            // For renewals/resubscriptions, we should still finish the transaction
            // and let the webhook handle it, otherwise the purchase gets stuck
            console.error('[IAP] Receipt validation failed with data present');
            console.log('[IAP] Finishing transaction anyway to prevent stuck purchase');

            await finishTransaction({ purchase });

            // Note: Realtime subscription will update UI when webhook processes
            console.log('[IAP] Waiting for webhook to process - realtime will update UI');

            // Only show processing alert for NEW purchases
            if (isNewPurchase) {
              Alert.alert(
                'Processing Purchase',
                "Your purchase is being processed. This may take a moment. If your subscription doesn't activate, try restarting the app.",
              );
            }
          }
        }
      } catch (error) {
        console.error('[IAP] Error in purchase success handler:', error);
        // Don't finish transaction on error - will retry on next launch

        // Only show error alert for NEW purchases
        if (isNewPurchase) {
          Alert.alert(
            'Error',
            'An error occurred while processing your purchase. Please restart the app or try restoring purchases.',
          );
        }
      }
    },
    [validateReceipt],
  );

  // Handle purchase error
  const handlePurchaseError = useCallback((error: { code?: ErrorCode; message?: string }) => {
    setPurchasing(false);

    console.error('[IAP] Purchase error:', {
      code: error.code,
      message: error.message,
    });

    // Don't show alert for user cancellation
    if (error.code === ErrorCode.UserCancelled) {
      console.log('[IAP] User cancelled purchase');
      return;
    }

    // Handle "already owned" error - suggest restore
    if (error.code === ErrorCode.AlreadyOwned) {
      console.log('[IAP] Product already owned - suggesting restore');
      Alert.alert(
        'Subscription Already Active',
        'You already have an active subscription. Try using "Restore Purchases" to sync your subscription status.',
      );
      return;
    }

    // Generic error
    Alert.alert(
      'Purchase Failed',
      error.message || 'An unexpected error occurred. Please try again or contact support.',
    );
  }, []);

  // Track if we're in an active purchase flow (user-initiated)
  const [isActivePurchaseFlow, setIsActivePurchaseFlow] = useState(false);

  // Use the useIAP hook with callbacks
  const { connected, subscriptions, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: (purchase) => {
      // Only show alert if this is an active user-initiated purchase
      handlePurchaseSuccess(purchase, finishTransaction, isActivePurchaseFlow);
      setIsActivePurchaseFlow(false);
    },
    onPurchaseError: (error) => {
      handlePurchaseError(error);
      setIsActivePurchaseFlow(false);
    },
  });

  // Handle unfinished transactions on app startup (iOS)
  // This prevents onPurchaseSuccess from triggering on every app launch
  useEffect(() => {
    // Wait for both IAP connection AND subscription data to be loaded
    if (!connected || subscriptionLoading) {
      console.log('[IAP] Waiting for initialization...', {
        connected,
        subscriptionLoading,
        hasPurchaseUUID: !!purchaseUUID,
      });
      return;
    }

    const handleUnfinishedTransactions = async () => {
      try {
        console.log('[IAP] Checking for unfinished transactions...');
        // Use native function directly to get the actual purchases array
        const purchases = await getAvailablePurchasesNative();

        if (!purchases || purchases.length === 0) {
          console.log('[IAP] No unfinished transactions found');
          return;
        }

        console.log(`[IAP] Found ${purchases.length} unfinished transaction(s)`);

        // Process each unfinished transaction
        for (const purchase of purchases) {
          console.log(`[IAP] Processing unfinished transaction: ${purchase.productId}`);

          try {
            // Validate the purchase (pass false to suppress alerts)
            const isValid = await validateReceipt(purchase);

            if (isValid) {
              console.log(`[IAP] Valid unfinished transaction: ${purchase.productId}`);
              // Finish the transaction to prevent replay
              await finishTransaction({ purchase });
            } else {
              console.warn(
                `[IAP] Invalid unfinished transaction: ${purchase.productId} - will retry on next launch`,
              );
              // Don't finish invalid transactions - they'll be retried
            }
          } catch (error) {
            console.error(`[IAP] Error processing unfinished transaction:`, error);
            // Don't finish on error - will retry on next launch
          }
        }

        // Note: Subscription state will update automatically via realtime
        console.log('[IAP] Unfinished transactions processed - realtime will update UI');
      } catch (error) {
        console.error('[IAP] Error handling unfinished transactions:', error);
      }
    };

    // Run on mount when connected AND subscription data is loaded
    handleUnfinishedTransactions();
  }, [connected, subscriptionLoading, purchaseUUID, finishTransaction, validateReceipt]);

  // Fetch subscription products when connected
  const refreshProducts = useCallback(async () => {
    if (!connected) return;

    setProductsLoading(true);
    try {
      await fetchProducts({
        skus: ALL_SUBSCRIPTION_SKUS,
        type: 'subs',
      });
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  }, [connected, fetchProducts]);

  useEffect(() => {
    if (connected) {
      refreshProducts();
    }
  }, [connected, refreshProducts]);

  // Purchase a subscription
  const purchaseSubscription = useCallback(
    async (productId: string) => {
      if (!connected) {
        Alert.alert('Error', 'Store not connected. Please try again.');
        return;
      }

      if (!purchaseUUID) {
        Alert.alert('Error', 'Unable to process purchase. Please try again.');
        return;
      }

      const subscription = subscriptions.find((sub) => sub.id === productId);
      if (!subscription) {
        Alert.alert('Error', 'Subscription product not found.');
        return;
      }

      // Build Android subscription offers if available
      let subscriptionOffers: Array<{ sku: string; offerToken: string }> = [];
      if (subscription.platform === 'android') {
        const androidSubscription = subscription as ProductSubscriptionAndroid;
        subscriptionOffers =
          androidSubscription.subscriptionOfferDetailsAndroid?.map((offer) => ({
            sku: subscription.id,
            offerToken: offer.offerToken,
          })) || [];
      }

      console.log('[IAP] Initiating purchase request:', {
        productId,
        purchaseUUID,
        platform: Platform.OS,
        hasOffers: subscriptionOffers.length > 0,
      });

      setPurchasing(true);
      setIsActivePurchaseFlow(true); // Mark this as a user-initiated purchase

      try {
        // requestPurchase returns void in the hook
        // Results are handled via onPurchaseSuccess/onPurchaseError callbacks
        console.log('[IAP] Calling requestPurchase...');
        await requestPurchase({
          request: {
            ios: {
              sku: productId,
              // Pass purchaseUUID as appAccountToken for server-to-server linking
              appAccountToken: purchaseUUID,
              andDangerouslyFinishTransactionAutomatically: false,
            },
            android: {
              skus: [productId],
              // Android requires subscriptionOffers for subscriptions when available
              ...(subscriptionOffers.length > 0 && { subscriptionOffers }),
              // Pass purchaseUUID for linking (stored in obfuscatedAccountIdAndroid)
              obfuscatedAccountIdAndroid: purchaseUUID,
            },
          },
          type: 'subs',
        });
        console.log('[IAP] requestPurchase completed (waiting for callbacks)');
        // Purchase result handled in onPurchaseSuccess/onPurchaseError callbacks
      } catch (error: any) {
        setPurchasing(false);
        setIsActivePurchaseFlow(false);

        // Handle user cancellation
        if (error?.code === ErrorCode.UserCancelled) {
          console.log('User cancelled purchase');
          return;
        }

        console.error('Purchase request error:', error);
        Alert.alert('Error', error?.message || 'Failed to initiate purchase. Please try again.');
      }
    },
    [connected, purchaseUUID, subscriptions, requestPurchase],
  );

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    if (!connected) {
      Alert.alert('Error', 'Store not connected. Please try again.');
      return;
    }

    setRestoring(true);

    try {
      // Use native function directly to get the actual purchases array
      const purchases = await getAvailablePurchasesNative();

      // Check if there are any purchases to restore
      if (!purchases || purchases.length === 0) {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
        setRestoring(false);
        return;
      }

      console.log(`[IAP] Restoring ${purchases.length} purchase(s)...`);

      // Validate each purchase with our backend
      let restoredCount = 0;
      for (const purchase of purchases) {
        try {
          const isValid = await validateReceipt(purchase);

          if (isValid) {
            restoredCount++;
            // IMPORTANT: Finish the transaction after successful validation
            // This prevents the purchase from being replayed on every app launch
            await finishTransaction({ purchase });
            console.log(`[IAP] Restored and finished: ${purchase.productId}`);
          } else {
            console.warn(`[IAP] Could not validate purchase: ${purchase.productId}`);
          }
        } catch (error) {
          console.error(`[IAP] Error restoring purchase ${purchase.productId}:`, error);
        }
      }

      // Note: Subscription state will update automatically via realtime
      console.log('[IAP] Restore complete - realtime will update UI');

      if (restoredCount > 0) {
        Alert.alert('Success!', 'Your purchases have been restored.');
      } else {
        Alert.alert(
          'Restore Failed',
          'Could not verify your previous purchases. Please contact support if you believe this is an error.',
        );
      }
    } catch (error) {
      console.error('[IAP] Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  }, [connected, validateReceipt, finishTransaction]);

  const value: IAPContextValue = {
    connected,
    subscriptions,
    productsLoading,
    purchasing,
    restoring,
    purchaseSubscription,
    restorePurchases,
    refreshProducts,
  };

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
}

export function useIAPContext() {
  const context = useContext(IAPContext);
  if (!context) {
    throw new Error('useIAPContext must be used within an IAPProvider');
  }
  return context;
}
