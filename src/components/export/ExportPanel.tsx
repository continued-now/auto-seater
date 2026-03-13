'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradeDialog } from '@/components/ui/UpgradeDialog';
import { ProBadge } from '@/components/ui/ProBadge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Checkbox } from '@/components/ui/Checkbox';
import { QRDisplayDialog } from '@/components/export/QRDisplayDialog';
import { Download, FileText, CreditCard, List, Loader2, QrCode, Share2, Copy, Mail, ClipboardList } from 'lucide-react';
import { exportFloorPlanPDF } from '@/lib/export/pdf-floor-plan';
import { exportPlaceCardsPDF } from '@/lib/export/pdf-place-cards';
import { exportEscortCardsPDF } from '@/lib/export/pdf-escort-cards';
import { exportTableServicePDF } from '@/lib/export/pdf-table-service';
import type { PaperSize, Orientation, ExportType } from '@/types/export';
import type Konva from 'konva';

interface ExportPanelProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function ExportPanel({ stageRef }: ExportPanelProps) {
  const guests = useSeatingStore((s) => s.guests);
  const venue = useSeatingStore((s) => s.venue);
  const { canAccess, requirePro, upgradeOpen, setUpgradeOpen, upgradeFeature } = useFeatureGate();

  const [showDropdown, setShowDropdown] = useState(false);
  const [dialogType, setDialogType] = useState<ExportType | null>(null);
  const [exporting, setExporting] = useState(false);

  // Floor plan options
  const [fpPaper, setFpPaper] = useState<PaperSize>('letter');
  const [fpOrientation, setFpOrientation] = useState<Orientation>('landscape');
  const [fpTitle, setFpTitle] = useState('Seating Plan');
  const [fpShowStats, setFpShowStats] = useState(true);

  // Place card options
  const [pcPaper, setPcPaper] = useState<PaperSize>('letter');
  const [pcShowDietary, setPcShowDietary] = useState(true);
  const [pcShowTable, setPcShowTable] = useState(true);

  // Escort card options
  const [ecPaper, setEcPaper] = useState<PaperSize>('letter');
  const [ecColumns, setEcColumns] = useState<2 | 3>(2);

  // Table service options
  const [tsPaper, setTsPaper] = useState<PaperSize>('letter');
  const [tsTitle, setTsTitle] = useState('Table Service Sheet');

  const openDialog = useCallback((type: ExportType) => {
    setDialogType(type);
    setShowDropdown(false);
  }, []);

  const handleExportFloorPlan = useCallback(async () => {
    if (!stageRef.current) return;
    setExporting(true);
    try {
      const showWatermark = !canAccess('watermark-free');
      await exportFloorPlanPDF(stageRef.current, {
        paperSize: fpPaper,
        orientation: fpOrientation,
        title: fpTitle,
        showStats: fpShowStats,
      }, venue, guests, showWatermark);
      toast.success('Floor plan exported');
    } catch (err) {
      toast.error('Export failed');
      throw err;
    } finally {
      setExporting(false);
      setDialogType(null);
    }
  }, [stageRef, fpPaper, fpOrientation, fpTitle, fpShowStats, venue, guests, canAccess]);

  const handleExportPlaceCards = useCallback(() => {
    setExporting(true);
    try {
      exportPlaceCardsPDF(guests, venue.tables, {
        paperSize: pcPaper,
        showDietaryTags: pcShowDietary,
        showTableNumber: pcShowTable,
      });
      toast.success('Place cards exported');
    } catch (err) {
      toast.error('Export failed');
      throw err;
    } finally {
      setExporting(false);
      setDialogType(null);
    }
  }, [guests, venue.tables, pcPaper, pcShowDietary, pcShowTable]);

  const handleExportEscortCards = useCallback(() => {
    setExporting(true);
    try {
      exportEscortCardsPDF(guests, venue.tables, {
        paperSize: ecPaper,
        columns: ecColumns,
      });
      toast.success('Escort cards exported');
    } catch (err) {
      toast.error('Export failed');
      throw err;
    } finally {
      setExporting(false);
      setDialogType(null);
    }
  }, [guests, venue.tables, ecPaper, ecColumns]);

