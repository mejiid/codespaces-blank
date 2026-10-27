import type { ImposedSheet, ImpositionSummary, PageNode } from "./types";
import { saveExport } from "../saveExport";

export const PRESET_RANGES = ["1-8", "1-12", "1-16", "1-20", "1-24", "1-32"] as const;

/**
 * Calculates a 2-up saddle-stitch booklet imposition for the given page range.
 * Accepts "1-16" or "24" style input and pads the page count to a multiple of 4.
 */
export function calculateBookletImposition(
  input: string,
  maxAllowed?: number,
  readingDirection: "ltr" | "rtl" = "ltr"
): ImpositionSummary | null {
  const trimmed = input.trim();
  let start = 1;
  let end = 1;

  if (trimmed.includes("-")) {
    const parts = trimmed.split("-").map((p) => parseInt(p.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      start = Math.max(1, parts[0]);
      end = Math.max(start, parts[1]);
    } else {
      return null;
    }
  } else {
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 1) return null;
    start = 1;
    end = parsed;
  }

  if (maxAllowed && end > maxAllowed) {
    end = maxAllowed;
  }

  const rawPageCount = end - start + 1;
  const remainder = rawPageCount % 4;
  const blankPagesAdded = remainder === 0 ? 0 : 4 - remainder;
  const paddedPageCount = rawPageCount + blankPagesAdded;
  const totalSheets = paddedPageCount / 4;

  const getPageNode = (index1Based: number): PageNode => {
    if (index1Based > rawPageCount) {
      return { logicalPageNumber: null };
    }
    const pageNum = start + index1Based - 1;
    return {
      logicalPageNumber: pageNum,
      isCover: pageNum === start || pageNum === end,
    };
  };

  const sheets: ImposedSheet[] = [];

  for (let i = 1; i <= totalSheets; i++) {
    const frontLeftIdx = paddedPageCount - 2 * (i - 1);
    const frontRightIdx = 2 * i - 1;
    const backLeftIdx = 2 * i;
    const backRightIdx = paddedPageCount - 2 * i + 1;

    const latinFront = {
      left: getPageNode(frontLeftIdx),
      right: getPageNode(frontRightIdx),
    };
    const latinBack = {
      left: getPageNode(backLeftIdx),
      right: getPageNode(backRightIdx),
    };
    sheets.push({
      sheetNumber: i,
      front: readingDirection === "rtl" ? { left: latinFront.right, right: latinFront.left } : latinFront,
      back: readingDirection === "rtl" ? { left: latinBack.right, right: latinBack.left } : latinBack,
    });
  }

  const sequenceArray: string[] = [];
  sheets.forEach((s) => {
    sequenceArray.push(
      s.front.left.logicalPageNumber?.toString() ?? "Blank",
      s.front.right.logicalPageNumber?.toString() ?? "Blank",
      s.back.left.logicalPageNumber?.toString() ?? "Blank",
      s.back.right.logicalPageNumber?.toString() ?? "Blank"
    );
  });

  return {
    startPage: start,
    endPage: end,
    rawPageCount,
    paddedPageCount,
    blankPagesAdded,
    totalSheets,
    sheets,
    printSequenceText: sequenceArray.join(", "),
  };
}

/** Saves a blob using the browser's Save As dialog when available. */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  await saveExport(new Uint8Array(await blob.arrayBuffer()), filename, blob.type || "application/octet-stream");
}

/** Downloads a PDF byte array. */
export async function downloadPdfBytes(bytes: Uint8Array, filename: string): Promise<void> {
  await saveExport(bytes, filename, "application/pdf");
}

/** Downloads the imposition matrix as a CSV file. */
export async function downloadImpositionCsv(
  startPage: number,
  endPage: number,
  sheets: ImposedSheet[]
): Promise<void> {
  const headers = ["Sheet #", "Front Left", "Front Right", "Back Left", "Back Right"];
  const rows = sheets.map((s) => [
    s.sheetNumber,
    s.front.left.logicalPageNumber ?? "[Blank]",
    s.front.right.logicalPageNumber ?? "[Blank]",
    s.back.left.logicalPageNumber ?? "[Blank]",
    s.back.right.logicalPageNumber ?? "[Blank]",
  ]);
  const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  await saveExport(new TextEncoder().encode(csvContent), `imposition_matrix_${startPage}-${endPage}.csv`, "text/csv");
}

/** Copies text to the system clipboard. */
export async function copyTextToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}