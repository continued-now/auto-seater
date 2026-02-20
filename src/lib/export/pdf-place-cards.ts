import { jsPDF } from 'jspdf';
import type { PlaceCardExportOptions } from '@/types/export';
import type { Guest } from '@/types/guest';
import type { Table } from '@/types/venue';
import { triggerDownload } from './export-utils';

// Place card dimensions: 3.5" x 2" = 88.9mm x 50.8mm
const CARD_W = 88.9;
const CARD_H = 50.8;
const COLS = 2;
const ROWS = 5;
const MARGIN_X = 19; // ~0.75" left/right margins for letter
const MARGIN_Y = 14; // ~0.55" top/bottom margins
const GAP_X = 0;
const GAP_Y = 0;

export function exportPlaceCardsPDF(
  guests: Guest[],
  tables: Table[],
  options: PlaceCardExportOptions
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: options.paperSize === 'letter' ? 'letter' : 'a4',
  });

  const tableMap = new Map<string, Table>();
  for (const t of tables) tableMap.set(t.id, t);

  // Filter to only seated guests, sorted by table then name
  const seatedGuests = guests
    .filter((g) => g.tableId)
    .sort((a, b) => {
      const tA = tableMap.get(a.tableId!)?.label ?? '';
      const tB = tableMap.get(b.tableId!)?.label ?? '';
      if (tA !== tB) return tA.localeCompare(tB);
      return a.name.localeCompare(b.name);
    });

  if (seatedGuests.length === 0) return;

  const cardsPerPage = COLS * ROWS;

  for (let i = 0; i < seatedGuests.length; i++) {
    const pageIndex = Math.floor(i / cardsPerPage);
    const posOnPage = i % cardsPerPage;
    const col = posOnPage % COLS;
    const row = Math.floor(posOnPage / COLS);

    if (posOnPage === 0 && pageIndex > 0) {
      doc.addPage();
    }

    const x = MARGIN_X + col * (CARD_W + GAP_X);
    const y = MARGIN_Y + row * (CARD_H + GAP_Y);

    drawPlaceCard(doc, seatedGuests[i], tableMap, x, y, options);
  }

  const blob = doc.output('blob');
  triggerDownload(blob, `place-cards-${Date.now()}.pdf`);
}

function drawPlaceCard(
  doc: jsPDF,
  guest: Guest,
  tableMap: Map<string, Table>,
  x: number,
  y: number,
  options: PlaceCardExportOptions
): void {
  // Crop mark corners (2mm lines)
  const markLen = 2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);

  // Top-left
  doc.line(x, y, x + markLen, y);
  doc.line(x, y, x, y + markLen);
  // Top-right
  doc.line(x + CARD_W, y, x + CARD_W - markLen, y);
  doc.line(x + CARD_W, y, x + CARD_W, y + markLen);
  // Bottom-left
  doc.line(x, y + CARD_H, x + markLen, y + CARD_H);
  doc.line(x, y + CARD_H, x, y + CARD_H - markLen);
  // Bottom-right
  doc.line(x + CARD_W, y + CARD_H, x + CARD_W - markLen, y + CARD_H);
  doc.line(x + CARD_W, y + CARD_H, x + CARD_W, y + CARD_H - markLen);

  // Guest name (centered)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(guest.name, x + CARD_W / 2, y + CARD_H * 0.4, { align: 'center' });

  // Table assignment
  if (options.showTableNumber && guest.tableId) {
    const table = tableMap.get(guest.tableId);
    if (table) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(table.label, x + CARD_W / 2, y + CARD_H * 0.55, { align: 'center' });
    }
  }

  // Dietary tags
  if (options.showDietaryTags && guest.dietaryTags.length > 0) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    const tagText = guest.dietaryTags.join(', ');
    doc.text(tagText, x + CARD_W / 2, y + CARD_H * 0.75, {
      align: 'center',
      maxWidth: CARD_W - 10,
    });
  }
}
