"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, degrees } from "pdf-lib";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Download,
  FileCheck2,
  FileUp,
  Loader2,
  Scissors,
  Trash2,
} from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { saveExport } from "./saveExport";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfPageThumbnail {
  originalPageNumber: number;
  dataUrl: string;
  rotation: number;
}

export default function PdfPageRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PdfPageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutedTextClass = "text-zinc-400";
  const subtleTextClass = "text-zinc-500";

  const loadFile = async (nextFile: File) => {
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a valid PDF file.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const bytes = await nextFile.arrayBuffer();
      // PDF.js may transfer its input buffer while parsing it. Keep the original
      // buffer untouched because pdf-lib needs it later when exporting.
      const previewBytes = bytes.slice(0);
      const document = await pdfjsLib.getDocument({ data: previewBytes }).promise;
      const thumbnails: PdfPageThumbnail[] = [];

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.85 });
        const canvas = window.document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is not supported in this browser.");

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        thumbnails.push({ originalPageNumber: pageNumber, dataUrl: canvas.toDataURL("image/png"), rotation: 0 });
      }

      setFile(nextFile);
      setPdfBytes(bytes);
      setPages(thumbnails);
      setSelectedPages([]);
      setActiveIndex(0);
    } catch (loadError) {
      console.error("PDF preview failed:", loadError);
      setError("Could not read the PDF. Please try another file.");
      clearFile();
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clearFile = () => {
    setFile(null);
    setPdfBytes(null);
    setPages([]);
    setSelectedPages([]);
    setActiveIndex(0);
  };

  const togglePage = (pageNumber: number) => {
    setSelectedPages((current) =>
      current.includes(pageNumber)
        ? current.filter((page) => page !== pageNumber)
        : [...current, pageNumber].sort((a, b) => a - b)
    );
  };

  const deleteSelected = () => {
    setPages((current) => {
      const remaining = current.filter((page) => !selectedPages.includes(page.originalPageNumber));
      setActiveIndex((index) => Math.min(index, Math.max(0, remaining.length - 1)));
      return remaining;
    });
    setSelectedPages([]);
  };

  const rotateSelected = (direction: "cw" | "ccw") => {
    const delta = direction === "cw" ? 90 : -90;
    setPages((current) => current.map((page) =>
      selectedPages.includes(page.originalPageNumber)
        ? { ...page, rotation: (page.rotation + delta + 360) % 360 }
        : page
    ));
    setSelectedPages([]);
  };

  const reorderSelected = (direction: "up" | "down") => {
    setPages((current) => {
      const selected = new Set(selectedPages);
      const selectedItems = current.filter((page) => selected.has(page.originalPageNumber));
      const selectedIndexes = current.reduce<number[]>((indexes, page, index) => {
        if (selected.has(page.originalPageNumber)) indexes.push(index);
        return indexes;
      }, []);
      if (!selectedItems.length || !selectedIndexes.length) return current;

      const remaining = current.filter((_, index) => !selectedIndexes.includes(index));
      const insertAt = direction === "up"
        ? Math.max(0, selectedIndexes[0] - 1)
        : Math.min(remaining.length, selectedIndexes[selectedIndexes.length - 1] + 1);
      remaining.splice(insertAt, 0, ...selectedItems);
      return remaining;
    });
    setSelectedPages([]);
  };

  const exportPdf = async () => {
    if (!pdfBytes || !file || !pages.length) return;
    try {
      const source = await PDFDocument.load(pdfBytes);
      const output = await PDFDocument.create();
      for (const page of pages) {
        const [copiedPage] = await output.copyPages(source, [page.originalPageNumber - 1]);
        copiedPage.setRotation(degrees(page.rotation));
        output.addPage(copiedPage);
      }
      const outputBytes = await output.save();
      await saveExport(outputBytes, `${file.name.replace(/\.pdf$/i, "")}_pages_removed.pdf`, "application/pdf");
    } catch (exportError) {
      console.error("Failed to export the cleaned PDF:", exportError);
      setError("Could not export the updated PDF. Please try again.");
    }
  };

  return (
    <ToolShell>
      <header className="flex flex-col justify-between gap-3 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400"><Trash2 className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">PDF Page Remover</h1>
            <p className={`text-sm ${mutedTextClass}`}>Preview, reorder, rotate, and remove PDF pages.</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <section className="space-y-4 rounded-xl border border-zinc-800/90 bg-[#0f1422] p-4 shadow-xl sm:p-5">
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => event.target.files?.[0] && loadFile(event.target.files[0])} />
        {!file ? (
          <div onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files[0]) loadFile(event.dataTransfer.files[0]); }} className="cursor-pointer rounded-lg border border-dashed border-zinc-700 p-10 text-center hover:border-rose-500/60 hover:bg-zinc-900/40">
            <FileUp className="mx-auto mb-3 h-6 w-6 text-rose-400" />
            <p className="text-sm font-medium text-zinc-200">Upload a PDF to preview pages</p>
            <p className={`mt-1 text-xs ${subtleTextClass}`}>Select pages visually, then export the cleaned file.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3"><FileCheck2 className="h-5 w-5 text-emerald-400" /><div><p className="text-xs font-semibold text-zinc-200">{file.name}</p><p className={`text-[11px] ${subtleTextClass}`}>{pages.length} pages remaining, {selectedPages.length} selected</p></div></div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <ToolButton onClick={deleteSelected} disabled={!selectedPages.length} color="rose"><Trash2 /> Delete</ToolButton>
                <ToolButton onClick={() => rotateSelected("cw")} disabled={!selectedPages.length} color="amber"><Scissors /> Rotate +90</ToolButton>
                <ToolButton onClick={() => rotateSelected("ccw")} disabled={!selectedPages.length} color="sky"><Scissors /> Rotate -90</ToolButton>
                <ToolButton onClick={() => reorderSelected("up")} disabled={!selectedPages.length} color="violet"><ArrowUp /> Move up</ToolButton>
                <ToolButton onClick={() => reorderSelected("down")} disabled={!selectedPages.length} color="violet"><ArrowDown /> Move down</ToolButton>
                <ToolButton onClick={exportPdf} disabled={!pages.length} color="indigo"><Download /> Export</ToolButton>
                <button type="button" onClick={clearFile} className="col-span-2 rounded-md bg-zinc-800 px-2.5 py-2 text-xs text-zinc-200 hover:bg-zinc-700 sm:col-span-1 sm:py-1.5">Remove file</button>
              </div>
            </div>
            {error && <div className="flex items-center gap-2 rounded-lg border border-red-700/60 bg-red-500/10 px-3 py-2 text-xs text-red-300"><AlertCircle className="h-3.5 w-3.5" />{error}</div>}
            {isLoading ? <div className="flex justify-center gap-2 rounded-lg border border-zinc-800 bg-[#0a0d17] p-8 text-sm text-zinc-300"><Loader2 className="h-4 w-4 animate-spin" />Preparing page thumbnails...</div> : pages.length ? <PageWorkspace pages={pages} activeIndex={activeIndex} selectedPages={selectedPages} setActiveIndex={setActiveIndex} togglePage={togglePage} /> : <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-zinc-500">No pages available.</div>}
          </>
        )}
      </section>
    </ToolShell>
  );
}

