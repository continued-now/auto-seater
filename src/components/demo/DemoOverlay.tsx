'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, GripHorizontal, Users, Layout, Grid3X3, ClipboardCheck, Download, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from '../ui/Button';
import type { AppStep } from '@/types/seating';

/* ──────────────────────────────────────────────
   Demo Flow Definition
   Each sub-step belongs to a majorView (app tab).
   The overlay navigates sub-steps while switching
   the app view when the majorView changes.
   ────────────────────────────────────────────── */

interface DemoSubStep {
  majorView: AppStep;
  icon: React.ElementType;
  title: string;
  description: string;
  highlights: string[];
  /** Direction hint — where the user should look */
  pointer?: 'top' | 'left' | 'center' | 'top-right' | null;
  /** Side effect to trigger when this step is reached */
  action?: 'auto-assign' | 'check-in-staggered';
  /** Final CTA step */
  isCTA?: boolean;
}

const DEMO_FLOW: DemoSubStep[] = [
  // ── Guests (3 sub-steps) ──────────────────
  {
    majorView: 'guests',
    icon: Users,
    title: 'Your Guest List at a Glance',
    description:
      'AutoSeater loaded 32 demo guests with real-world data — confirmed RSVPs, pending responses, dietary needs, and accessibility tags. In your event, import from a spreadsheet or add guests one by one.',
    highlights: ['32 guests', '24 confirmed', '3 tentative', '2 pending', '2 declined'],
    pointer: 'center',
  },
  {
    majorView: 'guests',
    icon: Users,
    title: 'Search, Filter & Track RSVPs',
    description:
      'Use the search bar to find anyone instantly. Filter by RSVP status, dietary needs, or seating assignment. Guests with special requirements are clearly tagged so nothing falls through the cracks.',
    highlights: ['Fuzzy search', 'RSVP filters', 'Dietary tags', 'Accessibility flags'],
    pointer: 'top',
  },
  {
    majorView: 'guests',
    icon: Users,
    title: 'Households & Social Circles',
    description:
      'The Johnsons (3), Patels (2), and Chens (3) are grouped into households — they\'ll be seated together automatically. The 6-person Executive Team is tagged as a social circle for VIP table placement.',
    highlights: ['3 households', '1 social circle', 'Auto-grouped seating', 'Keep-together rules'],
    pointer: 'left',
  },

  // ── Venue (3 sub-steps) ────────────────────
  {
    majorView: 'venue',
    icon: Layout,
    title: 'Your Event Floor Plan',
    description:
      'A 70×50 ft ballroom with 10 tables: 8 round tables seating 8 each, plus 2 VIP rectangular tables seating 6 each — 76 total seats. Drag tables to reposition, resize to adjust capacity.',
    highlights: ['10 tables', '76 total seats', 'Drag to move', 'Snap to grid'],
    pointer: 'center',
  },
  {
    majorView: 'venue',
    icon: Layout,
    title: 'Fixtures & Venue Landmarks',
    description:
      'The stage, bar, buffet, entrance, and coat check are placed as fixtures. These help orient guests and ensure clear traffic flow between tables and key areas.',
    highlights: ['Stage', 'Bar', 'Buffet', 'Entrance', 'Coat Check'],
    pointer: 'center',
  },
  {
    majorView: 'venue',
    icon: Layout,
    title: 'AI Photo-to-Room (Pro)',
    description:
      'Don\'t want to build manually? Pro users can snap a photo of their venue and AI generates the entire floor plan — tables, walls, and fixtures placed automatically. Then fine-tune with drag-and-drop.',
    highlights: ['Photo → floor plan', 'AI-powered', 'Fine-tune after', 'Pro feature'],
    pointer: null,
  },

  // ── Seating (3 sub-steps) ──────────────────
  {
    majorView: 'seating',
    icon: Grid3X3,
    title: 'Watch Auto-Assign Work',
    description:
      'The algorithm is seating all 32 guests right now — respecting households (Johnsons together), the Executive social circle at VIP tables, the CEO+COO must-sit-together constraint, and Tom & Brian\'s keep-apart rule.',
    highlights: ['Households respected', 'VIP placement', 'Constraints honored', 'Dietary grouping'],
    pointer: 'center',
    action: 'auto-assign',
  },
  {
    majorView: 'seating',
    icon: Grid3X3,
    title: 'Drag to Fine-Tune',
    description:
      'Not happy with a placement? Drag any guest between tables in the left panel. The constraint checker warns you instantly if a move would break a rule. Full undo/redo with Cmd+Z.',
    highlights: ['Drag between tables', 'Constraint warnings', 'Undo/redo', 'Unassigned panel'],
    pointer: 'left',
  },
  {
    majorView: 'seating',
    icon: Download,
    title: 'Export & Share',
    description:
      'When you\'re happy, export PDF floor plans, place cards (3.5×2 in, 10/page), escort card lists, or table service sheets for kitchen staff. Share a live link so guests can find their table on any device.',
    highlights: ['PDF floor plan', 'Place cards', 'Escort cards', 'Shareable link', 'QR codes'],
    pointer: 'top-right',
  },

  // ── Check-in (2 sub-steps) ─────────────────
  {
    majorView: 'check-in',
    icon: ClipboardCheck,
    title: 'Event Day Check-In',
    description:
      'Guests arrive and scan their QR badge — or staff searches by name. Watch as guests check in one by one...',
    highlights: ['QR badge scan', 'Name search', 'Instant check-in', 'Live tracking'],
    pointer: 'center',
    action: 'check-in-staggered',
  },
  {
    majorView: 'check-in',
    icon: ClipboardCheck,
    title: 'Real-Time Attendance',
    description:
      'Track arrivals in real-time — see who\'s here, who\'s expected, and which tables have empty seats. Cast the floor plan to a TV at the entrance with TV Display Mode so guests find their table without an usher.',
    highlights: ['Arrival dashboard', 'Table fill status', 'TV display mode', 'No usher needed'],
    pointer: 'top',
  },

  // ── Final CTA ──────────────────────────────
  {
    majorView: 'check-in',
    icon: Sparkles,
    title: 'Ready to Plan Your Event?',
    description:
      'You just saw AutoSeater handle 32 guests end-to-end — from guest list to check-in. Start free with up to 50 guests, or unlock unlimited guests and AI features for a one-time $14.99.',
    highlights: ['Free up to 50 guests', '$14.99 one-time Pro', 'No account required', 'Works offline'],
    pointer: null,
    isCTA: true,
  },
];

