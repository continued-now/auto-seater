'use client';

import { Users, Layout, Grid3X3, ClipboardCheck } from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import type { AppStep } from '@/types/seating';

const steps: { id: AppStep; label: string; icon: React.ElementType }[] = [
  { id: 'guests', label: 'Guests', icon: Users },
  { id: 'venue', label: 'Venue', icon: Layout },
  { id: 'seating', label: 'Seating', icon: Grid3X3 },
];

export function StepNavigation() {
  const currentStep = useSeatingStore((s) => s.currentStep);
  const setCurrentStep = useSeatingStore((s) => s.setCurrentStep);
  const isDemoMode = useSeatingStore((s) => s.isDemoMode);

  return (
    <nav className="flex border-b border-border bg-white shrink-0 overflow-x-auto">
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const Icon = step.icon;
        return (
          <button
            key={step.id}
            onClick={() => !isDemoMode && setCurrentStep(step.id)}
            disabled={isDemoMode}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-sm font-medium transition-colors border-b-2 shrink-0 ${
              isDemoMode ? 'cursor-default' : 'cursor-pointer'
            } ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon size={16} />
            <span className="hidden xs:inline sm:inline">{step.label}</span>
          </button>
        );
      })}

      <div className="ml-auto shrink-0">
        <button
          onClick={() => !isDemoMode && setCurrentStep('check-in')}
          disabled={isDemoMode}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-sm font-medium transition-colors border-b-2 shrink-0 ${
            isDemoMode ? 'cursor-default' : 'cursor-pointer'
          } ${
            currentStep === 'check-in'
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <ClipboardCheck size={16} />
          <span className="hidden xs:inline sm:inline">Check-In</span>
        </button>
      </div>
    </nav>
  );
}
