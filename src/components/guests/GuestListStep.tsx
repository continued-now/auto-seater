'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import Fuse from 'fuse.js';
import {
  Search,
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  ArrowUpDown,
  Home,
  CircleDot,
  AlertTriangle,
  Download,
  Type,
  ClipboardPaste,
  Copy,
} from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useCSVImport } from '@/hooks/useCSVImport';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradeDialog } from '@/components/ui/UpgradeDialog';
import { FREE_GUEST_LIMIT } from '@/lib/purchase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { rsvpStatusColors, dietaryTagColors, socialCircleColors } from '@/lib/colour-palette';
import { downloadCSVTemplate } from '@/lib/csv-template';
import type {
  Guest,
  RSVPStatus,
  DietaryTag,
  AccessibilityTag,
  GuestSortField,
  SortDirection,
} from '@/types/guest';

// ─── Constants ───────────────────────────────────────────────────────────────

const RSVP_OPTIONS: { value: RSVPStatus; label: string }[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'declined', label: 'Declined' },
  { value: 'pending', label: 'Pending' },
  { value: 'tentative', label: 'Tentative' },
];

const DIETARY_OPTIONS: DietaryTag[] = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'nut-allergy',
  'dairy-free',
  'halal',
  'kosher',
  'shellfish-allergy',
  'other',
];

const ACCESSIBILITY_OPTIONS: AccessibilityTag[] = [
  'wheelchair',
  'hearing-aid',
  'visual-aid',
  'mobility-limited',
  'other',
];

const GUEST_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'rsvpStatus', label: 'RSVP Status' },
  { value: 'dietary', label: 'Dietary' },
  { value: 'notes', label: 'Notes' },
] as const;

type FilterStatus = 'all' | RSVPStatus;
type SeatedFilter = 'all' | 'seated' | 'unseated';

// ─── Helper: Capitalise first letter ─────────────────────────────────────────

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTag(s: string) {
  return s
    .split('-')
    .map((w) => capitalise(w))
    .join(' ');
}

// ─── RSVP Icon ───────────────────────────────────────────────────────────────

