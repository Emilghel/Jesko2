/**
 * API Configuration and Version Management
 * 
 * This module centralizes API configuration information and provides
 * utilities for API versioning and error recovery.
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

// Define API Config type for type safety
type ApiConfig = {
  [key: string]: any;
  baseUrl: string;
  defaultVersion: string | null;
  versionHeader: string;
  endpoints: Record<string, string>;
  fallbackVersions: (string | null)[];
  fallbackEndpoints: Record<string, string[]>;
  successCache: Record<string, {
    endpoint: string;
    version: string | null;
    timestamp: string;
  }>;
};

// Default configuration for Runway API
export const DEFAULT_RUNWAY_CONFIG: ApiConfig = {
  baseUrl: 'https://api.runwayml.com',  // Using production API
  defaultVersion: '2024-11-06',  // Exact value required per documentation
  versionHeader: 'X-Runway-Version',
  endpoints: {
    imageToVideo: '/v1/image_to_video',
    interpolate: '/v1/interpolations',
    models: '/v1/models'
  },
  
  // Fallback versions to try if the default fails
  // According to documentation there is only one valid version value
  fallbackVersions: [
    // Keeping a few fallbacks just in case they update but docs are behind
    '2024-11-06',  // The exact value specified in docs
    null,          // Try without version as last resort
  ],
  
  // Alternative endpoints to try if main ones fail
  fallbackEndpoints: {
    imageToVideo: [
      '/v1/image-to-video',
      '/v1/generations',
      '/v1/gen-2/imagine',
      '/v1/images/text-to-video',
      '/api/v1/image_to_video'
    ],
    // Add production API endpoints as well
    productionImageToVideo: [
      'https://api.runwayml.com/v1/image_to_video',
      'https://api.runwayml.com/v1/image-to-video'
    ],
    interpolate: [
      '/v1/interpolate',
      '/interpolate',
      '/v1/transitions'
    ]
  },
  
  // Cache successful configurations
  successCache: {}
};

// Configuration for different APIs
export const API_CONFIGS: Record<string, ApiConfig> = {
  runway: DEFAULT_RUNWAY_CONFIG,
  
  // Add other API configurations as needed
  spike: {
    baseUrl: 'https://api.spike.studio',
    defaultVersion: 'v1',
    versionHeader: 'API-Version',
    endpoints: {
      transform: '/v1/transform',
      clip: '/v1/clip',
      models: '/v1/models'
    },
    fallbackVersions: ['v2', null],
    fallbackEndpoints: {
      transform: ['/transform', '/api/transform'],
      clip: ['/clip', '/api/clip'],
      models: ['/models', '/api/models']
    },
    successCache: {}
  },
  
  klap: {
    baseUrl: 'https://api.klapai.com',
    defaultVersion: 'v1',
    versionHeader: 'X-API-Version',
    endpoints: {
      transform: '/v1/transform',
      generate: '/v1/generate',
      models: '/v1/models'
    },
    fallbackVersions: ['v2', null],
    fallbackEndpoints: {
      transform: ['/transform', '/api/transform'],
      generate: ['/generate', '/api/generate'],
      models: ['/models', '/api/models']
    },
    successCache: {}
  }
};

/**
 * Update the API configuration when a successful combination is found
 * 
 * @param api The API identifier (e.g., 'runway')
 * @param service The service being used (e.g., 'imageToVideo')
 * @param endpoint The successful endpoint
 * @param version The successful version header value
 */
export function cacheSuccessfulConfig(
  api: string, 
  service: string, 
  endpoint: string, 
  version: string | null
): void {
  if (!API_CONFIGS[api] || !API_CONFIGS[api].successCache) {
    return;
  }
  
  // Save the successful combination to memory
  API_CONFIGS[api].successCache[service] = {
    endpoint,
    version,
    timestamp: new Date().toISOString()
  };
  
  // Log the successful combination
  logger.info(`Found working API configuration for ${api}/${service}: endpoint=${endpoint}, version=${version || 'none'}`);
  
  // We could save this to a local file if needed for persistence
}

