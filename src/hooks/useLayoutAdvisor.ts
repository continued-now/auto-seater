'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AdvisorMode, EventType, LayoutAdvisorStep, LayoutAdvisorResponse } from '@/types/layout-advisor';
import type { VenueConfig } from '@/types/venue';
import { useSeatingStore } from '@/stores/useSeatingStore';

const STATUS_MESSAGES = [
  'Analyzing room dimensions...',
  'Evaluating traffic flow...',
  'Checking sightlines...',
  'Generating suggestions...',
];

export function useLayoutAdvisor() {
  const [step, setStep] = useState<LayoutAdvisorStep>('idle');
  const [mode, setMode] = useState<AdvisorMode | null>(null);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [lockedFixtureIds, setLockedFixtureIds] = useState<string[]>([]);
  const [result, setResult] = useState<LayoutAdvisorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const guests = useSeatingStore((s) => s.guests);

  // Cleanup interval on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, []);

  const openAdvisor = useCallback(() => {
    setStep('mode-select');
    setGuestCount(guests.length > 0 ? guests.length : null);
  }, [guests.length]);

  const selectMode = useCallback((m: AdvisorMode) => {
    setMode(m);
  }, []);

  const toggleLockFixture = useCallback((id: string) => {
    setLockedFixtureIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  }, []);

  const startAnalysis = useCallback(async (venueConfig: VenueConfig) => {
    if (!mode) return;

    setStep('processing');
    setError(null);

    let statusIdx = 0;
    setProcessingStatus(STATUS_MESSAGES[0]);
    statusIntervalRef.current = setInterval(() => {
      statusIdx = (statusIdx + 1) % STATUS_MESSAGES.length;
      setProcessingStatus(STATUS_MESSAGES[statusIdx]);
    }, 2000);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch('/api/layout-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          venueConfig,
          guestCount,
          eventType,
          lockedFixtureIds,
        }),
        signal: abort.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data);
      setStep('results');
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStep('mode-select');
      } else {
        setError(err instanceof Error ? err.message : 'Analysis failed');
        setStep('error');
      }
    } finally {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      abortRef.current = null;
    }
  }, [mode, guestCount, eventType, lockedFixtureIds]);

  const cancelProcessing = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setMode(null);
    setGuestCount(null);
    setEventType(null);
    setLockedFixtureIds([]);
    setResult(null);
    setError(null);
    setProcessingStatus('');
    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    abortRef.current?.abort();
  }, []);

  return {
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
  };
}