function PageWorkspace({ pages, activeIndex, selectedPages, setActiveIndex, togglePage }: { pages: PdfPageThumbnail[]; activeIndex: number; selectedPages: number[]; setActiveIndex: (value: number | ((current: number) => number)) => void; togglePage: (pageNumber: number) => void }) {
  const activePage = pages[activeIndex];
  return <div className="space-y-4"><div className="rounded-xl border border-zinc-800 bg-[#090b12] p-3"><div className="mb-3 flex items-center justify-between text-xs text-zinc-400"><span>Page {activePage.originalPageNumber} of {pages.length}</span><div className="flex gap-2"><button type="button" disabled={!activeIndex} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-200 disabled:opacity-40">Prev</button><button type="button" disabled={activeIndex === pages.length - 1} onClick={() => setActiveIndex((index) => Math.min(pages.length - 1, index + 1))} className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-200 disabled:opacity-40">Next</button></div></div><div className="flex justify-center rounded-lg bg-white p-4"><img src={activePage.dataUrl} alt={`Page ${activePage.originalPageNumber}`} className="max-h-[420px] w-auto rounded-md object-contain" style={{ transform: `rotate(${activePage.rotation}deg)` }} /></div><button type="button" onClick={() => togglePage(activePage.originalPageNumber)} className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-medium ${selectedPages.includes(activePage.originalPageNumber) ? "bg-rose-600 text-white" : "bg-zinc-800 text-zinc-200"}`}>{selectedPages.includes(activePage.originalPageNumber) ? "Marked for delete" : "Keep this page"}</button></div><div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8">{pages.map((page, index) => { const selected = selectedPages.includes(page.originalPageNumber); return <button key={page.originalPageNumber} type="button" onClick={() => { setActiveIndex(index); togglePage(page.originalPageNumber); }} className={`relative overflow-hidden rounded-lg border ${index === activeIndex ? "border-indigo-500 ring-2 ring-indigo-500/30" : selected ? "border-rose-500" : "border-zinc-800 hover:border-indigo-500/50"}`}><img src={page.dataUrl} alt={`Page ${page.originalPageNumber}`} className="h-24 w-full bg-white object-cover" style={{ transform: `rotate(${page.rotation}deg)` }} /><div className="flex justify-between bg-zinc-900/90 px-1.5 py-1 text-[10px] font-mono text-zinc-200"><span>{page.originalPageNumber}</span><span className={selected ? "text-rose-400" : "text-zinc-500"}>{page.rotation === 0 ? selected ? "D" : "K" : `${page.rotation}°`}</span></div></button>; })}</div></div>;
}

function ToolButton({ onClick, disabled, color, children }: { onClick: () => void; disabled: boolean; color: string; children: ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`flex items-center gap-2 rounded-lg bg-${color}-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-${color}-500 disabled:opacity-50`}>{children}</button>;
}

function ToolShell({ children }: { children: React.ReactNode }) {
  return <div className="theme-page min-h-screen bg-[#07090e] p-4 text-zinc-200 antialiased sm:p-8"><main className="mx-auto w-full max-w-5xl space-y-6">{children}</main></div>;
}
