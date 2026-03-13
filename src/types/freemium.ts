export type UserTier = 'free' | 'pro';

export type GatedFeature =
  | 'custom-dimensions'
  | 'photo-to-room'
  | 'layout-advisor'
  | 'multi-room'
  | 'unlimited-guests'
  | 'place-cards'
  | 'escort-cards'
  | 'watermark-free'
  | 'auto-assign';

export const PRO_FEATURES: Set<GatedFeature> = new Set([
  'custom-dimensions',
  'photo-to-room',
  'layout-advisor',
  'multi-room',
  'unlimited-guests',
  'place-cards',
  'escort-cards',
  'watermark-free',
  'auto-assign',
]);
