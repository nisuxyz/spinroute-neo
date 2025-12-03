import { supabase } from '@/utils/supabase';
import type { Database } from '@/supabase/types';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './use-auth';

type SubscriptionTier = Database['public']['Tables']['profiles']['Row']['subscription_tier'];
type SubscriptionStatus = Database['public']['Tables']['profiles']['Row']['subscription_status'];

interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  purchaseUUID: string | null;
  productId: string | null;
  isTrial: boolean;
  isRenewing: boolean;
  loading: boolean;
}

interface SubscriptionContextValue extends SubscriptionState {
  isPro: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    tier: 'free',
    status: 'active',
    expiresAt: null,
    purchaseUUID: null,
    productId: null,
    isTrial: false,
    isRenewing: false,
    loading: true,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        tier: 'free',
        status: 'active',
        expiresAt: null,
        purchaseUUID: null,
        productId: null,
        isTrial: false,
        isRenewing: false,
        loading: false,
      }));
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'subscription_tier, subscription_status, subscription_expires_at, purchase_uuid, product_id, is_trial, is_renewing',
      )
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    setState({
      tier: data.subscription_tier,
      status: data.subscription_status,
      expiresAt: data.subscription_expires_at ? new Date(data.subscription_expires_at) : null,
      purchaseUUID: data.purchase_uuid,
      productId: data.product_id,
      isTrial: data.is_trial,
      isRenewing: data.is_renewing,
      loading: false,
    });
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Subscribe to realtime updates from webhooks
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-subscription-${user.id}`)
      .on<Database['public']['Tables']['profiles']['Row']>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const data = payload.new;
          setState({
            tier: data.subscription_tier,
            status: data.subscription_status,
            expiresAt: data.subscription_expires_at ? new Date(data.subscription_expires_at) : null,
            purchaseUUID: data.purchase_uuid,
            productId: data.product_id,
            isTrial: data.is_trial,
            isRenewing: data.is_renewing,
            loading: false,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value: SubscriptionContextValue = {
    ...state,
    isPro: state.tier === 'pro' && state.status === 'active',
    refresh: fetchSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
