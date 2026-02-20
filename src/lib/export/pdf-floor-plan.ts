import { jsPDF } from 'jspdf';
import type { FloorPlanExportOptions } from '@/types/export';
import type { Guest } from '@/types/guest';
import type { VenueConfig } from '@/types/venue';
import { getPageDimensions, triggerDownload, formatDate } from './export-utils';
import type Konva from 'konva';

export async function exportFloorPlanPDF(
  stageNode: Konva.Stage,
  options: FloorPlanExportOptions,
  venue: VenueConfig,
  guests: Guest[]
): Promise<void> {
  const page = getPageDimensions(options.paperSize, options.orientation);
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.paperSize === 'letter' ? 'letter' : 'a4',
  });

  const margin = 15;
  const contentWidth = page.width - margin * 2;
  let yPos = margin;

  // Title
  if (options.title) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title, page.width / 2, yPos, { align: 'center' });
    yPos += 8;
  }

  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(formatDate(), page.width / 2, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  // Stats
  if (options.showStats) {
    const seatedCount = guests.filter((g) => g.tableId).length;
    const tableCount = venue.tables.length;
    const statsText = `${guests.length} guests | ${tableCount} tables | ${seatedCount} seated`;
    doc.setFontSize(10);
    doc.text(statsText, page.width / 2, yPos, { align: 'center' });
    yPos += 10;
  }

  // Capture stage image
  // Save current transform
  const prevScaleX = stageNode.scaleX();
  const prevScaleY = stageNode.scaleY();
  const prevX = stageNode.x();
  const prevY = stageNode.y();

  // Reset transform for capture
  stageNode.scale({ x: 1, y: 1 });
  stageNode.position({ x: 0, y: 0 });

  const dataUrl = stageNode.toDataURL({ pixelRatio: 3 });

  // Restore transform
  stageNode.scale({ x: prevScaleX, y: prevScaleY });
  stageNode.position({ x: prevX, y: prevY });

  // Calculate image dimensions to fit content area
  const availableHeight = page.height - yPos - margin;
  const stageAspect = stageNode.width() / stageNode.height();
  const contentAspect = contentWidth / availableHeight;

  let imgWidth: number;
  let imgHeight: number;

  if (stageAspect > contentAspect) {
    imgWidth = contentWidth;
    imgHeight = contentWidth / stageAspect;
  } else {
    imgHeight = availableHeight;
    imgWidth = availableHeight * stageAspect;
  }

  const imgX = margin + (contentWidth - imgWidth) / 2;
  doc.addImage(dataUrl, 'PNG', imgX, yPos, imgWidth, imgHeight);

  const blob = doc.output('blob');
  triggerDownload(blob, `floor-plan-${Date.now()}.pdf`);
}
