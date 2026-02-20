'use client';

import { useState, useCallback } from 'react';
import { parseCSV, mapRowToGuest, type CSVFieldMapping, type CSVParseResult } from '@/lib/csv-parser';
import { detectDuplicates, type DuplicateMatch } from '@/lib/duplicate-detector';
import { useSeatingStore } from '@/stores/useSeatingStore';
import type { Guest } from '@/types/guest';

type ImportStep = 'idle' | 'mapping' | 'preview' | 'duplicates' | 'done';

export function useCSVImport() {
  const [step, setStep] = useState<ImportStep>('idle');
  const [csvResult, setCsvResult] = useState<CSVParseResult | null>(null);
  const [mapping, setMapping] = useState<CSVFieldMapping>({
    name: null,
    email: null,
    phone: null,
    rsvpStatus: null,
    dietary: null,
    notes: null,
  });
  const [parsedGuests, setParsedGuests] = useState<Guest[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const existingGuests = useSeatingStore((s) => s.guests);
  const importGuests = useSeatingStore((s) => s.importGuests);

  const handleFile = useCallback(async (file: File) => {
    try {
      setError(null);
      const result = await parseCSV(file);
      setCsvResult(result);

      // Auto-map common column names
      const autoMapping: CSVFieldMapping = {
        name: null,
        email: null,
        phone: null,
        rsvpStatus: null,
        dietary: null,
        notes: null,
      };
      const namePatterns = ['name', 'full name', 'guest name', 'first name'];
      const emailPatterns = ['email', 'e-mail', 'email address'];
      const phonePatterns = ['phone', 'telephone', 'mobile', 'cell'];
      const rsvpPatterns = ['rsvp', 'status', 'response', 'attending'];
      const dietaryPatterns = ['diet', 'dietary', 'food', 'allergies', 'restrictions'];
      const notePatterns = ['notes', 'comments', 'remarks'];

      for (const header of result.headers) {
        const lower = header.toLowerCase();
        if (!autoMapping.name && namePatterns.some((p) => lower.includes(p))) autoMapping.name = header;
        if (!autoMapping.email && emailPatterns.some((p) => lower.includes(p))) autoMapping.email = header;
        if (!autoMapping.phone && phonePatterns.some((p) => lower.includes(p))) autoMapping.phone = header;
        if (!autoMapping.rsvpStatus && rsvpPatterns.some((p) => lower.includes(p))) autoMapping.rsvpStatus = header;
        if (!autoMapping.dietary && dietaryPatterns.some((p) => lower.includes(p))) autoMapping.dietary = header;
        if (!autoMapping.notes && notePatterns.some((p) => lower.includes(p))) autoMapping.notes = header;
      }

      setMapping(autoMapping);
      setStep('mapping');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
    }
  }, []);

  const confirmMapping = useCallback(() => {
    if (!csvResult) return;
    const guests = csvResult.rows
      .map((row) => mapRowToGuest(row, mapping))
      .filter((g) => g.name.trim() !== '');
    setParsedGuests(guests);
    setStep('preview');
  }, [csvResult, mapping]);

  const confirmPreview = useCallback(() => {
    const dupes = detectDuplicates(existingGuests, parsedGuests);
    if (dupes.length > 0) {
      setDuplicates(dupes);
      setStep('duplicates');
    } else {
      importGuests(parsedGuests);
      setStep('done');
    }
  }, [existingGuests, parsedGuests, importGuests]);

  const resolveAndImport = useCallback(
    (skipIds: Set<string>) => {
      const filtered = parsedGuests.filter((g) => !skipIds.has(g.id));
      importGuests(filtered);
      setStep('done');
    },
    [parsedGuests, importGuests]
  );

  const reset = useCallback(() => {
    setStep('idle');
    setCsvResult(null);
    setParsedGuests([]);
    setDuplicates([]);
    setError(null);
    setMapping({ name: null, email: null, phone: null, rsvpStatus: null, dietary: null, notes: null });
  }, []);

  return {
    step,
    csvResult,
    mapping,
    setMapping,
    parsedGuests,
    duplicates,
    error,
    handleFile,
    confirmMapping,
    confirmPreview,
    resolveAndImport,
    reset,
  };
}