  const handleExportTableService = useCallback(() => {
    setExporting(true);
    try {
      exportTableServicePDF(guests, venue, {
        paperSize: tsPaper,
        title: tsTitle,
      });
      toast.success('Table service sheet exported');
    } catch (err) {
      toast.error('Export failed');
      throw err;
    } finally {
      setExporting(false);
      setDialogType(null);
    }
  }, [guests, venue, tsPaper, tsTitle]);

  const seatedCount = guests.filter((g) => g.tableId).length;

  const assignmentText = useMemo(() => {
    const seatedGuests = guests.filter((g) => g.tableId);
    const byTable = new Map<string, string[]>();
    for (const g of seatedGuests) {
      const label = venue.tables.find((t) => t.id === g.tableId)?.label ?? g.tableId!;
      if (!byTable.has(label)) byTable.set(label, []);
      byTable.get(label)!.push(g.name);
    }
    return [...byTable.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([table, names]) => `${table}: ${names.sort().join(', ')}`)
      .join('\n');
  }, [guests, venue.tables]);

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={seatedCount === 0}
        >
          <Download size={14} />
          <span className="ml-1">Export</span>
        </Button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-[200px] z-50">
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                onClick={() => openDialog('floor-plan')}
              >
                <FileText size={14} className="text-slate-500" />
                <div className="flex-1">
                  <div className="font-medium text-slate-700">Floor Plan PDF</div>
                  <div className="text-xs text-slate-400">
                    {canAccess('watermark-free') ? 'Venue layout with tables' : 'Includes watermark'}
                  </div>
                </div>
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  if (!requirePro('place-cards', 'Place card exports')) {
                    setShowDropdown(false);
                    return;
                  }
                  openDialog('place-cards');
                }}
              >
                <CreditCard size={14} className="text-slate-500" />
                <div className="flex-1">
                  <div className="font-medium text-slate-700 flex items-center gap-1.5">
                    Place Cards
                    {!canAccess('place-cards') && <ProBadge />}
                  </div>
                  <div className="text-xs text-slate-400">3.5 x 2 in, 10 per page</div>
                </div>
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  if (!requirePro('escort-cards', 'Escort card exports')) {
                    setShowDropdown(false);
                    return;
                  }
                  openDialog('escort-cards');
                }}
              >
                <List size={14} className="text-slate-500" />
                <div className="flex-1">
                  <div className="font-medium text-slate-700 flex items-center gap-1.5">
                    Escort Card List
                    {!canAccess('escort-cards') && <ProBadge />}
                  </div>
                  <div className="text-xs text-slate-400">Alphabetical guest-to-table</div>
                </div>
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                onClick={() => openDialog('table-service')}
              >
                <ClipboardList size={14} className="text-slate-500" />
                <div className="flex-1">
                  <div className="font-medium text-slate-700">Table Service Sheet</div>
                  <div className="text-xs text-slate-400">Dietary needs & notes for staff</div>
                </div>
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                onClick={() => openDialog('qr-display')}
              >
                <QrCode size={14} className="text-slate-500" />
                <div>
                  <div className="font-medium text-slate-700">Display QR Code</div>
                  <div className="text-xs text-slate-400">Scannable floor plan link</div>
                </div>
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                onClick={() => openDialog('assignments')}
              >
                <Share2 size={14} className="text-slate-500" />
                <div>
                  <div className="font-medium text-slate-700">Share Assignments</div>
                  <div className="text-xs text-slate-400">Copy or email table list</div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Floor Plan Dialog */}
      <Dialog open={dialogType === 'floor-plan'} onOpenChange={() => setDialogType(null)}>
        <DialogContent title="Export Floor Plan PDF">
          <div className="space-y-4">
            {!canAccess('watermark-free') && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Free exports include an &ldquo;AutoSeater&rdquo; watermark.{' '}
                <button className="underline font-medium cursor-pointer" onClick={() => setUpgradeOpen(true)}>Upgrade to Pro</button> for watermark-free exports.
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Title</label>
              <input
                type="text"
                value={fpTitle}
                onChange={(e) => setFpTitle(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-2 focus:outline-blue-500"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Paper Size</label>
                <select
                  value={fpPaper}
                  onChange={(e) => setFpPaper(e.target.value as PaperSize)}
                  className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm cursor-pointer"
                >
                  <option value="letter">Letter</option>
                  <option value="a4">A4</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Orientation</label>
                <select
                  value={fpOrientation}
                  onChange={(e) => setFpOrientation(e.target.value as Orientation)}
                  className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm cursor-pointer"
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={fpShowStats}
                onCheckedChange={(v) => setFpShowStats(v === true)}
              />
              <span className="text-sm text-slate-700">Show guest & table counts</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDialogType(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleExportFloorPlan} disabled={exporting}>
                {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</> : 'Export PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Place Cards Dialog */}
      <Dialog open={dialogType === 'place-cards'} onOpenChange={() => setDialogType(null)}>
        <DialogContent title="Export Place Cards">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Generates 3.5 x 2 in cards, 10 per page. Only seated guests are included.
            </p>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Paper Size</label>
              <select
                value={pcPaper}
                onChange={(e) => setPcPaper(e.target.value as PaperSize)}
                className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm cursor-pointer"
              >
                <option value="letter">Letter</option>
                <option value="a4">A4</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={pcShowTable}
                onCheckedChange={(v) => setPcShowTable(v === true)}
              />
              <span className="text-sm text-slate-700">Show table name</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={pcShowDietary}
                onCheckedChange={(v) => setPcShowDietary(v === true)}
              />
              <span className="text-sm text-slate-700">Show dietary tags</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDialogType(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleExportPlaceCards} disabled={exporting || seatedCount === 0}>
                {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</> : `Export ${seatedCount} Cards`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Escort Cards Dialog */}
      <Dialog open={dialogType === 'escort-cards'} onOpenChange={() => setDialogType(null)}>
        <DialogContent title="Export Escort Card List">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Alphabetical list of guests with table assignments, sorted by last name.
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Paper Size</label>
                <select
                  value={ecPaper}
                  onChange={(e) => setEcPaper(e.target.value as PaperSize)}
                  className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm cursor-pointer"
                >
                  <option value="letter">Letter</option>
                  <option value="a4">A4</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Columns</label>
                <select
                  value={ecColumns}
                  onChange={(e) => setEcColumns(Number(e.target.value) as 2 | 3)}
                  className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm cursor-pointer"
                >
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDialogType(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleExportEscortCards} disabled={exporting || seatedCount === 0}>
                {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</> : 'Export List'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Service Dialog */}
      <Dialog open={dialogType === 'table-service'} onOpenChange={() => setDialogType(null)}>
        <DialogContent title="Export Table Service Sheet">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Per-table guest lists with dietary needs and notes for kitchen/service staff.
            </p>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Title</label>
              <input
                type="text"
                value={tsTitle}
                onChange={(e) => setTsTitle(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-2 focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Paper Size</label>
              <select
                value={tsPaper}
                onChange={(e) => setTsPaper(e.target.value as PaperSize)}
                className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm cursor-pointer"
              >
                <option value="letter">Letter</option>
                <option value="a4">A4</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDialogType(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleExportTableService} disabled={exporting || seatedCount === 0}>
                {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</> : 'Export PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Display Dialog */}
      <QRDisplayDialog
        open={dialogType === 'qr-display'}
        onOpenChange={(open) => { if (!open) setDialogType(null); }}
      />

      {/* Share Assignments Dialog */}
      <Dialog open={dialogType === 'assignments'} onOpenChange={() => setDialogType(null)}>
        <DialogContent title="Share Table Assignments">
          <div className="space-y-4">
            <textarea
              readOnly
              value={assignmentText}
              rows={8}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono text-slate-700 resize-none bg-slate-50"
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(assignmentText);
                  toast.success('Copied to clipboard');
                }}
              >
                <Copy size={14} className="mr-1" /> Copy
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const subject = encodeURIComponent('Your table assignment');
                  const body = encodeURIComponent(assignmentText);
                  window.open(`mailto:?subject=${subject}&body=${body}`);
                }}
              >
                <Mail size={14} className="mr-1" /> Open in Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
    </>
  );
}
