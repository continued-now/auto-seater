'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, GripHorizontal, Users, Layout, Grid3X3, ClipboardCheck, Sparkles, Minimize2, Maximize2, MousePointerClick } from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from '../ui/Button';
import type { AppStep } from '@/types/seating';

interface DemoSubStep {
  majorView: AppStep;
  icon: React.ElementType;
  title: string;
  description: string;
  tryIt: string;
  action?: 'auto-assign' | 'check-in-staggered';
  isCTA?: boolean;
}

const DEMO_FLOW: DemoSubStep[] = [
  {
    majorView: 'guests',
    icon: Users,
    title: 'Your Guest List',
    description:
      '32 demo guests loaded with RSVPs, dietary needs, and accessibility tags. Search, filter by status, or click any guest to see their details.',
    tryIt: 'Try searching for "Johnson" or filtering by RSVP status',
  },
  {
    majorView: 'guests',
    icon: Users,
    title: 'Households & Groups',
    description:
      'The Johnsons, Patels, and Chens are grouped into households — they\'ll be seated together automatically. The Executive Team is a social circle for VIP placement.',
    tryIt: 'Click a guest to see their household and group tags',
  },
  {
    majorView: 'venue',
    icon: Layout,
    title: 'Your Floor Plan',
    description:
      '10 tables across a ballroom — 8 round (8 seats each) and 2 VIP rectangular (6 seats each). Fixtures like the stage, bar, and buffet are placed for traffic flow.',
    tryIt: 'Drag a table to reposition it, or scroll to zoom',
  },
  {
    majorView: 'seating',
    icon: Grid3X3,
    title: 'Auto-Assign Guests',
    description:
      'Watch the algorithm seat all 32 guests — respecting households, VIP circles, must-sit-together pairs, and keep-apart rules.',
    tryIt: 'Watch the tables fill up, then try moving a guest',
    action: 'auto-assign',
  },
  {
    majorView: 'seating',
    icon: Grid3X3,
    title: 'Fine-Tune & Export',
    description:
      'Drag guests between tables in the side panel. The constraint checker warns you if a move breaks a rule. Export PDF floor plans, place cards, or a shareable link.',
    tryIt: 'Drag a guest to a different table in the left panel',
  },
  {
    majorView: 'check-in',
    icon: ClipboardCheck,
    title: 'Event Day Check-In',
    description:
      'Guests scan a QR badge or staff searches by name. Track arrivals live — see who\'s here, which tables have empty seats, and cast to a TV at the entrance.',
    tryIt: 'Watch guests check in, then try searching by name',
    action: 'check-in-staggered',
  },
  {
    majorView: 'check-in',
    icon: Sparkles,
    title: 'Ready to Plan Your Event?',
    description:
      'You just experienced the full flow — guest list to check-in. Start free with up to 50 guests, or go Pro for $14.99 one-time.',
    tryIt: '',
    isCTA: true,
  },
];

