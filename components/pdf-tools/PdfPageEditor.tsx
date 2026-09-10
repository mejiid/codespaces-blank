"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import JSZip from "jszip";
import { PDFDocument, rgb } from "pdf-lib";
import {
  AlertCircle,
  Download,
  FileCheck2,
  FileCode,
  FileUp,
  Layers,
  Loader2,
  Printer,
  Scissors,
  Sparkles,
  Table as TableIcon,
  X,
} from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { saveExport } from "./saveExport";

type PageNode = { logicalPageNumber: number | null; isCover?: boolean };
type SheetSide = { left: PageNode; right: PageNode };
type ImposedSheet = { sheetNumber: number; front: SheetSide; back: SheetSide };
type ViewMode = "visual" | "table" | "sequence";
type PrintMode = "duplex" | "single-sided";
type ImpositionSummary = { startPage: number; endPage: number; signatureSheets: number; signaturePageCount: number; blankPagesAdded: number; totalSheets: number; sheets: ImposedSheet[]; printSequenceText: string };

function calculateImposition(input: string, signatureInput: string, maxAllowed?: number): ImpositionSummary | null {
  const trimmed = input.trim();
  let start = 1;
  let end: number;
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-").map((part) => Number.parseInt(part.trim(), 10));
    if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
    start = Math.max(1, parts[0]);
    end = Math.max(start, parts[1]);
  } else {
    end = Number.parseInt(trimmed, 10);
    if (Number.isNaN(end) || end < 1) return null;
  }
  if (maxAllowed) end = Math.min(end, maxAllowed);

  const signatureSheets = Number.parseInt(signatureInput, 10);
  if (Number.isNaN(signatureSheets) || signatureSheets < 1) return null;
  const signaturePageCount = signatureSheets * 4;

  const rawPageCount = end - start + 1;
  const sheets: ImposedSheet[] = [];
  let blankPagesAdded = 0;
  let sheetNumber = 1;

  for (let blockStart = 0; blockStart < rawPageCount; blockStart += signaturePageCount) {
    const blockPageCount = Math.min(signaturePageCount, rawPageCount - blockStart);
    const blockBlankPages = (4 - (blockPageCount % 4)) % 4;
    const paddedBlockPageCount = blockPageCount + blockBlankPages;
    blankPagesAdded += blockBlankPages;

    const pageAt = (index: number): PageNode => {
      if (index > blockPageCount) return { logicalPageNumber: null };
      const page = start + blockStart + index - 1;
      return { logicalPageNumber: page, isCover: page === start || page === end };
    };

    for (let blockSheet = 1; blockSheet <= paddedBlockPageCount / 4; blockSheet += 1) {
      sheets.push({
        sheetNumber,
        front: { left: pageAt(paddedBlockPageCount - 2 * (blockSheet - 1)), right: pageAt(2 * blockSheet - 1) },
        back: { left: pageAt(2 * blockSheet), right: pageAt(paddedBlockPageCount - 2 * blockSheet + 1) },
      });
      sheetNumber += 1;
    }
  }
  const sequence = sheets.flatMap((sheet) => [sheet.front.left, sheet.front.right, sheet.back.left, sheet.back.right]).map((page) => page.logicalPageNumber ?? "Blank");
  return { startPage: start, endPage: end, signatureSheets, signaturePageCount, blankPagesAdded, totalSheets: sheets.length, sheets, printSequenceText: sequence.join(", ") };
}

