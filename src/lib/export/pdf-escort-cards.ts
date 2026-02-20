import { jsPDF } from 'jspdf';
import type { EscortCardExportOptions } from '@/types/export';
import type { Guest } from '@/types/guest';
import type { Table } from '@/types/venue';
import { getPageDimensions, triggerDownload, formatDate } from './export-utils';

interface EscortEntry {
  name: string;
  tableLabel: string;
}

export function exportEscortCardsPDF(
  guests: Guest[],
  tables: Table[],
  options: EscortCardExportOptions
): void {
  const page = getPageDimensions(options.paperSize, 'portrait');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: options.paperSize === 'letter' ? 'letter' : 'a4',
  });

  const tableMap = new Map<string, Table>();
  for (const t of tables) tableMap.set(t.id, t);

  // Build sorted entries (by last name)
  const entries: EscortEntry[] = guests
    .filter((g) => g.tableId)
    .map((g) => ({
      name: g.name,
      tableLabel: tableMap.get(g.tableId!)?.label ?? 'Unassigned',
    }))
    .sort((a, b) => {
      const lastA = a.name.split(' ').pop() ?? a.name;
      const lastB = b.name.split(' ').pop() ?? b.name;
      return lastA.localeCompare(lastB);
    });

  if (entries.length === 0) return;

  const margin = 15;
  const contentWidth = page.width - margin * 2;
  const colGap = 8;
  const colWidth = (contentWidth - colGap * (options.columns - 1)) / options.columns;
  const lineHeight = 5.5;
  const headerHeight = 20;
  const footerMargin = 10;
  const maxY = page.height - margin - footerMargin;

  let pageNum = 0;

  function drawHeader() {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Escort Card List', page.width / 2, margin + 6, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(formatDate(), page.width / 2, margin + 12, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // Layout entries into columns
  const entriesPerCol = Math.floor((maxY - margin - headerHeight) / lineHeight);
  const entriesPerPage = entriesPerCol * options.columns;

  for (let i = 0; i < entries.length; i++) {
    const pageEntryIdx = i % entriesPerPage;
    const col = Math.floor(pageEntryIdx / entriesPerCol);
    const row = pageEntryIdx % entriesPerCol;

    if (pageEntryIdx === 0) {
      if (pageNum > 0) doc.addPage();
      drawHeader();
      pageNum++;
    }

    const x = margin + col * (colWidth + colGap);
    const y = margin + headerHeight + row * lineHeight;

    drawEscortEntry(doc, entries[i], x, y, colWidth);
  }

  const blob = doc.output('blob');
  triggerDownload(blob, `escort-cards-${Date.now()}.pdf`);
}

function drawEscortEntry(
  doc: jsPDF,
  entry: EscortEntry,
  x: number,
  y: number,
  width: number
): void {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  const nameWidth = doc.getTextWidth(entry.name);
  const tableText = entry.tableLabel;
  const tableWidth = doc.getTextWidth(tableText);

  // Draw name
  doc.text(entry.name, x, y);

  // Draw table label right-aligned
  doc.text(tableText, x + width, y, { align: 'right' });

  // Draw dot leaders between name and table
  const dotsStart = x + nameWidth + 2;
  const dotsEnd = x + width - tableWidth - 2;

  if (dotsEnd > dotsStart) {
    doc.setTextColor(180, 180, 180);
    const dotSpacing = 1.5;
    let dotX = dotsStart;
    const dots: string[] = [];
    while (dotX < dotsEnd) {
      dots.push('.');
      dotX += dotSpacing;
    }
    if (dots.length > 0) {
      doc.setFontSize(7);
      doc.text(dots.join(' '), dotsStart, y);
      doc.setFontSize(9);
    }
    doc.setTextColor(30, 30, 30);
  }
}
