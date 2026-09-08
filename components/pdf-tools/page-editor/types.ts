export type ViewMode = "cards" | "table" | "sequence";

export interface PageNode {
  logicalPageNumber: number | null;
  isCover?: boolean;
}

export interface SheetSide {
  left: PageNode;
  right: PageNode;
}

export interface ImposedSheet {
  sheetNumber: number;
  front: SheetSide;
  back: SheetSide;
}

export interface ImpositionSummary {
  startPage: number;
  endPage: number;
  rawPageCount: number;
  paddedPageCount: number;
  blankPagesAdded: number;
  totalSheets: number;
  sheets: ImposedSheet[];
  printSequenceText: string;
}

export interface PdfPageThumbnail {
  pageNumber: number;
  originalPageNumber: number;
  dataUrl: string;
  rotation: number;
}