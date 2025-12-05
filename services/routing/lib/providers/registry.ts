import type { RouteProvider, RouteRequest, ProfileMetadata } from './base';

/**
 * Error thrown when a provider is not found
 */
export class ProviderNotFoundError extends Error {
  constructor(providerName: string) {
    super(`Provider '${providerName}' not found`);
    this.name = 'ProviderNotFoundError';
  }
}

/**
 * Error thrown when a profile is not supported by a provider
 */
export class InvalidProfileError extends Error {
  public readonly availableProfiles: string[];

  constructor(profile: string, providerName: string, availableProfiles: string[]) {
    super(
      `Profile '${profile}' is not supported by provider '${providerName}'. Available profiles: ${availableProfiles.join(', ')}`,
    );
    this.name = 'InvalidProfileError';
    this.availableProfiles = availableProfiles;
  }
}

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
   * Get profiles for a specific provider
   * @param providerName Provider name
   * @returns Array of profile metadata for the provider
   * @throws ProviderNotFoundError if provider not found
   */
  getProviderProfiles(providerName: string): ProfileMetadata[] {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new ProviderNotFoundError(providerName);
    }

    return provider.profiles;
  }

  /**
   * Validate that a profile is supported by a provider
   * @param providerName Provider name
   * @param profile Profile ID to validate
   * @returns true if profile is valid
   * @throws ProviderNotFoundError if provider not found
   * @throws InvalidProfileError if profile not supported
   */
  validateProfile(providerName: string, profile: string): boolean {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new ProviderNotFoundError(providerName);
    }

    const validProfile = provider.profiles.some((p) => p.id === profile);

    if (!validProfile) {
      const availableProfiles = provider.profiles.map((p) => p.id);
      throw new InvalidProfileError(profile, providerName, availableProfiles);
    }

    return true;
  }

  /**
   * Get all available providers for a user plan
   * @param userPlan User's subscription plan
   * @returns Array of available providers
   */
  getAvailableProviders(userPlan: 'free' | 'paid' = 'free'): RouteProvider[] {
    // All providers are currently available for all plans
    // Future: filter based on provider-specific plan requirements
    return Array.from(this.providers.values());
  }

  /**
   * Select the appropriate provider for a route request
   * @param request Route calculation request
   * @returns The selected provider
   * @throws ProviderNotFoundError if provider not found
   * @throws InvalidProfileError if profile not supported by provider
   */
  selectProvider(request: RouteRequest): RouteProvider {
    // If provider is explicitly specified, use it
    if (request.provider) {
      const provider = this.providers.get(request.provider);

      if (!provider) {
        throw new ProviderNotFoundError(request.provider);
      }

      // Validate profile if specified
      if (request.profile) {
        this.validateProfile(request.provider, request.profile);
      }

      return provider;
    }

    // Use default provider
    const defaultProvider = this.providers.get(this.defaultProvider);

    if (!defaultProvider) {
      throw new ProviderNotFoundError(this.defaultProvider);
    }

    // Validate profile if specified against default provider
    if (request.profile) {
      this.validateProfile(this.defaultProvider, request.profile);
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
