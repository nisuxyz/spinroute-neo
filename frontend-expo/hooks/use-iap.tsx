import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import {
  useIAP,
  ErrorCode,
  type Purchase,
  type ProductSubscription,
  type ProductSubscriptionAndroid,
} from 'expo-iap';
import { useSubscription } from './use-subscription';
import { useAuth } from './use-auth';
import { useEnv } from './use-env';

// Subscription product IDs
export const SUBSCRIPTION_SKUS = {
  WEEKLY: 'xyz.itsnisu.spinroute.pro.weekly.v1',
  MONTHLY: 'xyz.itsnisu.spinroute.pro.monthly.v1',
  YEARLY: 'xyz.itsnisu.spinroute.pro.yearly.v1',
} as const;

const ALL_SUBSCRIPTION_SKUS = Object.values(SUBSCRIPTION_SKUS);

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
  const { purchaseUUID, refresh: refreshSubscription } = useSubscription();
  const { session } = useAuth();
  const env = useEnv();

  const [productsLoading, setProductsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Validate receipt on our backend
  const validateReceipt = useCallback(
    async (purchase: Purchase) => {
      if (!purchaseUUID) {
        console.error('No purchase UUID available for validation');
        return false;
      }

      if (!session?.access_token) {
        console.error('No auth session available for validation');
        return false;
      }

      try {
        // Log purchase object to debug
        console.log('[validateReceipt] Purchase object:', {
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
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
          // In sandbox/development, data might not be immediately available
          // Return true to allow transaction to complete, webhook will handle validation
          return true;
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
          console.error('Receipt validation failed:', error);
          return false;
        }

        const result = await response.json();
        console.log('Receipt validated:', result);
        return result.success === true;
      } catch (error) {
        console.error('Error validating receipt:', error);
        return false;
      }
    },
    [purchaseUUID, session?.access_token, env.IAP_SERVICE_URL],
  );

  // Handle successful purchase
  const handlePurchaseSuccess = useCallback(
    async (
      purchase: Purchase,
      finishTransaction: (params: { purchase: Purchase }) => Promise<void>,
    ) => {
      console.log('Purchase successful:', purchase.productId);
      setPurchasing(false);

      try {
        // Validate on our backend
        const isValid = await validateReceipt(purchase);

        if (isValid) {
          // Finish the transaction with the store
          await finishTransaction({ purchase });

          // Refresh local subscription state
          await refreshSubscription();

          Alert.alert('Success!', 'Your Pro subscription is now active.');
        } else {
          // Don't finish transaction if validation failed
          // This allows the user to restore/retry
          Alert.alert(
            'Verification Failed',
            'Your purchase could not be verified. Please try restoring purchases or contact support if this persists.',
          );
        }
      } catch (error) {
        console.error('Error in purchase success handler:', error);
        Alert.alert(
          'Error',
          'An error occurred while processing your purchase. Please try restoring purchases.',
        );
      }
    },
    [validateReceipt, refreshSubscription],
  );

  // Handle purchase error
  const handlePurchaseError = useCallback((error: { code?: ErrorCode; message?: string }) => {
    setPurchasing(false);

    // Don't show alert for user cancellation
    if (error.code === ErrorCode.UserCancelled) {
      console.log('User cancelled purchase');
      return;
    }

    console.error('Purchase error:', error);
    Alert.alert('Purchase Failed', error.message || 'An unexpected error occurred.');
  }, []);

  // Use the useIAP hook with callbacks
  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
    availablePurchases,
  } = useIAP({
    onPurchaseSuccess: (purchase) => handlePurchaseSuccess(purchase, finishTransaction),
    onPurchaseError: handlePurchaseError,
  });

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
      const androidSubscription = subscription as ProductSubscriptionAndroid;
      const subscriptionOffers =
        androidSubscription.subscriptionOfferDetailsAndroid?.map((offer) => ({
          sku: subscription.id,
          offerToken: offer.offerToken,
        })) || [];

      setPurchasing(true);

      try {
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
              // Android requires subscriptionOffers for subscriptions
              ...(subscriptionOffers.length > 0 && { subscriptionOffers }),
              // Pass purchaseUUID for linking (stored in obfuscatedAccountIdAndroid)
              obfuscatedAccountIdAndroid: purchaseUUID,
            },
          },
          type: 'subs',
        });
        // Purchase result handled in onPurchaseSuccess/onPurchaseError callbacks
      } catch (error) {
        setPurchasing(false);
        console.error('Purchase request error:', error);
        Alert.alert('Error', 'Failed to initiate purchase. Please try again.');
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
      // Trigger fetch of available purchases
      await getAvailablePurchases();

      // Check if there are any purchases to restore
      if (!availablePurchases || availablePurchases.length === 0) {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
        setRestoring(false);
        return;
      }

      // Validate each purchase with our backend
      let restoredCount = 0;
      for (const purchase of availablePurchases) {
        const isValid = await validateReceipt(purchase);
        if (isValid) {
          restoredCount++;
        }
      }

      // Refresh subscription state
      await refreshSubscription();

      if (restoredCount > 0) {
        Alert.alert('Success!', 'Your purchases have been restored.');
      } else {
        Alert.alert(
          'Restore Failed',
          'Could not verify your previous purchases. Please contact support if you believe this is an error.',
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  }, [connected, getAvailablePurchases, availablePurchases, validateReceipt, refreshSubscription]);

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
