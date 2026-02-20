'use client';

import { ArrowRight, RotateCcw, X } from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from '../ui/Button';

const DEMO_STEPS = [
  {
    title: 'Your Guest List',
    description:
      'Manage your event guests. Add them manually, import from CSV, set RSVP status, dietary needs, and group into households.',
    highlights: ['Guest table', 'RSVP badges', 'Dietary tags', 'Search & filters'],
  },
  {
    title: 'Your Floor Plan',
    description:
      'Customize your venue layout. Choose a template or build from scratch. Add tables, fixtures, and adjust dimensions.',
    highlights: ['Room dimensions', 'Table types', 'Fixtures', 'Template gallery'],
  },
  {
    title: 'Seating Comes Together',
    description:
      'Auto-assign places guests respecting households, constraints, and social circles. Drag guests to rearrange.',
    highlights: ['Auto-assign results', 'Constraints', 'Drag-and-drop', 'Export options'],
  },
];

export function DemoOverlay() {
  const isDemoMode = useSeatingStore((s) => s.isDemoMode);
  const demoStep = useSeatingStore((s) => s.demoStep);
  const advanceDemoStep = useSeatingStore((s) => s.advanceDemoStep);
  const exitDemo = useSeatingStore((s) => s.exitDemo);
  const startDemo = useSeatingStore((s) => s.startDemo);

  if (!isDemoMode) return null;

  const step = DEMO_STEPS[demoStep];
  const isLastStep = demoStep === DEMO_STEPS.length - 1;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="bg-white rounded-xl shadow-lg border border-border p-5">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {DEMO_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === demoStep
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-base font-semibold text-foreground mb-1">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{step.description}</p>

        {/* Highlight badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {step.highlights.map((h) => (
            <span
              key={h}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs font-medium text-primary"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={exitDemo}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Exit Demo
          </button>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    exitDemo();
                    startDemo();
                  }}
                >
                  <RotateCcw size={14} />
                  Restart
                </Button>
                <Button size="sm" onClick={exitDemo}>
                  Start Planning Your Event
                  <ArrowRight size={14} />
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={advanceDemoStep}>
                Next
                <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