/**
 * Get the best endpoint and version header for an API service
 * 
 * This prioritizes previously successful combinations, then falls back
 * to defaults, and can provide fallback options for retry loops.
 * 
 * @param api The API identifier (e.g., 'runway')
 * @param service The service being used (e.g., 'imageToVideo')
 * @returns The best endpoint and version to try
 */
export function getApiConfig(api: string, service: string): {
  baseUrl: string,
  endpoint: string,
  versionHeader: string | null,
  versionValue: string | null
} {
  const config = API_CONFIGS[api];
  if (!config) {
    throw new Error(`Unknown API configuration: ${api}`);
  }
  
  // If we've successfully used this API service before, use that configuration
  const cachedConfig = config.successCache?.[service];
  if (cachedConfig) {
    return {
      baseUrl: config.baseUrl,
      endpoint: cachedConfig.endpoint,
      versionHeader: cachedConfig.version ? config.versionHeader : null,
      versionValue: cachedConfig.version
    };
  }
  
  // Otherwise use the default configuration
  return {
    baseUrl: config.baseUrl,
    endpoint: config.endpoints[service],
    versionHeader: config.defaultVersion ? config.versionHeader : null,
    versionValue: config.defaultVersion
  };
}

/**
 * Get fallback configurations to try if the primary one fails
 * 
 * @param api The API identifier
 * @param service The service being used
 * @returns Array of fallback configurations to try
 */
export function getFallbackConfigs(api: string, service: string): Array<{
  baseUrl: string,
  endpoint: string,
  versionHeader: string | null,
  versionValue: string | null
}> {
  const config = API_CONFIGS[api];
  if (!config) {
    return [];
  }
  
  const results = [];
  
  // Try the primary endpoint with different version values
  if (config.fallbackVersions && config.fallbackVersions.length > 0) {
    for (const version of config.fallbackVersions) {
      // Skip the default version since we already tried it
      if (version === config.defaultVersion) {
        continue;
      }
      
      results.push({
        baseUrl: config.baseUrl,
        endpoint: config.endpoints[service],
        versionHeader: version ? config.versionHeader : null,
        versionValue: version
      });
    }
  }
  
  // Try alternative endpoints with the default version
  if (config.fallbackEndpoints && config.fallbackEndpoints[service]) {
    for (const endpoint of config.fallbackEndpoints[service]) {
      // Handle full URLs in the endpoint
      const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');
      const baseUrl = isFullUrl ? '' : config.baseUrl;
      
      results.push({
        baseUrl: baseUrl,
        endpoint: endpoint,
        versionHeader: config.defaultVersion ? config.versionHeader : null,
        versionValue: config.defaultVersion
      });
      
      // Also try each alternative endpoint with no version header
      results.push({
        baseUrl: baseUrl,
        endpoint: endpoint,
        versionHeader: null,
        versionValue: null
      });
    }
  }
  
  // Try production endpoints if available (for specific services)
  const productionService = `production${service.charAt(0).toUpperCase() + service.slice(1)}`;
  if (config.fallbackEndpoints && config.fallbackEndpoints[productionService]) {
    for (const fullEndpoint of config.fallbackEndpoints[productionService]) {
      // These are expected to be full URLs
      results.push({
        baseUrl: '',
        endpoint: fullEndpoint,
        versionHeader: config.versionHeader,
        versionValue: config.defaultVersion
      });
      
      // Also try each production endpoint with no version header
      results.push({
        baseUrl: '',
        endpoint: fullEndpoint,
        versionHeader: null,
        versionValue: null
      });
      
      // And with different version formats
      for (const version of config.fallbackVersions) {
        if (version) { // Only for non-null versions
          results.push({
            baseUrl: '',
            endpoint: fullEndpoint,
            versionHeader: config.versionHeader,
            versionValue: version
          });
        }
      }
    }
  }
  
  return results;
}