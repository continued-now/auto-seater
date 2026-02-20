'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Loader2, Sparkles, Search, Wrench } from 'lucide-react';
import { useLayoutAdvisor } from '@/hooks/useLayoutAdvisor';
import { useSeatingStore } from '@/stores/useSeatingStore';
import type { AdvisorMode, EventType } from '@/types/layout-advisor';
import IssueList from './IssueList';
import LayoutComparison from './LayoutComparison';
import BottleneckOverlay from './BottleneckOverlay';

interface LayoutAdvisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODE_OPTIONS: { mode: AdvisorMode; title: string; description: string; icon: React.ReactNode }[] = [
  {
    mode: 'fresh-arrange',
    title: 'Fresh Arrangement',
    description: 'AI creates an optimal layout from scratch using your room and furniture',
    icon: <Sparkles size={20} />,
  },
  {
    mode: 'bottleneck-analysis',
    title: 'Analyze Current Layout',
    description: 'Find bottlenecks, tight spots, and flow issues in your current setup',
    icon: <Search size={20} />,
  },
  {
    mode: 'hybrid-optimize',
    title: 'Optimize Current Layout',
    description: 'Analyze issues and get a suggested rearrangement that fixes them',
    icon: <Wrench size={20} />,
  },
];

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'classroom', label: 'Classroom' },
  { value: 'banquet', label: 'Banquet' },
];

export default function LayoutAdvisorDialog({ open, onOpenChange }: LayoutAdvisorDialogProps) {
  const {
    step,
    mode,
    guestCount,
    eventType,
    lockedFixtureIds,
    result,
    error,
    processingStatus,
    openAdvisor,
    selectMode,
    setGuestCount,
    setEventType,
    toggleLockFixture,
    startAnalysis,
    cancelProcessing,
    reset,
  } = useLayoutAdvisor();

  const venue = useSeatingStore((s) => s.venue);
  const applyLayoutSuggestion = useSeatingStore((s) => s.applyLayoutSuggestion);

  const [resultTab, setResultTab] = useState<'issues' | 'layout' | 'changes'>('issues');
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && step === 'idle') {
        openAdvisor();
      }
      if (!isOpen) {
        reset();
        setResultTab('issues');
        setHighlightedIssueId(null);
      }
      onOpenChange(isOpen);
    },
    [step, openAdvisor, reset, onOpenChange]
  );

  const handleAnalyze = useCallback(() => {
    startAnalysis(venue);
  }, [startAnalysis, venue]);

  const handleApply = useCallback(() => {
    if (result?.suggestedLayout) {
      applyLayoutSuggestion(result.suggestedLayout.changes);
      reset();
      onOpenChange(false);
    }
  }, [result, applyLayoutSuggestion, reset, onOpenChange]);

  const handleStartOver = useCallback(() => {
    reset();
    openAdvisor();
    setResultTab('issues');
    setHighlightedIssueId(null);
  }, [reset, openAdvisor]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent title="AI Layout Advisor" description="Analyze and optimize your venue layout" className="max-w-4xl">
        {/* Mode selection */}
        {step === 'mode-select' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => selectMode(opt.mode)}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${
                    mode === opt.mode
                      ? 'border-slate-800 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-slate-600 mb-2">{opt.icon}</div>
                  <p className="text-sm font-semibold text-slate-800">{opt.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{opt.description}</p>
                </button>
              ))}
            </div>

            {/* Optional inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Guest count</label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={guestCount ?? ''}
                  onChange={(e) => setGuestCount(e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Event type</label>
                <select
                  value={eventType ?? ''}
                  onChange={(e) => setEventType((e.target.value || null) as EventType | null)}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">Not specified</option>
                  {EVENT_TYPES.map((et) => (
                    <option key={et.value} value={et.value}>{et.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lock fixtures */}
            {venue.fixtures.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Lock fixtures (immovable)</label>
                <div className="flex flex-wrap gap-2">
                  {venue.fixtures.map((f) => (
                    <label key={f.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Checkbox
                        checked={lockedFixtureIds.includes(f.id)}
                        onCheckedChange={() => toggleLockFixture(f.id)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="primary" disabled={!mode} onClick={handleAnalyze}>
                Analyze
              </Button>
            </div>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 size={32} className="animate-spin text-slate-400" />
            <p className="text-sm text-slate-600 animate-pulse">{processingStatus}</p>
            <Button variant="secondary" size="sm" onClick={cancelProcessing}>
              Cancel
            </Button>
          </div>
        )}

        {/* Results */}
        {step === 'results' && result && (
          <div className="space-y-4">
            {/* Mode 1: Fresh Arrange — side-by-side comparison */}
            {mode === 'fresh-arrange' && result.suggestedLayout && (
              <>
                <LayoutComparison
                  currentConfig={venue}
                  suggestedChanges={result.suggestedLayout.changes}
                  summary={result.suggestedLayout.summary}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleStartOver}>Discard</Button>
                  <Button variant="primary" onClick={handleApply}>Apply Suggestion</Button>
                </div>
              </>
            )}

            {/* Mode 2: Bottleneck Analysis — overlay + issue list */}
            {mode === 'bottleneck-analysis' && result.issues && (
              <div className="flex gap-4">
                <BottleneckOverlay
                  config={venue}
                  issues={result.issues}
                  highlightedIssueId={highlightedIssueId}
                />
                <div className="flex-1 min-w-0">
                  <IssueList
                    issues={result.issues}
                    onHighlightIssue={(issue) => setHighlightedIssueId(issue.id)}
                  />
                </div>
              </div>
            )}

            {/* Mode 3: Hybrid — tabs */}
            {mode === 'hybrid-optimize' && (
              <>
                <div className="flex gap-1 border-b border-slate-200">
                  {(['issues', 'layout', 'changes'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setResultTab(tab)}
                      className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                        resultTab === tab
                          ? 'border-slate-800 text-slate-800'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab === 'issues' ? 'Issues Found' : tab === 'layout' ? 'Suggested Layout' : 'Changes Made'}
                    </button>
                  ))}
                </div>

                {resultTab === 'issues' && result.issues && (
                  <IssueList issues={result.issues} onHighlightIssue={(issue) => setHighlightedIssueId(issue.id)} />
                )}
                {resultTab === 'layout' && result.suggestedLayout && (
                  <LayoutComparison
                    currentConfig={venue}
                    suggestedChanges={result.suggestedLayout.changes}
                    summary={result.suggestedLayout.summary}
                  />
                )}
                {resultTab === 'changes' && result.suggestedLayout && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {result.suggestedLayout.changes.map((c, idx) => {
                      const obj = venue.tables.find((t) => t.id === c.objectId) || venue.fixtures.find((f) => f.id === c.objectId);
                      return (
                        <div key={idx} className="px-3 py-2 bg-slate-50 rounded-md text-xs">
                          <p className="font-medium text-slate-700">{obj?.label || c.objectId}</p>
                          <p className="text-slate-500 mt-0.5">{c.reason}</p>
                        </div>
                      );
                    })}
                    {result.suggestedLayout.changes.length === 0 && (
                      <p className="text-xs text-slate-400 py-4 text-center">No changes needed</p>
                    )}
                  </div>
                )}

                {result.suggestedLayout && (
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={handleStartOver}>Discard</Button>
                    <Button variant="primary" onClick={handleApply}>Apply Suggestion</Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <p className="text-sm text-red-600">{error}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleStartOver}>Start Over</Button>
              <Button variant="primary" onClick={handleAnalyze}>Try Again</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
