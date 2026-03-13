import { useState, useCallback } from 'react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { PRO_FEATURES } from '@/types/freemium';
import type { GatedFeature } from '@/types/freemium';

export function useFeatureGate() {
  const userTier = useSeatingStore((s) => s.userTier);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();

  const canAccess = (feature: GatedFeature): boolean => {
    if (userTier === 'pro') return true;
    return !PRO_FEATURES.has(feature);
  };

  const requirePro = useCallback((feature: GatedFeature, label?: string): boolean => {
    if (canAccess(feature)) return true;
    setUpgradeFeature(label || feature);
    setUpgradeOpen(true);
    return false;
  }, [userTier]);

  return {
    userTier,
    canAccess,
    requirePro,
    upgradeOpen,
    setUpgradeOpen,
    upgradeFeature,
  };
}
