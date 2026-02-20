export type UserTier = 'free' | 'pro';

export type GatedFeature = 'custom-dimensions';

export const PRO_FEATURES: Set<GatedFeature> = new Set(['custom-dimensions']);
