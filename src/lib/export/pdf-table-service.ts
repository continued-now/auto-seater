import { jsPDF } from 'jspdf';
import type { TableServiceExportOptions } from '@/types/export';
import type { Guest, DietaryTag, AccessibilityTag } from '@/types/guest';
import type { VenueConfig, Table } from '@/types/venue';
import { getPageDimensions, triggerDownload, formatDate } from './export-utils';

interface TableSection {
  table: Table;
  guests: Guest[];
  dietarySummary: string;
}

function buildDietarySummary(guests: Guest[]): string {
  const counts = new Map<DietaryTag, number>();
  for (const guest of guests) {
    for (const tag of guest.dietaryTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return '';
  const labels: Record<DietaryTag, string> = {
    vegetarian: 'vegetarian',
    vegan: 'vegan',
    'gluten-free': 'gluten-free',
    'nut-allergy': 'nut allergy',
    'dairy-free': 'dairy-free',
    halal: 'halal',
    kosher: 'kosher',
    'shellfish-allergy': 'shellfish allergy',
    other: 'other dietary',
  };
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => `${count} ${labels[tag]}`)
    .join(', ');
}

function formatAccessibilityTag(tag: AccessibilityTag): string {
  const labels: Record<AccessibilityTag, string> = {
    wheelchair: 'Wheelchair',
    'hearing-aid': 'Hearing aid',
    'visual-aid': 'Visual aid',
    'mobility-limited': 'Mobility limited',
    other: 'Accessibility',
  };
  return labels[tag];
}

function formatDietaryTag(tag: DietaryTag): string {
  const labels: Record<DietaryTag, string> = {
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    'gluten-free': 'Gluten-free',
    'nut-allergy': 'Nut allergy',
    'dairy-free': 'Dairy-free',
    halal: 'Halal',
    kosher: 'Kosher',
    'shellfish-allergy': 'Shellfish allergy',
    other: 'Other',
  };
  return labels[tag];
}

export function exportTableServicePDF(
  guests: Guest[],
  venue: VenueConfig,
  options: TableServiceExportOptions
): void {
  const page = getPageDimensions(options.paperSize, 'portrait');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: options.paperSize === 'letter' ? 'letter' : 'a4',
  });

  const margin = 15;
  const contentWidth = page.width - margin * 2;
  const footerMargin = 10;
  const maxY = page.height - margin - footerMargin;

  // Build guest lookup
  const guestMap = new Map<string, Guest>();
  for (const g of guests) guestMap.set(g.id, g);

  // Build table sections — only tables with assigned guests
  const sections: TableSection[] = venue.tables
    .filter((t) => t.assignedGuestIds.length > 0)
    .map((table) => {
      const tableGuests = table.assignedGuestIds
        .map((id) => guestMap.get(id))
        .filter((g): g is Guest => g !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name));
      return {
        table,
        guests: tableGuests,
        dietarySummary: buildDietarySummary(tableGuests),
      };
    })
    .sort((a, b) => a.table.label.localeCompare(b.table.label, undefined, { numeric: true }));

  if (sections.length === 0) return;

  let yPos = margin;
  let pageNum = 0;

  function drawHeader() {
    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(options.title, page.width / 2, margin + 6, { align: 'center' });

    // Date
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(formatDate(), page.width / 2, margin + 12, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  function startPage() {
    if (pageNum > 0) doc.addPage();
    pageNum++;
    drawHeader();
    yPos = margin + 18;
  }

  function checkPageBreak(needed: number) {
    if (yPos + needed > maxY) {
      startPage();
    }
  }

  // Draw badge helper
  function drawBadge(text: string, x: number, y: number, color: { r: number; g: number; b: number }): number {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    const textWidth = doc.getTextWidth(text);
    const badgeWidth = textWidth + 4;
    const badgeHeight = 4;

    // Badge background
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(x, y - 3, badgeWidth, badgeHeight, 1, 1, 'F');

    // Badge text
    doc.setTextColor(255, 255, 255);
    doc.text(text, x + 2, y - 0.5);
    doc.setTextColor(30, 30, 30);

    return badgeWidth + 1.5; // width + gap
  }

  startPage();

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];
    const { table, guests: tableGuests, dietarySummary } = section;

    // Estimate height needed for this section
    const headerLineHeight = 7;
    const summaryLineHeight = dietarySummary ? 5 : 0;
    const guestLineHeight = 6.5;
    const guestNotesExtraHeight = 4;
    const sectionSpacing = 8;

    // Calculate minimum height: header + summary + at least 1 guest
    const minSectionHeight = headerLineHeight + summaryLineHeight + guestLineHeight + sectionSpacing;
    checkPageBreak(minSectionHeight);

    // ---- Table header bar ----
    const headerY = yPos;
    doc.setFillColor(240, 242, 245);
    doc.roundedRect(margin, headerY, contentWidth, 7, 1.5, 1.5, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const headerText = `${table.label} — ${tableGuests.length}/${table.capacity} seats`;
    doc.text(headerText, margin + 3, headerY + 4.8);

    yPos = headerY + 9;

    // ---- Dietary summary line ----
    if (dietarySummary) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(dietarySummary, margin + 3, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      yPos += 5;
    }

    // ---- Guest rows ----
    for (const guest of tableGuests) {
      const hasNotes = guest.notes && guest.notes.trim().length > 0;
      const rowHeight = hasNotes ? guestLineHeight + guestNotesExtraHeight : guestLineHeight;
      checkPageBreak(rowHeight + 2);

      // Guest name
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(guest.name, margin + 5, yPos);

      // Badges after name
      let badgeX = margin + 5 + doc.getTextWidth(guest.name) + 3;

      // Dietary badges (warm colors)
      for (const tag of guest.dietaryTags) {
        const width = drawBadge(formatDietaryTag(tag), badgeX, yPos, { r: 220, g: 120, b: 60 });
        badgeX += width;
      }

      // Accessibility badges (blue tones)
      for (const tag of guest.accessibilityTags) {
        const width = drawBadge(formatAccessibilityTag(tag), badgeX, yPos, { r: 70, g: 130, b: 180 });
        badgeX += width;
      }

      yPos += guestLineHeight;

      // Notes line (indented, grey, italic)
      if (hasNotes) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(130, 130, 130);
        // Truncate notes if too long to fit on one line
        const maxNotesWidth = contentWidth - 10;
        let noteText = guest.notes.trim();
        while (doc.getTextWidth(noteText) > maxNotesWidth && noteText.length > 0) {
          noteText = noteText.slice(0, -1);
        }
        if (noteText.length < guest.notes.trim().length) {
          noteText = noteText.slice(0, -3) + '...';
        }
        doc.text(noteText, margin + 8, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        yPos += guestNotesExtraHeight;
      }
    }

    // Spacing between table sections
    yPos += sectionSpacing;
  }

  const blob = doc.output('blob');
  triggerDownload(blob, `table-service-sheet.pdf`);
}
