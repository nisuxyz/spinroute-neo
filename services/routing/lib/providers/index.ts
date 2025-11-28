/**
 * Providers module
 * Exports all provider-related types and initializes the provider registry
 */

export * from './base';
export * from './registry';
export * from './mapbox';
export * from './mapbox-client';

import { providerRegistry } from './registry';
import { MapboxProvider } from './mapbox';
import { config } from '../config';

/**
 * Initialize and register all providers
 */
export function initializeProviders(): void {
  // Register Mapbox provider
  const mapboxProvider = new MapboxProvider();
  providerRegistry.registerProvider(mapboxProvider);

  // Set default provider from config
  if (config.routing.defaultProvider) {
    try {
      providerRegistry.setDefaultProvider(config.routing.defaultProvider);
    } catch (error) {
      console.warn(`Failed to set default provider to '${config.routing.defaultProvider}':`, error);
    }
  }

  console.log(`Initialized ${providerRegistry.getAllProviders().length} routing provider(s)`);
}