/* ──────────────────────────────────────────────
   Pointer Arrow Component
   Shows a directional indicator on the panel edge
   ────────────────────────────────────────────── */

function PointerArrow({ direction }: { direction?: string | null }) {
  if (!direction) return null;

  const styles: Record<string, string> = {
    top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
    left: 'top-1/2 left-0 -translate-x-full -translate-y-1/2 rotate-[-90deg]',
    center: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
    'top-right': 'top-0 right-6 -translate-y-full',
  };

  const labels: Record<string, string> = {
    top: 'Look above',
    left: 'Check the side panel',
    center: 'Look at the main area',
    'top-right': 'Check the toolbar',
  };

  return (
    <div className={`absolute ${styles[direction] ?? ''} flex flex-col items-center gap-1 pointer-events-none`}>
      <span className="text-[10px] font-medium text-primary/70 whitespace-nowrap bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
        {labels[direction] ?? ''}
      </span>
      <svg width="12" height="8" viewBox="0 0 12 8" className="text-primary/40">
        <path d="M6 0L12 8H0L6 0Z" fill="currentColor" />
      </svg>
    </div>
  );
}

/* ──────────────────────────────────────────────
   DemoOverlay — Main Component
   ────────────────────────────────────────────── */

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

  // Ref to capture guests snapshot for check-in (avoids re-triggering effect)
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

    // Prevent re-firing the same action on re-renders
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
      // Snapshot guests at this moment to avoid re-triggering
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

  // Navigate to a flow index, switching app view if needed
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

  // Minimized pill view — small floating button to restore the guide
  if (isDemoMinimized) {
    return (
      <div className="fixed z-50 bottom-6 left-1/2 -translate-x-1/2">
        <button
          onClick={toggleDemoMinimized}
          className="flex items-center gap-2 bg-white border border-border rounded-full px-4 py-2.5 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-primary" />
            <span className="text-sm font-medium text-foreground">Demo Guide</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{flowIndex + 1}/{DEMO_FLOW.length}</span>
            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <Maximize2 size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    );
  }

  const style: React.CSSProperties = position
    ? { left: position.x, top: position.y, transform: 'none' }
    : { bottom: 24, left: '50%', transform: 'translateX(-50%)' };

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-full max-w-lg px-4"
      style={style}
    >
      <div className="bg-white rounded-xl shadow-lg border border-border overflow-hidden relative">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5">
          {/* Pointer arrow */}
          <PointerArrow direction={step.pointer} />

          {/* Drag handle + minimize */}
          <div className="flex items-center justify-between mb-3 -mt-1">
            <div className="w-7" />
            <div
              className="cursor-grab active:cursor-grabbing select-none touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <GripHorizontal size={16} className="text-slate-300" />
            </div>
            <button
              onClick={toggleDemoMinimized}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
              title="Minimize guide — explore on your own"
            >
              <Minimize2 size={14} />
            </button>
          </div>

          {/* Step counter + section label */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 bg-primary-light text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <StepIcon size={10} />
              {step.majorView.charAt(0).toUpperCase() + step.majorView.slice(1)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {flowIndex + 1} of {DEMO_FLOW.length}
            </span>
          </div>

          {/* Content */}
          <h3 className="text-base font-semibold text-foreground mb-1.5">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.description}</p>

          {/* Staggered check-in counter */}
          {step.action === 'check-in-staggered' && animating && (
            <div className="mb-3 flex items-center gap-2">
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
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
              </div>
              <span className="text-xs font-medium text-primary">Assigning...</span>
            </div>
          )}

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

          {/* Explore hint */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Minimize2 size={10} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              Minimize to explore this section yourself
            </span>
          </div>

          {/* Step dots (grouped by majorView) */}
          <div className="flex items-center justify-center gap-1 mb-4">
            {DEMO_FLOW.map((s, i) => {
              const isCurrent = i === flowIndex;
              const isInSameSection = s.majorView === step.majorView;
              return (
                <div
                  key={i}
                  className={`rounded-full transition-all ${
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
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Exit Demo
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button variant="ghost" size="sm" onClick={handleBack} disabled={animating}>
                  <ArrowLeft size={14} />
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
                    <RotateCcw size={14} />
                    Restart
                  </Button>
                  <Button size="sm" onClick={exitDemo}>
                    Start Planning Your Event
                    <ArrowRight size={14} />
                  </Button>
                </>
              ) : isLastStep ? (
                <Button size="sm" onClick={exitDemo}>
                  Start Planning
                  <ArrowRight size={14} />
                </Button>
              ) : (
                <Button size="sm" onClick={handleNext} disabled={animating}>
                  Next
                  <ArrowRight size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
