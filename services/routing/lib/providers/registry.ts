import type { RouteProvider, RouteRequest } from './base';

/**
 * Provider Registry
 * Manages available routing providers and handles provider selection
 */
export class ProviderRegistry {
  private providers: Map<string, RouteProvider>;
  private defaultProvider: string;

  constructor(defaultProvider: string = 'mapbox') {
    this.providers = new Map();
    this.defaultProvider = defaultProvider;
  }

  /**
   * Register a routing provider
   * @param provider The provider to register
   */
  registerProvider(provider: RouteProvider): void {
    this.providers.set(provider.name, provider);
    console.log(`Registered provider: ${provider.name} (${provider.displayName})`);
  }

  /**
   * Get a specific provider by name
   * @param name Provider name
   * @returns The provider or undefined if not found
   */
  getProvider(name: string): RouteProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all available providers for a user plan
   * @param userPlan User's subscription plan
   * @returns Array of available providers
   */
  getAvailableProviders(userPlan: 'free' | 'paid' = 'free'): RouteProvider[] {
    const providers = Array.from(this.providers.values());

    // Filter providers based on user plan
    if (userPlan === 'free') {
      return providers.filter((p) => !p.capabilities.requiresPaidPlan);
    }

    return providers;
  }

  /**
   * Select the appropriate provider for a route request
   * @param request Route calculation request
   * @returns The selected provider
   * @throws Error if provider not found or not available for user plan
   */
  selectProvider(request: RouteRequest): RouteProvider {
    const userPlan = request.userPlan || 'free';

    // If provider is explicitly specified, use it
    if (request.provider) {
      const provider = this.providers.get(request.provider);

      if (!provider) {
        throw new Error(`Provider '${request.provider}' not found`);
      }

      // Check if user has access to this provider
      if (provider.capabilities.requiresPaidPlan && userPlan === 'free') {
        throw new Error(
          `Provider '${request.provider}' requires a paid plan. Please upgrade to access this provider.`,
        );
      }

      return provider;
    }

    // Use default provider
    const defaultProvider = this.providers.get(this.defaultProvider);

    if (!defaultProvider) {
      throw new Error(`Default provider '${this.defaultProvider}' not found`);
    }

    // Check if user has access to default provider
    if (defaultProvider.capabilities.requiresPaidPlan && userPlan === 'free') {
      // Fall back to first available free provider
      const freeProviders = this.getAvailableProviders('free');
      if (freeProviders.length === 0) {
        throw new Error('No free providers available');
      }
      return freeProviders[0]!;
    }

    return defaultProvider;
  }

  /**
   * Get all registered providers (regardless of user plan)
   * @returns Array of all providers
   */
  getAllProviders(): RouteProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if a provider is registered
   * @param name Provider name
   * @returns true if provider is registered
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get the default provider name
   * @returns Default provider name
   */
  getDefaultProviderName(): string {
    return this.defaultProvider;
  }

  /**
   * Set the default provider
   * @param name Provider name
   * @throws Error if provider not found
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Cannot set default provider: '${name}' not found`);
    }
    this.defaultProvider = name;
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();
