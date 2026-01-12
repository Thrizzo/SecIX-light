/**
 * SecIX Edition Configuration
 * 
 * Defines which features are available in each edition:
 * - full: All features enabled
 * - light: Core GRC (Dashboard, Journey, Risks, Controls, Assets) + AI
 */

export type Edition = 'full' | 'light';

// Features available in each edition
export const EDITION_FEATURES = {
  // Light Edition features (core GRC + AI)
  dashboard: ['full', 'light'],
  securityJourney: ['full', 'light'],
  riskManagement: ['full', 'light'],
  controlLibrary: ['full', 'light'],
  assetManagement: ['full', 'light'],
  aiFeatures: ['full', 'light'],
  
  // Full Edition only features
  myWorkplace: ['full'],
  governance: ['full'],
  vendorManagement: ['full'],
  businessContinuity: ['full'],
  dataProtection: ['full'],
  maturityAssessment: ['full'],
  securityOperations: ['full'],
  aiGovernance: ['full'],
  dataForge: ['full'],
} as const;

export type FeatureKey = keyof typeof EDITION_FEATURES;

/**
 * Get edition from runtime config or environment
 */
function getEdition(): Edition {
  // Check runtime config first (for Docker deployments)
  const runtime = (window as any).__RUNTIME_CONFIG__?.EDITION;
  if (runtime === 'light' || runtime === 'full') {
    return runtime;
  }
  
  // Fall back to build-time environment variable
  const envEdition = import.meta.env.VITE_EDITION;
  if (envEdition === 'light' || envEdition === 'full') {
    return envEdition;
  }
  
  // Default to full edition
  return 'full';
}

/**
 * Edition utility object for checking current edition and feature availability
 */
export const edition = {
  /**
   * Get the current edition from runtime config or environment
   */
  get current(): Edition {
    return getEdition();
  },
  
  /**
   * Check if running Light edition
   */
  isLight(): boolean {
    return this.current === 'light';
  },
  
  /**
   * Check if running Full edition
   */
  isFull(): boolean {
    return this.current === 'full';
  },
  
  /**
   * Check if a specific feature is available in the current edition
   */
  hasFeature(feature: FeatureKey): boolean {
    const allowedEditions = EDITION_FEATURES[feature];
    return allowedEditions.includes(this.current);
  },
  
  /**
   * Get edition display name
   */
  get displayName(): string {
    return this.isLight() ? 'SecIX Light' : 'SecIX';
  }
};
