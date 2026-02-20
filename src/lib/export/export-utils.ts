import type { PaperSize, Orientation } from '@/types/export';

export interface PageDimensions {
  width: number;
  height: number;
}

// jsPDF uses mm by default
const PAGE_SIZES: Record<PaperSize, PageDimensions> = {
  letter: { width: 215.9, height: 279.4 },
  a4: { width: 210, height: 297 },
};

export function getPageDimensions(size: PaperSize, orientation: Orientation): PageDimensions {
  const base = PAGE_SIZES[size];
  if (orientation === 'landscape') {
    return { width: base.height, height: base.width };
  }
  return base;
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function mmToPoints(mm: number): number {
  return mm * 2.83465;
}
