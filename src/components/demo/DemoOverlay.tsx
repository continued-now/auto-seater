'use client';

import { ArrowRight, RotateCcw, X } from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from '../ui/Button';

const DEMO_STEPS = [
  {
    title: "Who's Coming?",
    description:
      'Your guest list at a glance — track confirmed, pending, and tentative RSVPs. ' +
      'Manage dietary needs, accessibility, and household groups.',
    highlights: ['RSVP tracking', 'Dietary tags', 'Households', 'Search & filters'],
  },
  {
    title: 'Design Your Floor Plan',
    description:
      'Build your venue layout with tables and fixtures. ' +
      'Pick a template or start from scratch — drag, resize, and snap into place.',
    highlights: ['Table types', 'Fixtures & decor', 'Room layout', 'Templates'],
  },
  {
    title: 'Seating Made Easy',
    description:
      'Auto-assign seats guests respecting households, constraints, and dietary needs. ' +
      'Drag to rearrange, then export place cards and floor plans.',
    highlights: ['Auto-assign', 'Constraints', 'Drag-and-drop', 'Export & print'],
  },
  {
    title: 'Event Day Check-In',
    description:
      'On event day, check guests in as they arrive. ' +
      "See who's here, who's still expected, and find table assignments instantly.",
    highlights: ['Live check-in', 'Table lookup', 'Arrival tracking', 'Household groups'],
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
