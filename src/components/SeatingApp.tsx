'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Header } from './Header';
import { StepNavigation } from './StepNavigation';
import { DemoOverlay } from './demo/DemoOverlay';
import { EmailCaptureBanner } from './EmailCaptureBanner';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePurchase } from '@/hooks/usePurchase';
import dynamic from 'next/dynamic';

function GuestListSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="h-14 bg-white border-b flex items-center gap-3 px-4">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse ml-auto" />
      </div>
      <div className="flex-1 p-4 space-y-3">
        {[72, 60, 80, 56, 68, 64, 76, 58].map((w, i) => (
          <div key={i} className="h-16 bg-white rounded-lg border p-3 flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-200 rounded-full animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className={`h-3 bg-slate-200 rounded animate-pulse`} style={{ width: `${w}%` }} />
              <div className="h-3 bg-slate-200 rounded animate-pulse w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VenueSetupSkeleton() {
  return (
    <div className="flex-1 flex">
      <div className="w-64 border-r bg-white p-4 space-y-4">
        <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
        <div className="h-10 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
        <div className="h-10 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-10 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="flex-1 bg-slate-100 flex items-center justify-center">
        <div className="h-64 w-96 bg-slate-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function SeatingStepSkeleton() {
  return (
    <div className="flex-1 flex">
      <div className="w-80 bg-white border-r p-4 space-y-3">
        <div className="h-10 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
        {[48, 64, 40, 56, 72, 44, 60].map((w, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg p-3 flex items-center gap-2">
            <div className="h-6 w-6 bg-slate-200 rounded-full animate-pulse shrink-0" />
            <div className={`h-3 bg-slate-200 rounded animate-pulse`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      <div className="flex-1 bg-slate-100" />
    </div>
  );
}

function CheckInSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="h-16 bg-white border-b flex items-center gap-3 px-4">
        <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse ml-auto" />
      </div>
      <div className="flex-1 p-4 space-y-3">
        {[66, 54, 72, 48, 60].map((w, i) => (
          <div key={i} className="h-16 bg-white rounded-lg border p-3 flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-200 rounded animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className={`h-3 bg-slate-200 rounded animate-pulse`} style={{ width: `${w}%` }} />
              <div className="h-3 bg-slate-200 rounded animate-pulse w-20" />
            </div>
            <div className="h-8 w-20 bg-slate-200 rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

const GuestListStep = dynamic(() => import('./guests/GuestListStep').then((m) => ({ default: m.GuestListStep })), {
  ssr: false,
  loading: () => <GuestListSkeleton />,
});

const VenueSetupStep = dynamic(() => import('./venue/VenueSetupStep').then((m) => ({ default: m.VenueSetupStep })), {
  ssr: false,
  loading: () => <VenueSetupSkeleton />,
});

const SeatingStep = dynamic(() => import('./seating/SeatingStep').then((m) => ({ default: m.SeatingStep })), {
  ssr: false,
  loading: () => <SeatingStepSkeleton />,
});

const CheckInStep = dynamic(() => import('./check-in/CheckInStep').then((m) => ({ default: m.CheckInStep })), {
  ssr: false,
  loading: () => <CheckInSkeleton />,
});

export function SeatingApp() {
  useKeyboardShortcuts();
  const { justUpgraded } = usePurchase();
  const currentStep = useSeatingStore((s) => s.currentStep);
  const isDemoMode = useSeatingStore((s) => s.isDemoMode);
  const guests = useSeatingStore((s) => s.guests);
  const startDemo = useSeatingStore((s) => s.startDemo);

  // Auto-start demo if ?demo=true query param present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      startDemo();
      const url = new URL(window.location.href);
      url.searchParams.delete('demo');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [startDemo]);

  // Toast on successful upgrade (session verified from Stripe redirect)
  useEffect(() => {
    if (justUpgraded) {
      toast.success("You're now Pro! All features unlocked.");
    }
  }, [justUpgraded]);

  // Toast + clean URL on cancelled payment
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase_cancelled') === 'true') {
      const url = new URL(window.location.href);
      url.searchParams.delete('purchase_cancelled');
      window.history.replaceState({}, '', url.pathname);
      toast('Payment cancelled. You can upgrade anytime.');
    }
  }, []);

  const isCheckIn = currentStep === 'check-in' && !isDemoMode;

  if (isCheckIn) {
    return <CheckInStep />;
  }

  return (
    <div className="flex flex-col h-dvh">
      <Header />
      <StepNavigation />
      <main className="flex-1 overflow-hidden relative">
        {currentStep === 'guests' && <GuestListStep />}
        {currentStep === 'venue' && <VenueSetupStep />}
        {currentStep === 'seating' && <SeatingStep />}
        {currentStep === 'check-in' && isDemoMode && <CheckInStep />}
      </main>
      <DemoOverlay />
      <EmailCaptureBanner show={guests.length >= 10} />
    </div>
  );
}