function RsvpIcon({ status }: { status: RSVPStatus }) {
  const size = 14;
  switch (status) {
    case 'confirmed':
      return <CheckCircle2 size={size} className="text-green-600" />;
    case 'declined':
      return <XCircle size={size} className="text-red-600" />;
    case 'pending':
      return <Clock size={size} className="text-amber-600" />;
    case 'tentative':
      return <HelpCircle size={size} className="text-blue-600" />;
  }
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────

function GuestSummaryBar({ guests }: { guests: Guest[] }) {
  const userTier = useSeatingStore((s) => s.userTier);
  const total = guests.length;
  const confirmed = guests.filter((g) => g.rsvpStatus === 'confirmed').length;
  const declined = guests.filter((g) => g.rsvpStatus === 'declined').length;
  const pending = guests.filter((g) => g.rsvpStatus === 'pending').length;
  const tentative = guests.filter((g) => g.rsvpStatus === 'tentative').length;
  const seated = guests.filter((g) => g.tableId !== null).length;

  const items = [
    { label: 'Total', value: total, color: '#475569', bg: '#f1f5f9' },
    { label: 'Confirmed', value: confirmed, color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Pending', value: pending, color: '#D97706', bg: '#FEF3C7' },
    { label: 'Tentative', value: tentative, color: '#2563EB', bg: '#DBEAFE' },
    { label: 'Declined', value: declined, color: '#DC2626', bg: '#FEE2E2' },
    { label: 'Seated', value: seated, color: '#0891B2', bg: '#CFFAFE' },
  ];

  const limitPct = userTier === 'free' ? Math.min(100, (total / FREE_GUEST_LIMIT) * 100) : 0;
  const isNearLimit = userTier === 'free' && total >= FREE_GUEST_LIMIT * 0.8;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: item.bg, color: item.color }}
          >
            <span>{item.label}</span>
            <span className="font-bold">{item.value}</span>
          </div>
        ))}
      </div>
      {userTier === 'free' && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-amber-500' : 'bg-slate-300'}`}
              style={{ width: `${limitPct}%` }}
            />
          </div>
          <span className={`text-xs font-medium tabular-nums ${isNearLimit ? 'text-amber-600' : 'text-slate-400'}`}>
            {total}/{FREE_GUEST_LIMIT} guests
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Actions Bar ────────────────────────────────────────────────────────

function BulkActionsBar({
  count,
  onDelete,
  onChangeRSVP,
  onClear,
}: {
  count: number;
  onDelete: () => void;
  onChangeRSVP: (status: RSVPStatus) => void;
  onClear: () => void;
}) {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-red-700 px-3 sm:px-4 py-2.5 text-white shadow-lg">
        <span className="text-sm font-medium">Delete {count} guest{count !== 1 ? 's' : ''}?</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-red-600 hover:text-white"
          onClick={() => { onDelete(); setConfirmDelete(false); }}
        >
          <Trash2 size={14} />
          Delete
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-200 hover:bg-red-600 hover:text-white"
          onClick={() => setConfirmDelete(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-slate-800 px-3 sm:px-4 py-2.5 text-white shadow-lg overflow-x-auto">
      <span className="text-sm font-medium shrink-0">{count} selected</span>
      <div className="h-4 w-px bg-slate-600 shrink-0" />
      <div className="relative shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-slate-700 hover:text-white"
          onClick={() => setRsvpOpen(!rsvpOpen)}
        >
          <span className="hidden sm:inline">Change </span>RSVP
          <ChevronDown size={14} />
        </Button>
        {rsvpOpen && (
          <div className="absolute bottom-full left-0 mb-1 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-10">
            {RSVP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className="block w-full px-4 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                onClick={() => {
                  onChangeRSVP(opt.value);
                  setRsvpOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-400 hover:bg-red-900/30 hover:text-red-300"
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 size={14} />
        Delete
      </Button>
      <div className="flex-1" />
      <button className="text-slate-400 hover:text-white transition-colors cursor-pointer" onClick={onClear}>
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Smart Name Detection ─────────────────────────────────────────────────────

function detectPairNames(line: string): { type: 'pair' | 'family' | 'single'; names: string[] } {
  // "The Smith Family" or "Smith Family"
  const familyMatch = line.match(/^(?:the\s+)?(\w+)\s+family$/i);
  if (familyMatch) {
    return { type: 'family', names: [line] };
  }

  // "Mr. & Mrs. Smith" / "Mr. and Mrs. Smith"
  const titlePairMatch = line.match(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s*[&+]\s*(Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+(\w+)$/i);
  if (titlePairMatch) {
    return {
      type: 'pair',
      names: [`${titlePairMatch[1]} ${titlePairMatch[3]}`, `${titlePairMatch[2]} ${titlePairMatch[3]}`],
    };
  }

  // "John & Jane Smith" or "John + Jane Smith" — pair with shared last name
  const sharedLastMatch = line.match(/^(.+?)\s*[&+]\s*(.+?)\s+(\w+)$/);
  if (sharedLastMatch) {
    const firstName1 = sharedLastMatch[1].trim();
    const firstName2 = sharedLastMatch[2].trim();
    const lastName = sharedLastMatch[3].trim();
    // Only treat as shared-last-name pair if first parts look like first names (no spaces)
    if (!firstName1.includes(' ') && !firstName2.includes(' ')) {
      return {
        type: 'pair',
        names: [`${firstName1} ${lastName}`, `${firstName2} ${lastName}`],
      };
    }
  }

  // "John Smith and Jane Doe" or "John Smith & Jane Doe" — pair without shared last name
  const fullPairMatch = line.match(/^(.+?)\s+(?:and|&)\s+(.+)$/i);
  if (fullPairMatch) {
    const name1 = fullPairMatch[1].trim();
    const name2 = fullPairMatch[2].trim();
    // Both parts should have at least 2 characters to avoid false positives
    if (name1.length >= 2 && name2.length >= 2) {
      return { type: 'pair', names: [name1, name2] };
    }
  }

  return { type: 'single', names: [line] };
}

// ─── Tab types ───────────────────────────────────────────────────────────────

type AddGuestsTab = 'quick-add' | 'paste-csv' | 'upload-file';

const ADD_GUESTS_TABS: { value: AddGuestsTab; label: string; icon: typeof Plus }[] = [
  { value: 'quick-add', label: 'Quick Add', icon: Type },
  { value: 'paste-csv', label: 'Paste CSV', icon: ClipboardPaste },
  { value: 'upload-file', label: 'Upload File', icon: Upload },
];

// ─── Unified Add Guests Dialog ──────────────────────────────────────────────

function AddGuestsDialog({
  open,
  onOpenChange,
  onGuestLimitHit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGuestLimitHit: () => void;
}) {
  const addGuest = useSeatingStore((s) => s.addGuest);
  const guests = useSeatingStore((s) => s.guests);
  const userTier = useSeatingStore((s) => s.userTier);
  const csv = useCSVImport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<AddGuestsTab>('quick-add');
  const [quickText, setQuickText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [quickAddDone, setQuickAddDone] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const quickNames = quickText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const suggestions = useMemo(() => {
    return quickNames
      .map((line) => {
        const result = detectPairNames(line);
        if (result.type === 'single' || dismissedSuggestions.has(line)) return null;
        return { line, ...result };
      })
      .filter(Boolean) as { line: string; type: 'pair' | 'family'; names: string[] }[];
  }, [quickNames, dismissedSuggestions]);

  const handleSplitSuggestion = useCallback(
    (line: string, names: string[]) => {
      const lines = quickText.split('\n');
      const idx = lines.findIndex((l) => l.trim() === line);
      if (idx === -1) return;
      lines.splice(idx, 1, ...names);
      setQuickText(lines.join('\n'));
      // Clean up dismissal for this line since it no longer exists
      setDismissedSuggestions((prev) => {
        const next = new Set(prev);
        next.delete(line);
        return next;
      });
    },
    [quickText],
  );

  const handleDismissSuggestion = useCallback((line: string) => {
    setDismissedSuggestions((prev) => new Set(prev).add(line));
  }, []);

  const handleClose = () => {
    csv.reset();
    setQuickText('');
    setPasteText('');
    setTab('quick-add');
    setQuickAddDone(null);
    setDismissedSuggestions(new Set());
    onOpenChange(false);
  };

  const handleBack = () => {
    csv.reset();
    setPasteText('');
    setQuickAddDone(null);
  };

  const handleQuickAdd = () => {
    if (quickNames.length === 0) return;
    // Check guest limit for free tier
    if (userTier === 'free') {
      const remaining = FREE_GUEST_LIMIT - guests.length;
      if (remaining <= 0) {
        onGuestLimitHit();
        return;
      }
      if (quickNames.length > remaining) {
        toast.error(`Free plan allows ${FREE_GUEST_LIMIT} guests. You can add ${remaining} more.`);
        return;
      }
    }
    for (const name of quickNames) {
      addGuest({
        name,
        email: '',
        phone: '',
        rsvpStatus: 'pending',
        dietaryTags: [],
        accessibilityTags: [],
        notes: '',
      });
    }
    const count = quickNames.length;
    setQuickText('');
    setQuickAddDone(count);
  };

  const handlePasteCSV = () => {
    if (!pasteText.trim()) return;
    csv.handleText(pasteText.trim());
  };

  // Drag-and-drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setTab('upload-file');
      csv.handleFile(file);
    }
  };

  const isIdle = csv.step === 'idle' && quickAddDone === null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        title="Add Guests"
        description="Add guests by name, paste CSV data, or upload a file."
        className="max-w-2xl"
      >
        <div
          className="relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {dragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/80">
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet size={32} className="text-blue-600" />
                <p className="text-sm font-medium text-blue-700">Drop CSV file here</p>
              </div>
            </div>
          )}

          {/* Tabs — only visible in idle state */}
          {isIdle && (
            <div className="flex border-b border-slate-200 mb-4">
              {ADD_GUESTS_TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.value;
                return (
                  <button
                    key={t.value}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                      active
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => setTab(t.value)}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Add tab */}
          {isIdle && tab === 'quick-add' && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <textarea
                  className="h-40 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600 focus:border-transparent transition-colors resize-none font-mono"
                  placeholder={"Enter guest names, one per line:\n\nJane Smith\nJohn Doe\nAlice Johnson"}
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                />
              </div>
              {/* Smart name suggestions */}
              {suggestions.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-[#FEF3C7] px-3 py-2 space-y-1.5">
                  {suggestions.map((s) => (
                    <div key={s.line} className="flex items-center justify-between gap-2 text-xs text-amber-900">
                      <span className="flex-1 min-w-0 truncate">
                        {s.type === 'pair' ? (
                          <>
                            Detected couple: &lsquo;{s.line}&rsquo; &rarr; {s.names[0]} + {s.names[1]}
                          </>
                        ) : (
                          <>
                            Detected family: &lsquo;{s.line}&rsquo; &mdash; consider creating a household
                          </>
                        )}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {s.type === 'pair' && (
                          <button
                            type="button"
                            className="rounded px-1.5 py-0.5 font-medium text-amber-800 bg-amber-200 hover:bg-amber-300 transition-colors cursor-pointer"
                            onClick={() => handleSplitSuggestion(s.line, s.names)}
                          >
                            Split
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 font-medium text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
                          onClick={() => handleDismissSuggestion(s.line)}
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {quickNames.length > 0
                    ? `${quickNames.length} guest${quickNames.length !== 1 ? 's' : ''} to add`
                    : 'Type or paste names above'}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleQuickAdd} disabled={quickNames.length === 0}>
                    <Plus size={14} />
                    Add {quickNames.length > 0 ? `${quickNames.length} ` : ''}Guest{quickNames.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Paste CSV tab */}
          {isIdle && tab === 'paste-csv' && (
            <div className="flex flex-col gap-3">
              <textarea
                className="h-40 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600 focus:border-transparent transition-colors resize-none font-mono"
                placeholder={"Paste CSV content with headers:\n\nName,Email,RSVP\nJane Smith,jane@example.com,Confirmed\nJohn Doe,john@example.com,Pending"}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              {csv.error && (
                <p className="text-sm text-red-600">{csv.error}</p>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handlePasteCSV} disabled={!pasteText.trim()}>
                  Parse CSV
                </Button>
              </div>
            </div>
          )}

          {/* Upload File tab */}
          {isIdle && tab === 'upload-file' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-blue-50 p-4">
                <FileSpreadsheet size={32} className="text-blue-600" />
              </div>
              <p className="text-sm text-slate-500 text-center">
                Upload a CSV file with guest information. Column headers will be auto-detected.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) csv.handleFile(file);
                }}
              />
              <div className="flex items-center gap-3">
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} />
                  Choose CSV File
                </Button>
                <Button variant="secondary" onClick={downloadCSVTemplate}>
                  <Download size={14} />
                  Download Template
                </Button>
              </div>
              <p className="text-xs text-slate-400">or drag and drop a .csv file anywhere on this dialog</p>
              {csv.error && (
                <p className="text-sm text-red-600">{csv.error}</p>
              )}
            </div>
          )}

          {/* Quick Add done state */}
          {quickAddDone !== null && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-green-50 p-4">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Added {quickAddDone} guest{quickAddDone !== 1 ? 's' : ''}!
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleBack}>
                  Add More
                </Button>
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          )}

          {/* CSV Flow: Mapping */}
          {csv.step === 'mapping' && csv.csvResult && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600">
                Found <span className="font-semibold">{csv.csvResult.rowCount}</span> rows with{' '}
                <span className="font-semibold">{csv.csvResult.headers.length}</span> columns. Map CSV columns to guest fields:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {GUEST_FIELDS.map((field) => (
                  <Select
                    key={field.value}
                    label={field.label}
                    options={[
                      { value: '', label: '-- Skip --' },
                      ...csv.csvResult!.headers.map((h) => ({ value: h, label: h })),
                    ]}
                    value={csv.mapping[field.value] ?? ''}
                    onChange={(e) =>
                      csv.setMapping({ ...csv.mapping, [field.value]: e.target.value || null })
                    }
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="secondary" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={csv.confirmMapping} disabled={!csv.mapping.name}>
                  Preview
                </Button>
              </div>
            </div>
          )}

          {/* CSV Flow: Preview */}
          {csv.step === 'preview' && (
            <CSVPreviewTable
              parsedGuests={csv.parsedGuests}
              onEdit={csv.editParsedGuest}
              onRemove={csv.removeParsedGuest}
              onConfirm={csv.confirmPreview}
              onBack={handleBack}
            />
          )}

          {/* CSV Flow: Duplicates */}
          {csv.step === 'duplicates' && (
            <DuplicateResolver
              duplicates={csv.duplicates}
              onResolve={csv.resolveAndImport}
              onCancel={handleClose}
            />
          )}

          {/* CSV Flow: Done */}
          {csv.step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-green-50 p-4">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">Import complete!</p>
              <Button onClick={handleClose}>Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── CSV Preview Table ───────────────────────────────────────────────────────

function CSVPreviewTable({
  parsedGuests,
  onEdit,
  onRemove,
  onConfirm,
  onBack,
}: {
  parsedGuests: Guest[];
  onEdit: (index: number, updates: Partial<Guest>) => void;
  onRemove: (index: number) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (rowIndex: number, col: string, currentValue: string) => {
    setEditingCell({ row: rowIndex, col });
    setEditValue(currentValue);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { row, col } = editingCell;
    if (col === 'name' || col === 'email' || col === 'phone' || col === 'notes') {
      onEdit(row, { [col]: editValue });
    } else if (col === 'rsvpStatus') {
      const valid: RSVPStatus[] = ['confirmed', 'declined', 'pending', 'tentative'];
      const lower = editValue.toLowerCase().trim();
      if (valid.includes(lower as RSVPStatus)) {
        onEdit(row, { rsvpStatus: lower as RSVPStatus });
      }
    } else if (col === 'dietary') {
      // Parse comma-separated dietary tags
      const tags = editValue
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => DIETARY_OPTIONS.includes(t as DietaryTag)) as DietaryTag[];
      onEdit(row, { dietaryTags: tags });
    }
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const columns: { key: string; label: string; getValue: (g: Guest) => string }[] = [
    { key: 'name', label: 'Name', getValue: (g) => g.name },
    { key: 'email', label: 'Email', getValue: (g) => g.email },
    { key: 'phone', label: 'Phone', getValue: (g) => g.phone },
    { key: 'rsvpStatus', label: 'RSVP', getValue: (g) => capitalise(g.rsvpStatus) },
    { key: 'dietary', label: 'Dietary', getValue: (g) => g.dietaryTags.map(formatTag).join(', ') },
    { key: 'notes', label: 'Notes', getValue: (g) => g.notes },
  ];

  const validCount = parsedGuests.filter((g) => g.name.trim() !== '').length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-600">
        Review and edit your guests before importing. Click any cell to edit.
      </p>
      <div className="overflow-auto max-h-80 rounded-lg border border-slate-200">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-2 py-2 text-left font-medium text-slate-500 w-8">#</th>
              {columns.map((col) => (
                <th key={col.key} className="px-2 py-2 text-left font-medium text-slate-500 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {parsedGuests.map((guest, rowIndex) => {
              const isMissingName = guest.name.trim() === '';
              return (
                <tr
                  key={guest.id}
                  className={`border-b border-slate-100 ${
                    isMissingName
                      ? 'bg-red-50'
                      : rowIndex % 2 === 0
                        ? 'bg-white'
                        : 'bg-slate-50/50'
                  }`}
                >
                  <td className="px-2 py-1.5 text-slate-400 tabular-nums">{rowIndex + 1}</td>
                  {columns.map((col) => {
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === col.key;
                    const value = col.getValue(guest);

                    if (isEditing) {
                      return (
                        <td key={col.key} className="px-1 py-0.5">
                          <input
                            autoFocus
                            className="w-full px-1.5 py-1 text-xs border border-blue-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-400"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        className={`px-2 py-1.5 cursor-pointer hover:bg-blue-50/50 transition-colors ${
                          col.key === 'name' && isMissingName ? 'text-red-400 italic' : 'text-slate-700'
                        }`}
                        onClick={() => startEdit(rowIndex, col.key, col.key === 'dietary' ? guest.dietaryTags.join(', ') : value)}
                        title="Click to edit"
                      >
                        {value || <span className="text-slate-300">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-1 py-1.5">
                    <button
                      onClick={() => onRemove(rowIndex)}
                      className="p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remove guest"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{validCount}</span> guest{validCount !== 1 ? 's' : ''} will be imported
        {validCount !== parsedGuests.length && (
          <span className="text-red-500 ml-1">
            ({parsedGuests.length - validCount} with missing names will be skipped)
          </span>
        )}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onConfirm} disabled={validCount === 0}>
          Import {validCount} Guest{validCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}

// ─── Duplicate Resolver ──────────────────────────────────────────────────────

function DuplicateResolver({
  duplicates,
  onResolve,
  onCancel,
}: {
  duplicates: { existing: Guest; incoming: Guest; score: number }[];
  onResolve: (skipIds: Set<string>) => void;
  onCancel: () => void;
}) {
  const [skipIds, setSkipIds] = useState<Set<string>>(new Set());

  const toggleSkip = (id: string) => {
    setSkipIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          Found <span className="font-semibold">{duplicates.length}</span> potential duplicates. Uncheck rows to skip them.
        </p>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
        {duplicates.map((d) => (
          <div
            key={d.incoming.id}
            className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0"
          >
            <Checkbox
              checked={!skipIds.has(d.incoming.id)}
              onCheckedChange={() => toggleSkip(d.incoming.id)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{d.incoming.name}</p>
              <p className="text-xs text-slate-500 truncate">
                matches &ldquo;{d.existing.name}&rdquo; ({Math.round(d.score * 100)}% similar)
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onResolve(skipIds)}>
          Import {duplicates.length - skipIds.size} Guests
        </Button>
      </div>
    </div>
  );
}

// ─── Guest Detail Panel ──────────────────────────────────────────────────────

function GuestDetailPanel({
  guest,
  onClose,
}: {
  guest: Guest;
  onClose: () => void;
}) {
  const store = useSeatingStore();
  const households = useSeatingStore((s) => s.households);
  const socialCircles = useSeatingStore((s) => s.socialCircles);

  const [name, setName] = useState(guest.name);
  const [email, setEmail] = useState(guest.email);
  const [phone, setPhone] = useState(guest.phone);
  const [rsvp, setRsvp] = useState<RSVPStatus>(guest.rsvpStatus);
  const [notes, setNotes] = useState(guest.notes);

  // Household
  const [newHouseholdName, setNewHouseholdName] = useState('');
  // Social circles
  const [newCircleName, setNewCircleName] = useState('');

  const guestHousehold = households.find((h) => h.id === guest.householdId);
  const guestCircles = socialCircles.filter((c) => guest.socialCircleIds.includes(c.id));

  const handleSave = () => {
    store.updateGuest(guest.id, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      rsvpStatus: rsvp,
      notes: notes.trim(),
    });
    toast.success('Guest saved');
    onClose();
  };

  const handleAddDietaryTag = (tag: DietaryTag) => {
    if (!guest.dietaryTags.includes(tag)) {
      store.addGuestDietaryTag(guest.id, tag);
    }
  };

  const handleRemoveDietaryTag = (tag: DietaryTag) => {
    store.removeGuestDietaryTag(guest.id, tag);
  };

  const handleAddAccessibilityTag = (tag: AccessibilityTag) => {
    if (!guest.accessibilityTags.includes(tag)) {
      store.addGuestAccessibilityTag(guest.id, tag);
    }
  };

  const handleRemoveAccessibilityTag = (tag: AccessibilityTag) => {
    store.removeGuestAccessibilityTag(guest.id, tag);
  };

  const handleCreateHousehold = () => {
    if (!newHouseholdName.trim()) return;
    const id = store.createHousehold(newHouseholdName.trim(), [guest.id]);
    setNewHouseholdName('');
    void id;
  };

  const handleJoinHousehold = (householdId: string) => {
    store.addGuestToHousehold(guest.id, householdId);
  };

  const handleLeaveHousehold = () => {
    store.removeGuestFromHousehold(guest.id);
  };

  const handleCreateCircle = () => {
    if (!newCircleName.trim()) return;
    const colorIndex = socialCircles.length % socialCircleColors.length;
    const id = store.createSocialCircle(newCircleName.trim(), socialCircleColors[colorIndex]);
    store.addGuestToSocialCircle(guest.id, id);
    setNewCircleName('');
  };

  const handleJoinCircle = (circleId: string) => {
    store.addGuestToSocialCircle(guest.id, circleId);
  };

  const handleLeaveCircle = (circleId: string) => {
    store.removeGuestFromSocialCircle(guest.id, circleId);
  };

  const availableHouseholds = households.filter((h) => h.id !== guest.householdId);
  const availableCircles = socialCircles.filter((c) => !guest.socialCircleIds.includes(c.id));

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] sm:max-w-full bg-white border-l border-slate-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h3 className="text-base font-semibold text-slate-900">Guest Details</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Basic Info */}
        <section className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Select
            label="RSVP Status"
            options={RSVP_OPTIONS}
            value={rsvp}
            onChange={(e) => setRsvp(e.target.value as RSVPStatus)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-900">Notes</label>
            <textarea
              className="h-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600 focus:border-transparent transition-colors resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>
        </section>

        {/* Dietary Tags */}
        <section>
          <h4 className="text-sm font-medium text-slate-900 mb-2">Dietary Requirements</h4>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {guest.dietaryTags.map((tag) => (
              <Badge
                key={tag}
                color={dietaryTagColors[tag]}
                bgColor={dietaryTagColors[tag] + '18'}
              >
                {formatTag(tag)}
                <button
                  onClick={() => handleRemoveDietaryTag(tag)}
                  className="ml-1 hover:opacity-70 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {DIETARY_OPTIONS.filter((t) => !guest.dietaryTags.includes(t)).map((tag) => (
              <button
                key={tag}
                onClick={() => handleAddDietaryTag(tag)}
                className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                + {formatTag(tag)}
              </button>
            ))}
          </div>
        </section>

        {/* Accessibility Tags */}
        <section>
          <h4 className="text-sm font-medium text-slate-900 mb-2">Accessibility Needs</h4>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {guest.accessibilityTags.map((tag) => (
              <Badge key={tag} color="#475569" bgColor="#f1f5f9">
                {formatTag(tag)}
                <button
                  onClick={() => handleRemoveAccessibilityTag(tag)}
                  className="ml-1 hover:opacity-70 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {ACCESSIBILITY_OPTIONS.filter((t) => !guest.accessibilityTags.includes(t)).map(
              (tag) => (
                <button
                  key={tag}
                  onClick={() => handleAddAccessibilityTag(tag)}
                  className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  + {formatTag(tag)}
                </button>
              )
            )}
          </div>
        </section>

        {/* Household */}
        <section>
          <h4 className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-1.5">
            <Home size={14} />
            Household
          </h4>
          {guestHousehold ? (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-700 flex-1">{guestHousehold.name}</span>
              <span className="text-xs text-slate-500">{guestHousehold.guestIds.length} members</span>
              <button
                onClick={handleLeaveHousehold}
                className="text-xs text-red-600 hover:underline cursor-pointer"
              >
                Leave
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {availableHouseholds.length > 0 && (
                <Select
                  options={[
                    { value: '', label: 'Join existing household...' },
                    ...availableHouseholds.map((h) => ({ value: h.id, label: h.name })),
                  ]}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleJoinHousehold(e.target.value);
                  }}
                />
              )}
              <div className="flex gap-2">
                <Input
                  value={newHouseholdName}
                  onChange={(e) => setNewHouseholdName(e.target.value)}
                  placeholder="New household name"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateHousehold}
                  disabled={!newHouseholdName.trim()}
                  className="shrink-0 self-end"
                >
                  Create
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Social Circles */}
        <section>
          <h4 className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-1.5">
            <CircleDot size={14} />
            Social Circles
          </h4>
          {guestCircles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {guestCircles.map((circle) => (
                <Badge key={circle.id} color={circle.color} bgColor={circle.color + '18'}>
                  {circle.name}
                  <button
                    onClick={() => handleLeaveCircle(circle.id)}
                    className="ml-1 hover:opacity-70 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {availableCircles.length > 0 && (
            <Select
              options={[
                { value: '', label: 'Join a circle...' },
                ...availableCircles.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value=""
              onChange={(e) => {
                if (e.target.value) handleJoinCircle(e.target.value);
              }}
            />
          )}
          <div className="flex gap-2 mt-2">
            <Input
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              placeholder="New circle name"
              className="flex-1"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCreateCircle}
              disabled={!newCircleName.trim()}
              className="shrink-0 self-end"
            >
              Create
            </Button>
          </div>
        </section>

        {/* Table Assignment Info */}
        {guest.tableId && (
          <section>
            <h4 className="text-sm font-medium text-slate-900 mb-2">Table Assignment</h4>
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Assigned to table (seat {(guest.seatIndex ?? 0) + 1})
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-5 py-4 border-t border-slate-200">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ─── Sortable Column Header ──────────────────────────────────────────────────

function SortHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
}: {
  label: string;
  field: GuestSortField;
  currentField: GuestSortField;
  direction: SortDirection;
  onSort: (field: GuestSortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <button
      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer group"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ChevronUp size={12} className="text-blue-600" />
        ) : (
          <ChevronDown size={12} className="text-blue-600" />
        )
      ) : (
        <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-50" />
      )}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function GuestListStep() {
  const guests = useSeatingStore((s) => s.guests);
  const searchQuery = useSeatingStore((s) => s.searchQuery);
  const setSearchQuery = useSeatingStore((s) => s.setSearchQuery);
  const selectedGuestIds = useSeatingStore((s) => s.selectedGuestIds);
  const setSelectedGuestIds = useSeatingStore((s) => s.setSelectedGuestIds);
  const toggleGuestSelection = useSeatingStore((s) => s.toggleGuestSelection);
  const deleteGuests = useSeatingStore((s) => s.deleteGuests);
  const addPlusOne = useSeatingStore((s) => s.addPlusOne);
  const setGuestRSVP = useSeatingStore((s) => s.setGuestRSVP);
  const venue = useSeatingStore((s) => s.venue);
  const households = useSeatingStore((s) => s.households);
  const createHousehold = useSeatingStore((s) => s.createHousehold);
  const updateHousehold = useSeatingStore((s) => s.updateHousehold);
  const deleteHousehold = useSeatingStore((s) => s.deleteHousehold);

  const [sortField, setSortField] = useState<GuestSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterRSVP, setFilterRSVP] = useState<FilterStatus>('all');
  const [filterDietary, setFilterDietary] = useState<string>('all');
  const [filterSeated, setFilterSeated] = useState<SeatedFilter>('all');
  const [addGuestsDialogOpen, setAddGuestsDialogOpen] = useState(false);
  const [detailGuestId, setDetailGuestId] = useState<string | null>(null);
  const { requirePro, upgradeOpen, setUpgradeOpen, upgradeFeature } = useFeatureGate();
  const [showHouseholds, setShowHouseholds] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(null);
  const [editingHouseholdName, setEditingHouseholdName] = useState('');

  // Fuse.js search
  const fuse = useMemo(
    () =>
      new Fuse(guests, {
        keys: ['name', 'email', 'phone', 'notes'],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [guests]
  );

  // Filter and sort guests
  const filteredGuests = useMemo(() => {
    let result: Guest[];

    if (searchQuery.trim()) {
      result = fuse.search(searchQuery).map((r) => r.item);
    } else {
      result = [...guests];
    }

    // RSVP filter
    if (filterRSVP !== 'all') {
      result = result.filter((g) => g.rsvpStatus === filterRSVP);
    }

    // Dietary filter
    if (filterDietary !== 'all') {
      result = result.filter((g) => g.dietaryTags.includes(filterDietary as DietaryTag));
    }

    // Seated filter
    if (filterSeated === 'seated') {
      result = result.filter((g) => g.tableId !== null);
    } else if (filterSeated === 'unseated') {
      result = result.filter((g) => g.tableId === null);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'rsvpStatus': {
          const order: Record<RSVPStatus, number> = { confirmed: 0, tentative: 1, pending: 2, declined: 3 };
          cmp = order[a.rsvpStatus] - order[b.rsvpStatus];
          break;
        }
        case 'createdAt':
          cmp = a.createdAt - b.createdAt;
          break;
        case 'updatedAt':
          cmp = a.updatedAt - b.updatedAt;
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [guests, searchQuery, fuse, filterRSVP, filterDietary, filterSeated, sortField, sortDirection]);

  const handleSort = useCallback(
    (field: GuestSortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField]
  );

  const allSelected = filteredGuests.length > 0 && filteredGuests.every((g) => selectedGuestIds.includes(g.id));
  const someSelected = filteredGuests.some((g) => selectedGuestIds.includes(g.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(filteredGuests.map((g) => g.id));
    }
  }, [allSelected, filteredGuests, setSelectedGuestIds]);

  const handleBulkDelete = useCallback(() => {
    const count = selectedGuestIds.length;
    // Also delete plus-ones of any selected primary guests
    const plusOneIds = guests
      .filter((g) => g.plusOneOf && selectedGuestIds.includes(g.plusOneOf))
      .map((g) => g.id);
    const allIds = [...new Set([...selectedGuestIds, ...plusOneIds])];
    deleteGuests(allIds);
    toast.success(`${count} guest${count !== 1 ? 's' : ''} deleted`);
  }, [deleteGuests, selectedGuestIds, guests]);

  const handleBulkRSVP = useCallback(
    (status: RSVPStatus) => {
      const count = selectedGuestIds.length;
      setGuestRSVP(selectedGuestIds, status);
      setSelectedGuestIds([]);
      toast.success(`RSVP updated for ${count} guest${count !== 1 ? 's' : ''}`);
    },
    [setGuestRSVP, selectedGuestIds, setSelectedGuestIds]
  );

  const detailGuest = guests.find((g) => g.id === detailGuestId) ?? null;

  if (guests.length === 0 && !addGuestsDialogOpen) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Users size={28} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Start by adding your guests</h2>
          <p className="text-sm text-slate-500 mb-6">
            Add guests manually or import from a spreadsheet. Once done, move on to Venue → Seating → Check-in.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="primary" onClick={() => setAddGuestsDialogOpen(true)}>
              <UserPlus size={15} className="mr-1.5" />
              Add Guest Manually
            </Button>
            <Button variant="secondary" onClick={() => setAddGuestsDialogOpen(true)}>
              <Upload size={15} className="mr-1.5" />
              Import CSV
            </Button>
            <Button variant="ghost" onClick={downloadCSVTemplate}>
              <Download size={15} className="mr-1.5" />
              Download Template
            </Button>
          </div>
        </div>
        <AddGuestsDialog open={addGuestsDialogOpen} onOpenChange={setAddGuestsDialogOpen} onGuestLimitHit={() => requirePro('unlimited-guests', 'Unlimited guests')} />
        <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      </div>
    );
  }

  // Find table label for a guest
  const getTableLabel = useCallback(
    (guest: Guest) => {
      if (!guest.tableId) return null;
      const table = venue.tables.find((t) => t.id === guest.tableId);
      return table?.label ?? null;
    },
    [venue.tables]
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top bar */}
      <div className="px-3 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 bg-white border-b border-slate-200 space-y-3 sm:space-y-4">
        {/* Title + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Guest List</h2>
              <p className="text-sm text-slate-500">Manage your event guests</p>
            </div>
          </div>
          <Button onClick={() => setAddGuestsDialogOpen(true)}>
            <UserPlus size={14} />
            Add Guests
          </Button>
        </div>

        {/* Summary */}
        <GuestSummaryBar guests={guests} />

        {/* Search + Filters */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600 focus:border-transparent transition-colors"
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <Select
            options={[
              { value: 'all', label: 'All RSVP' },
              ...RSVP_OPTIONS,
            ]}
            value={filterRSVP}
            onChange={(e) => setFilterRSVP(e.target.value as FilterStatus)}
          />
          <Select
            options={[
              { value: 'all', label: 'All Dietary' },
              ...DIETARY_OPTIONS.map((t) => ({ value: t, label: formatTag(t) })),
            ]}
            value={filterDietary}
            onChange={(e) => setFilterDietary(e.target.value)}
          />
          <Select
            options={[
              { value: 'all', label: 'All Seats' },
              { value: 'seated', label: 'Seated' },
              { value: 'unseated', label: 'Unseated' },
            ]}
            value={filterSeated}
            onChange={(e) => setFilterSeated(e.target.value as SeatedFilter)}
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selectedGuestIds.length > 0 && (
        <div className="px-3 sm:px-6 pt-3">
          <BulkActionsBar
            count={selectedGuestIds.length}
            onDelete={handleBulkDelete}
            onChangeRSVP={handleBulkRSVP}
            onClear={() => setSelectedGuestIds([])}
          />
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-3 sm:px-6 py-4">
        {filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {guests.length === 0 ? (
              <>
                <div className="rounded-full bg-slate-100 p-4 mb-4">
                  <Users size={32} className="text-slate-400" />
                </div>
                <h3 className="text-base font-medium text-slate-700 mb-1">No guests yet</h3>
                <p className="text-sm text-slate-500 mb-4">Add guests manually or import from a CSV file.</p>
                <Button onClick={() => setAddGuestsDialogOpen(true)}>
                  <UserPlus size={14} />
                  Add Guests
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-full bg-slate-100 p-4 mb-4">
                  <Search size={32} className="text-slate-400" />
                </div>
                <h3 className="text-base font-medium text-slate-700 mb-1">No results</h3>
                <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-10 px-3 py-2.5">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <SortHeader
                      label="Name"
                      field="name"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left hidden md:table-cell">
                    <span className="text-xs font-medium text-slate-500">Email</span>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <SortHeader
                      label="RSVP"
                      field="rsvpStatus"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left hidden lg:table-cell">
                    <span className="text-xs font-medium text-slate-500">Dietary</span>
                  </th>
                  <th className="px-3 py-2.5 text-left hidden sm:table-cell">
                    <span className="text-xs font-medium text-slate-500">Table</span>
                  </th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => {
                  const isSelected = selectedGuestIds.includes(guest.id);
                  const tableLabel = getTableLabel(guest);
                  return (
                    <tr
                      key={guest.id}
                      className={`border-b border-slate-100 last:border-0 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 48px' }}
                      onClick={() => setDetailGuestId(guest.id)}
                    >
                      <td
                        className="w-10 px-3 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleGuestSelection(guest.id)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 shrink-0">
                            {guest.name
                              .split(' ')
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{guest.name}</p>
                            {guest.isPlusOne && guest.plusOneOf && (
                              <p className="text-[11px] text-slate-400 truncate">
                                Plus-one of {guests.find((g) => g.id === guest.plusOneOf)?.name ?? 'Unknown'}
                              </p>
                            )}
                            {!guest.isPlusOne && guest.phone && (
                              <p className="text-xs text-slate-500 truncate">{guest.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 group/email">
                          <span className="text-sm text-slate-600 truncate block max-w-[160px]">
                            {guest.email || '—'}
                          </span>
                          {guest.email && (
                            <button
                              className="opacity-0 group-hover/email:opacity-100 text-slate-400 hover:text-slate-700 transition-opacity cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(guest.email!);
                                toast.success('Email copied');
                              }}
                              title="Copy email"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          color={rsvpStatusColors[guest.rsvpStatus]?.text}
                          bgColor={rsvpStatusColors[guest.rsvpStatus]?.bg}
                        >
                          <RsvpIcon status={guest.rsvpStatus} />
                          <span className="ml-1">{capitalise(guest.rsvpStatus)}</span>
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {guest.dietaryTags.length > 0
                            ? guest.dietaryTags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  color={dietaryTagColors[tag]}
                                  bgColor={dietaryTagColors[tag] + '18'}
                                >
                                  {formatTag(tag)}
                                </Badge>
                              ))
                            : <span className="text-xs text-slate-400">—</span>}
                          {guest.dietaryTags.length > 2 && (
                            <Badge color="#64748B" bgColor="#f1f5f9">
                              +{guest.dietaryTags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        {tableLabel ? (
                          <Badge color="#0891B2" bgColor="#CFFAFE">
                            {tableLabel}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Unseated</span>
                        )}
                      </td>
                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          {!guest.isPlusOne && (
                            <button
                              className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              onClick={() => {
                                const newId = addPlusOne(guest.id);
                                if (newId) {
                                  toast.success(`Plus-one added for ${guest.name}`);
                                }
                              }}
                              title="Add plus-one"
                            >
                              <UserPlus size={14} />
                            </button>
                          )}
                          <button
                            className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            onClick={() => {
                              // When deleting a primary guest, also delete their plus-ones
                              const plusOneIds = guests
                                .filter((g) => g.plusOneOf === guest.id)
                                .map((g) => g.id);
                              deleteGuests([guest.id, ...plusOneIds]);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredGuests.length > 0 && (
          <p className="text-xs text-slate-400 mt-3 text-center">
            Showing {filteredGuests.length} of {guests.length} guests
          </p>
        )}
      </div>

      {/* Households Panel */}
      <div className="border-t border-slate-200 bg-white">
        <button
          onClick={() => setShowHouseholds(!showHouseholds)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Home size={14} className="text-slate-400" />
            <span>Households</span>
            {households.length > 0 && (
              <Badge color="#475569" bgColor="#f1f5f9">{households.length}</Badge>
            )}
          </div>
          {showHouseholds ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>

        {showHouseholds && (
          <div className="px-3 pb-3">
            {/* Create household */}
            <div className="flex gap-1.5 mb-2">
              <Input
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                placeholder="New household name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newHouseholdName.trim()) {
                    createHousehold(newHouseholdName.trim(), []);
                    setNewHouseholdName('');
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (newHouseholdName.trim()) {
                    createHousehold(newHouseholdName.trim(), []);
                    setNewHouseholdName('');
                  }
                }}
              >
                <Plus size={14} />
              </Button>
            </div>

            {/* Household list */}
            <div className="space-y-1">
              {households.map((household) => {
                const memberCount = guests.filter((g) => g.householdId === household.id).length;
                const isEditing = editingHouseholdId === household.id;
                return (
                  <div key={household.id} className="flex items-center gap-1.5 group">
                    {isEditing ? (
                      <Input
                        value={editingHouseholdName}
                        onChange={(e) => setEditingHouseholdName(e.target.value)}
                        onBlur={() => {
                          if (editingHouseholdName.trim()) {
                            updateHousehold(household.id, { name: editingHouseholdName.trim() });
                          }
                          setEditingHouseholdId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editingHouseholdName.trim()) {
                              updateHousehold(household.id, { name: editingHouseholdName.trim() });
                            }
                            setEditingHouseholdId(null);
                          } else if (e.key === 'Escape') {
                            setEditingHouseholdId(null);
                          }
                        }}
                        autoFocus
                        className="flex-1 h-6 text-xs"
                      />
                    ) : (
                      <button
                        className="flex-1 text-left text-xs text-slate-700 hover:text-slate-900 truncate cursor-pointer"
                        onDoubleClick={() => {
                          setEditingHouseholdId(household.id);
                          setEditingHouseholdName(household.name);
                        }}
                      >
                        {household.name}
                        {memberCount > 0 && (
                          <span className="text-slate-400 ml-1">({memberCount})</span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => deleteHousehold(household.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
              {households.length === 0 && (
                <p className="text-xs text-slate-400">No households yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      <AddGuestsDialog open={addGuestsDialogOpen} onOpenChange={setAddGuestsDialogOpen} onGuestLimitHit={() => requirePro('unlimited-guests', 'Unlimited guests')} />

      {/* Detail Panel */}
      {detailGuest && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setDetailGuestId(null)}
          />
          <GuestDetailPanel
            key={detailGuest.id}
            guest={detailGuest}
            onClose={() => setDetailGuestId(null)}
          />
        </>
      )}

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
    </div>
  );
}
