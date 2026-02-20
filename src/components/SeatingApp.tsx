'use client';

import { Header } from './Header';
import { StepNavigation } from './StepNavigation';
import { DemoOverlay } from './demo/DemoOverlay';
import { DemoInteractionBlocker } from './demo/DemoInteractionBlocker';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import dynamic from 'next/dynamic';

const GuestListStep = dynamic(() => import('./guests/GuestListStep').then((m) => ({ default: m.GuestListStep })), {
  ssr: false,
  loading: () => <StepLoading />,
});

const VenueSetupStep = dynamic(() => import('./venue/VenueSetupStep').then((m) => ({ default: m.VenueSetupStep })), {
  ssr: false,
  loading: () => <StepLoading />,
});

const SeatingStep = dynamic(() => import('./seating/SeatingStep').then((m) => ({ default: m.SeatingStep })), {
  ssr: false,
  loading: () => <StepLoading />,
});

const CheckInStep = dynamic(() => import('./check-in/CheckInStep').then((m) => ({ default: m.CheckInStep })), {
  ssr: false,
  loading: () => <StepLoading />,
});

function StepLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  );
}

export function SeatingApp() {
  useKeyboardShortcuts();
  const currentStep = useSeatingStore((s) => s.currentStep);
  const isDemoMode = useSeatingStore((s) => s.isDemoMode);

  const isCheckIn = currentStep === 'check-in' && !isDemoMode;

  if (isCheckIn) {
    return <CheckInStep />;
  }

  return (
    <div className="flex flex-col h-dvh">
      <Header />
      <StepNavigation />
      <main className="flex-1 overflow-hidden relative">
        <DemoInteractionBlocker />
        {currentStep === 'guests' && <GuestListStep />}
        {currentStep === 'venue' && <VenueSetupStep />}
        {currentStep === 'seating' && <SeatingStep />}
        {currentStep === 'check-in' && isDemoMode && <CheckInStep />}
      </main>
      <DemoOverlay />
    </div>
  );
}