export default function PdfPageEditor() {
  const [input, setInput] = useState("1-16");
  const [signatureSheetsInput, setSignatureSheetsInput] = useState("5");
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [foldLine, setFoldLine] = useState(true);
  const [printMode, setPrintMode] = useState<PrintMode>("duplex");
  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imposition = useMemo(() => calculateImposition(input, signatureSheetsInput, pageCount ?? undefined), [input, signatureSheetsInput, pageCount]);

  const loadFile = async (nextFile: File) => {
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) return;
    setIsProcessing(true);
    try {
      const nextBuffer = await nextFile.arrayBuffer();
      const document = await PDFDocument.load(nextBuffer);
      setFile(nextFile);
      setBuffer(nextBuffer);
      setPageCount(document.getPageCount());
      setInput(`1-${document.getPageCount()}`);
    } catch (error) {
      console.error("Failed to read PDF:", error);
      alert("Could not read PDF. Make sure it is not password protected.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setBuffer(null);
    setPageCount(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const exportBooklet = async () => {
    if (!buffer || !file || !imposition) return;
    setIsProcessing(true);
    try {
      const source = await PDFDocument.load(buffer);
      const { width, height } = source.getPage(0).getSize();
      const baseName = file.name.replace(/\.pdf$/i, "");
      const sides: Array<{ name: string; sheets: SheetSide[] }> = printMode === "duplex"
        ? [{ name: "booklet_imposed", sheets: imposition.sheets.flatMap((sheet) => [sheet.front, sheet.back]) }]
        : [
            { name: "front", sheets: imposition.sheets.map((sheet) => sheet.front) },
            { name: "back", sheets: imposition.sheets.map((sheet) => sheet.back) },
          ];
      const generatedFiles: Array<{ name: string; bytes: Uint8Array }> = [];

      for (const side of sides) {
        const output = await PDFDocument.create();
        for (const spread of side.sheets) {
          const page = output.addPage([width * 2, height]);
          for (const [node, x] of [[spread.left, 0], [spread.right, width]] as const) {
            if (node.logicalPageNumber === null) continue;
            const [embedded] = await output.embedPages([source.getPage(node.logicalPageNumber - 1)]);
            const scale = Math.min(width / embedded.width, height / embedded.height);
            const drawnWidth = embedded.width * scale;
            const drawnHeight = embedded.height * scale;
            page.drawPage(embedded, {
              x: x + (width - drawnWidth) / 2,
              y: (height - drawnHeight) / 2,
              width: drawnWidth,
              height: drawnHeight,
            });
          }
          if (foldLine) page.drawLine({ start: { x: width, y: 15 }, end: { x: width, y: height - 15 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8), dashArray: [3, 3] });
        }
        const bytes = await output.save();
        generatedFiles.push({ name: `${baseName}_${side.name}.pdf`, bytes });
      }

      if (printMode === "single-sided") {
        const archive = new JSZip();
        generatedFiles.forEach(({ name, bytes }) => archive.file(name, bytes));
        const zipBytes = await archive.generateAsync({ type: "uint8array" });
        await saveExport(zipBytes, `${baseName}_front_and_back.zip`, "application/zip");
      } else {
        const [{ name, bytes }] = generatedFiles;
        await saveExport(bytes, name, "application/pdf");
      }
    } catch (error) {
      console.error("PDF imposition failed:", error);
      alert("An error occurred during PDF generation.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="theme-page min-h-screen bg-[#07090e] p-4 text-zinc-200 antialiased sm:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-center">
          <div><div className="flex items-center gap-3"><div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400"><Layers className="h-5 w-5" /></div><h1 className="text-xl font-semibold text-zinc-100">Booklet Imposition</h1></div><p className="mt-1 text-sm text-zinc-400">Convert PDFs into print-ready 2-up saddle-stitch booklets.</p></div>
          <div className="flex items-center gap-2">{imposition && <div className="flex items-center gap-2 text-xs font-mono text-zinc-400"><span className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/90 px-3 py-1.5"><Printer className="h-3.5 w-3.5" />{imposition.totalSheets} {imposition.totalSheets === 1 ? "sheet" : "sheets"}</span><span className="rounded-md border border-zinc-800 bg-zinc-900/90 px-3 py-1.5">{printMode === "duplex" ? "Duplex" : "Single-sided"} landscape</span></div>}<ThemeToggle /></div>
        </header>

        <section className="space-y-4 rounded-xl border border-zinc-800/90 bg-[#0f1422] p-4 shadow-xl sm:p-5">
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => event.target.files?.[0] && loadFile(event.target.files[0])} />
          {!file ? <div onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files[0]) loadFile(event.dataTransfer.files[0]); }} className="cursor-pointer rounded-lg border border-dashed border-zinc-700 p-8 text-center hover:border-indigo-500/60 hover:bg-zinc-900/40"><FileUp className="mx-auto mb-3 h-6 w-6 text-indigo-400" /><p className="text-sm font-medium text-zinc-200">Drop your PDF here or click to browse</p><p className="mt-1 text-xs text-zinc-500">The file stays in your browser.</p></div> : <div className="flex flex-col justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><FileCheck2 className="h-5 w-5 shrink-0 text-emerald-400" /><div className="min-w-0"><p className="truncate text-xs font-medium text-zinc-200">{file.name}</p><p className="text-[11px] text-zinc-500">{pageCount} pages detected</p></div></div><div className="flex w-full flex-wrap items-center gap-3 sm:w-auto"><label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={foldLine} onChange={(event) => setFoldLine(event.target.checked)} /><Scissors className="h-3.5 w-3.5" />Fold line</label><button type="button" onClick={exportBooklet} disabled={isProcessing} className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 sm:flex-none">{isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}{printMode === "single-sided" ? "Export front + back ZIP" : "Export imposed PDF"}</button><button type="button" onClick={clearFile} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200" title="Remove file"><X className="h-4 w-4" /></button></div></div>}
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <label className="text-xs text-zinc-400">Page range
              <input value={input} onChange={(event) => setInput(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700/70 bg-[#0a0d17] px-3.5 py-2.5 font-mono text-sm text-zinc-100 outline-none focus:border-indigo-500" placeholder="1-60 or 24" />
            </label>
            <label className="text-xs text-zinc-400">Signature size (sheets)
              <input type="number" min={1} step={1} value={signatureSheetsInput} onChange={(event) => setSignatureSheetsInput(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700/70 bg-[#0a0d17] px-3.5 py-2.5 font-mono text-sm text-zinc-100 outline-none focus:border-indigo-500" />
            </label>
            {imposition ? <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-2 text-indigo-300">{imposition.signaturePageCount} pages per signature</span>
              {imposition.blankPagesAdded ? <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-300"><Sparkles className="h-3.5 w-3.5 text-amber-400" />+{imposition.blankPagesAdded} blank pad</span> : null}
            </div> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-3">
            <span className="mr-1 text-xs text-zinc-500">Printer mode</span>
            <ViewButton active={printMode === "duplex"} onClick={() => setPrintMode("duplex")}>Duplex</ViewButton>
            <ViewButton active={printMode === "single-sided"} onClick={() => setPrintMode("single-sided")}>Single-sided (2 PDFs)</ViewButton>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-3">
            <span className="mr-1 text-xs text-zinc-500">View</span>
            <ViewButton active={viewMode === "visual"} onClick={() => setViewMode("visual")}>Visual</ViewButton>
            <ViewButton active={viewMode === "table"} onClick={() => setViewMode("table")} icon={<TableIcon className="h-3.5 w-3.5" />}>Table</ViewButton>
            <ViewButton active={viewMode === "sequence"} onClick={() => setViewMode("sequence")}>Sequence</ViewButton>
          </div>
        </section>

        {imposition ? <div className="space-y-4">
          {viewMode === "visual" && imposition.sheets.map((sheet) => <SheetCard key={sheet.sheetNumber} sheet={sheet} totalSheets={imposition.totalSheets} />)}
          {viewMode === "table" && <ImpositionTable sheets={imposition.sheets} />}
          {viewMode === "sequence" && <div className="rounded-xl border border-zinc-800 bg-[#0f1422] p-5"><div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300"><FileCode className="h-4 w-4 text-indigo-400" />Duplex sequence</div><p className="break-words rounded-lg border border-zinc-800 bg-[#07090e] p-4 font-mono text-xs leading-relaxed text-indigo-300">{imposition.printSequenceText}</p></div>}
        </div> : <div className="rounded-xl border border-dashed border-zinc-800 bg-[#0f1422] p-12 text-center text-zinc-400"><AlertCircle className="mx-auto mb-2 h-7 w-7 text-zinc-500" />Enter a valid page range such as 1-16.</div>}
      </div>
    </main>
  );
}

function SheetCard({ sheet, totalSheets }: { sheet: ImposedSheet; totalSheets: number }) {
  return <section className="rounded-xl border border-zinc-800/90 bg-[#0f1422] p-4 shadow-md sm:p-5"><div className="mb-4 flex items-center justify-between text-xs font-mono"><span className="font-semibold text-zinc-200">Sheet {sheet.sheetNumber} <span className="font-normal text-zinc-500">of {totalSheets}</span></span>{sheet.sheetNumber === 1 ? <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase text-indigo-300">Outer cover</span> : null}</div><div className="grid gap-4 md:grid-cols-2"><Spread label="Side A (front)" side={sheet.front} /><Spread label="Side B (back)" side={sheet.back} /></div></section>;
}

function Spread({ label, side }: { label: string; side: SheetSide }) {
  return <div className="rounded-lg border border-zinc-800/80 bg-[#07090e] p-3"><div className="mb-2 text-[11px] font-mono text-zinc-400">{label}</div><div className="grid grid-cols-2 divide-x divide-dashed divide-zinc-700 rounded-md border border-zinc-800 bg-zinc-900/60"><PageBadge node={side.left} /><PageBadge node={side.right} /></div></div>;
}

function PageBadge({ node }: { node: PageNode }) {
  return <div className="flex h-24 items-center justify-center p-2 text-center">{node.logicalPageNumber === null ? <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-400">Blank</span> : <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 font-mono text-sm font-bold text-zinc-100">Pg {node.logicalPageNumber}</span>}</div>;
}

function ViewButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: ReactNode; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>{icon}{children}</button>;
}

function ImpositionTable({ sheets }: { sheets: ImposedSheet[] }) {
  return <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0f1422]"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-mono uppercase text-zinc-400"><th className="px-4 py-3">Sheet</th><th className="border-l border-zinc-800 px-4 py-3" colSpan={2}>Front spread</th><th className="border-l border-zinc-800 px-4 py-3" colSpan={2}>Back spread</th></tr><tr className="border-b border-zinc-800/70 bg-zinc-900/30 text-[10px] font-mono text-zinc-500"><th className="px-4 py-2 font-normal">Index</th><th className="border-l border-zinc-800/70 px-4 py-2 font-normal">Left</th><th className="px-4 py-2 font-normal">Right</th><th className="border-l border-zinc-800/70 px-4 py-2 font-normal">Left</th><th className="px-4 py-2 font-normal">Right</th></tr></thead><tbody className="divide-y divide-zinc-800/60 font-mono text-xs">{sheets.map((sheet) => <tr key={sheet.sheetNumber} className="hover:bg-zinc-800/30"><td className="px-4 py-3 text-zinc-400">Sheet {sheet.sheetNumber}</td><td className="border-l border-zinc-800/60 px-4 py-3"><TableBadge node={sheet.front.left} /></td><td className="px-4 py-3"><TableBadge node={sheet.front.right} /></td><td className="border-l border-zinc-800/60 px-4 py-3"><TableBadge node={sheet.back.left} /></td><td className="px-4 py-3"><TableBadge node={sheet.back.right} /></td></tr>)}</tbody></table></div>;
}

function TableBadge({ node }: { node: PageNode }) {
  return node.logicalPageNumber === null ? <span className="text-amber-400">Blank</span> : <span className="font-semibold text-zinc-200">{node.logicalPageNumber}</span>;
}