export function DemoOverlay() {
  const isDemoMode = useSeatingStore((s) => s.isDemoMode);
  const setCurrentStep = useSeatingStore((s) => s.setCurrentStep);
  const autoAssignGuests = useSeatingStore((s) => s.autoAssignGuests);
  const checkInGuest = useSeatingStore((s) => s.checkInGuest);
  const guests = useSeatingStore((s) => s.guests);
  const exitDemo = useSeatingStore((s) => s.exitDemo);
  const startDemo = useSeatingStore((s) => s.startDemo);
  const isDemoMinimized = useSeatingStore((s) => s.isDemoMinimized);
  const toggleDemoMinimized = useSeatingStore((s) => s.toggleDemoMinimized);

  const [flowIndex, setFlowIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [checkedInCount, setCheckedInCount] = useState(0);

  const guestsRef = useRef(guests);
  guestsRef.current = guests;
  const actionFiredRef = useRef<number | null>(null);

  // Dragging state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset flow when demo starts
  useEffect(() => {
    if (isDemoMode) {
      setFlowIndex(0);
      setCheckedInCount(0);
      setPosition(null);
      actionFiredRef.current = null;
    }
  }, [isDemoMode]);

  // Trigger side effects when reaching specific steps
  useEffect(() => {
    if (!isDemoMode) return;

    const step = DEMO_FLOW[flowIndex];
    if (!step?.action) return;

    if (actionFiredRef.current === flowIndex) return;
    actionFiredRef.current = flowIndex;

    if (step.action === 'auto-assign') {
      setAnimating(true);
      const timer = setTimeout(() => {
        autoAssignGuests();
        setAnimating(false);
      }, 800);
      return () => clearTimeout(timer);
    }

    if (step.action === 'check-in-staggered') {
      setAnimating(true);
      setCheckedInCount(0);
      const currentGuests = guestsRef.current;
      const confirmed = currentGuests.filter((g) => g.rsvpStatus === 'confirmed' && !g.checkedInAt);
      const toCheckIn = confirmed.slice(0, 8);

      if (toCheckIn.length === 0) {
        setAnimating(false);
        return;
      }

      const timers: ReturnType<typeof setTimeout>[] = [];
      toCheckIn.forEach((guest, i) => {
        timers.push(
          setTimeout(() => {
            checkInGuest(guest.id);
            setCheckedInCount(i + 1);
            if (i === toCheckIn.length - 1) {
              setAnimating(false);
            }
          }, 600 + i * 500)
        );
      });

      return () => timers.forEach(clearTimeout);
    }
  }, [flowIndex, isDemoMode, autoAssignGuests, checkInGuest]);

  const goTo = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= DEMO_FLOW.length) return;

      const currentView = DEMO_FLOW[flowIndex].majorView;
      const targetView = DEMO_FLOW[targetIndex].majorView;

      if (targetView !== currentView) {
        setCurrentStep(targetView);
      }

      setFlowIndex(targetIndex);
    },
    [flowIndex, setCurrentStep]
  );

  const handleNext = useCallback(() => goTo(flowIndex + 1), [goTo, flowIndex]);
  const handleBack = useCallback(() => goTo(flowIndex - 1), [goTo, flowIndex]);

  const handleRestart = useCallback(() => {
    exitDemo();
    setTimeout(() => startDemo(), 50);
  }, [exitDemo, startDemo]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!panelRef.current) return;
    dragging.current = true;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const x = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - (panelRef.current?.offsetWidth ?? 0)));
    const y = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - (panelRef.current?.offsetHeight ?? 0)));
    setPosition({ x, y });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!isDemoMode) return null;

  const step = DEMO_FLOW[flowIndex];
  const isLastStep = flowIndex === DEMO_FLOW.length - 1;
  const isFirstStep = flowIndex === 0;
  const progress = ((flowIndex + 1) / DEMO_FLOW.length) * 100;
  const StepIcon = step.icon;

  // Minimized pill
  if (isDemoMinimized) {
    return (
      <div className="fixed z-50 bottom-5 right-5">
        <button
          onClick={toggleDemoMinimized}
          className="flex items-center gap-2.5 bg-white border border-border rounded-full pl-3.5 pr-3 py-2 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
        >
          <Sparkles size={14} className="text-primary" />
          <span className="text-sm font-medium text-foreground">Guide</span>
          <span className="text-xs text-muted-foreground">{flowIndex + 1}/{DEMO_FLOW.length}</span>
          <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Maximize2 size={13} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    );
  }

  const style: React.CSSProperties = position
    ? { left: position.x, top: position.y, transform: 'none' }
    : { bottom: 20, right: 20 };

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-[370px]"
      style={style}
    >
      <div className="bg-white rounded-xl shadow-lg border border-border overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          {/* Top bar: drag handle + minimize */}
          <div className="flex items-center justify-between mb-2.5 -mt-0.5">
            <span className="text-[10px] text-slate-400 font-medium">
              {flowIndex + 1} of {DEMO_FLOW.length}
            </span>
            <div
              className="cursor-grab active:cursor-grabbing select-none touch-none px-3"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <GripHorizontal size={14} className="text-slate-300" />
            </div>
            <button
              onClick={toggleDemoMinimized}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
              title="Minimize — explore on your own"
            >
              <Minimize2 size={13} />
            </button>
          </div>

          {/* Section badge + title */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex items-center gap-1 bg-primary-light text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              <StepIcon size={10} />
              {step.majorView.charAt(0).toUpperCase() + step.majorView.slice(1)}
            </div>
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-1">{step.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-2.5">{step.description}</p>

          {/* Staggered check-in counter */}
          {step.action === 'check-in-staggered' && animating && (
            <div className="mb-2.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${(checkedInCount / 8) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-cyan-600">{checkedInCount}/8 checked in</span>
            </div>
          )}

          {/* Auto-assign loading */}
          {step.action === 'auto-assign' && animating && (
            <div className="mb-2.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
              </div>
              <span className="text-xs font-medium text-primary">Assigning...</span>
            </div>
          )}

          {/* Try it prompt */}
          {step.tryIt && (
            <div className="flex items-start gap-2 bg-primary-light/60 rounded-lg px-3 py-2 mb-3">
              <MousePointerClick size={14} className="text-primary mt-0.5 shrink-0" />
              <span className="text-[12px] font-medium text-primary leading-snug">
                {step.tryIt}
              </span>
            </div>
          )}

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1 mb-3">
            {DEMO_FLOW.map((s, i) => {
              const isCurrent = i === flowIndex;
              const isInSameSection = s.majorView === step.majorView;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all cursor-pointer hover:opacity-80 ${
                    isCurrent
                      ? 'w-5 h-1.5 bg-primary'
                      : isInSameSection
                        ? 'w-1.5 h-1.5 bg-primary/30'
                        : 'w-1.5 h-1.5 bg-slate-200'
                  }`}
                />
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={exitDemo}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Exit Demo
            </button>

            <div className="flex items-center gap-1.5">
              {!isFirstStep && (
                <Button variant="ghost" size="sm" onClick={handleBack} disabled={animating}>
                  <ArrowLeft size={13} />
                  Back
                </Button>
              )}
              {step.isCTA ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRestart}
                  >
                    <RotateCcw size={13} />
                    Restart
                  </Button>
                  <Button size="sm" onClick={exitDemo}>
                    Start Planning
                    <ArrowRight size={13} />
                  </Button>
                </>
              ) : isLastStep ? (
                <Button size="sm" onClick={exitDemo}>
                  Start Planning
                  <ArrowRight size={13} />
                </Button>
              ) : (
                <Button size="sm" onClick={handleNext} disabled={animating}>
                  Next
                  <ArrowRight size={13} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
