import { useSeatingStore } from '@/stores/useSeatingStore';
import { PRO_FEATURES } from '@/types/freemium';
import type { GatedFeature } from '@/types/freemium';

export function useFeatureGate() {
  const userTier = useSeatingStore((s) => s.userTier);

  const canAccess = (feature: GatedFeature): boolean => {
    if (userTier === 'pro') return true;
    return !PRO_FEATURES.has(feature);
  };

  return { userTier, canAccess };
}
