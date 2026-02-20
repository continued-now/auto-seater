export type UserTier = 'free' | 'pro';

export type GatedFeature = 'custom-dimensions' | 'photo-to-room' | 'layout-advisor';

export const PRO_FEATURES: Set<GatedFeature> = new Set([
  'custom-dimensions',
  'photo-to-room',
  'layout-advisor',
]);
