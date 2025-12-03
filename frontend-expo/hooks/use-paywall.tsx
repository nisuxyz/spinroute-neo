import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface PaywallContextValue {
  isVisible: boolean;
  showPaywall: () => void;
  hidePaywall: () => void;
}

const PaywallContext = createContext<PaywallContextValue | null>(null);

interface PaywallProviderProps {
  children: ReactNode;
}

export function PaywallProvider({ children }: PaywallProviderProps) {
  const [isVisible, setIsVisible] = useState(false);

  const showPaywall = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <PaywallContext.Provider value={{ isVisible, showPaywall, hidePaywall }}>
      {children}
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const context = useContext(PaywallContext);
  if (!context) {
    throw new Error('usePaywall must be used within PaywallProvider');
  }
  return context;
}
