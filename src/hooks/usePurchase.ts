'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { getPurchase, savePurchase, isPro, type PurchaseRecord } from '@/lib/purchase';

export function usePurchase() {
  const setUserTier = useSeatingStore((s) => s.setUserTier);
  const [purchase, setPurchase] = useState<PurchaseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [justUpgraded, setJustUpgraded] = useState(false);

  // Load purchase from localStorage on mount
  useEffect(() => {
    const existing = getPurchase();
    if (existing?.verified) {
      setPurchase(existing);
      setUserTier('pro');
    }
  }, [setUserTier]);

  // Check URL for purchase success redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('purchase_success');
    if (!sessionId) return;

    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete('purchase_success');
    window.history.replaceState({}, '', url.pathname);

    // Verify purchase
    setLoading(true);
    fetch(`/api/verify-purchase?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.verified) {
          const record: PurchaseRecord = {
            sessionId,
            email: data.email || '',
            purchasedAt: Date.now(),
            verified: true,
          };
          savePurchase(record);
          setPurchase(record);
          setUserTier('pro');
          setJustUpgraded(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setUserTier]);

  const startCheckout = useCallback(async (email?: string) => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Checkout failed
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  const restorePurchase = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/verify-purchase?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (data.verified) {
        const record: PurchaseRecord = {
          sessionId,
          email: data.email || '',
          purchasedAt: Date.now(),
          verified: true,
        };
        savePurchase(record);
        setPurchase(record);
        setUserTier('pro');
        setJustUpgraded(true);
        return true;
      }
    } catch {
      // Restore failed
    }
    return false;
  }, [setUserTier]);

  return {
    purchase,
    isPro: purchase !== null && purchase.verified,
    loading,
    checkoutLoading,
    startCheckout,
    justUpgraded,
    restorePurchase,
  };
}
