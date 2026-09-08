export interface PdfSplitRange {
  start: number;
  end: number;
  label: string;
}

export function createPdfSplitRanges(pageCount: number, interval: number): PdfSplitRange[] {
  if (!Number.isInteger(pageCount) || pageCount < 1 || !Number.isInteger(interval) || interval < 1) {
    return [];
  }

  const ranges: PdfSplitRange[] = [];
  for (let start = 1; start <= pageCount; start += interval) {
    const end = Math.min(pageCount, start + interval - 1);
    ranges.push({ start, end, label: `${start}-${end}` });
  }
  return ranges;
}
