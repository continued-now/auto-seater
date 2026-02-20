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

  return (
    <nav className="flex border-b border-border bg-white">
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const Icon = step.icon;
        return (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon size={16} />
            {step.label}
          </button>
        );
      })}

      <div className="ml-auto">
        <button
          onClick={() => setCurrentStep('check-in')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
            currentStep === 'check-in'
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <ClipboardCheck size={16} />
          Check-In
        </button>
      </div>
    </nav>
  );
}
