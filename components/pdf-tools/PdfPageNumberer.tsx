"use client";

import { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Download, FileCheck2, FileUp, Loader2, X } from "lucide-react";
import PageNumberingPanel, { defaultPageNumberSettings, getPageNumberPosition, getPageNumberPositionForPage, getPageNumberText, type PageNumberSettings } from "./PageNumberingPanel";
import ThemeToggle from "../ThemeToggle";
import { saveExport } from "./saveExport";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type PreviewPage = { dataUrl: string; width: number; height: number };

export default function PdfPageNumberer() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PreviewPage[]>([]);
  const [settings, setSettings] = useState<PageNumberSettings>({ ...defaultPageNumberSettings, enabled: true });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = async (nextFile: File) => {
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a valid PDF file.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sourceBytes = await nextFile.arrayBuffer();
      const document = await pdfjsLib.getDocument({ data: sourceBytes.slice(0) }).promise;
      const previews: PreviewPage[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = window.document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is not supported in this browser.");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        previews.push({ dataUrl: canvas.toDataURL("image/png"), width: viewport.width, height: viewport.height });
      }
      setFile(nextFile);
      setBytes(sourceBytes);
      setPages(previews);
    } catch (loadError) {
      console.error("PDF preview failed:", loadError);
      setError("Could not read the PDF. Please try another file.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clearFile = () => {
    setFile(null);
    setBytes(null);
    setPages([]);
    setError(null);
  };

  const exportPdf = async () => {
    if (!file || !bytes || !pages.length) return;
    setExporting(true);
    setError(null);
    try {
      const source = await PDFDocument.load(bytes);
      const output = await PDFDocument.create();
      const font = await output.embedFont(StandardFonts.Helvetica);
      for (let index = 0; index < source.getPageCount(); index += 1) {
        const [page] = await output.copyPages(source, [index]);
        const numberingIndex = index - (settings.startPage - 1);
        const isRunningHeader = settings.position === "running-header";
        if (settings.enabled && (isRunningHeader || numberingIndex >= 0)) {
          const { width, height } = page.getSize();
          const text = isRunningHeader ? settings.headerTextMode === "double" && index % 2 === 1 ? settings.evenHeaderText : settings.headerText : getPageNumberText(settings, numberingIndex);
          const position = getPageNumberPosition(isRunningHeader ? "top-center" : getPageNumberPositionForPage(settings, index), width, height, settings.fontSize);
          const textWidth = font.widthOfTextAtSize(text, settings.fontSize);
          const x = position.align === "left" ? position.x : position.align === "right" ? position.x - textWidth : position.x - textWidth / 2;
          if (text) page.drawText(text, { x, y: position.y, size: settings.fontSize, font, color: rgb(0, 0, 0) });
          if (isRunningHeader) {
            const ruleY = height - Math.max(12, settings.fontSize);
            const ruleColor = rgb(0, 0, 0);
            if (settings.headerRulePosition === "above" || settings.headerRulePosition === "both") page.drawLine({ start: { x: 24, y: ruleY + settings.fontSize + 8 }, end: { x: width - 24, y: ruleY + settings.fontSize + 8 }, thickness: 0.5, color: ruleColor });
            if (settings.headerRulePosition === "below" || settings.headerRulePosition === "both") page.drawLine({ start: { x: 24, y: ruleY - 6 }, end: { x: width - 24, y: ruleY - 6 }, thickness: 0.5, color: ruleColor });
          }
        }
        output.addPage(page);
      }
      const outputBytes = await output.save();
      await saveExport(outputBytes, `${file.name.replace(/\.pdf$/i, "")}_numbered.pdf`, "application/pdf");
    } catch (exportError) {
      console.error("Failed to export numbered PDF:", exportError);
      setError("Could not export the numbered PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="theme-page min-h-screen bg-[#07090e] p-4 text-zinc-200 antialiased sm:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-3 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-start"><div><h1 className="text-xl font-semibold text-zinc-100">Add page numbers</h1><p className="mt-1 text-sm text-zinc-400">Add page numbers to a PDF without changing its page order.</p></div><ThemeToggle /></header>
        <section className="space-y-4 rounded-xl border border-zinc-800/90 bg-[#0f1422] p-4 shadow-xl sm:p-5">
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => event.target.files?.[0] && loadFile(event.target.files[0])} />
          {!file ? <div onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files[0]) loadFile(event.dataTransfer.files[0]); }} className="cursor-pointer rounded-lg border border-dashed border-zinc-700 p-8 text-center hover:border-indigo-500/60 hover:bg-zinc-900/40 sm:p-10"><FileUp className="mx-auto mb-3 h-6 w-6 text-indigo-400" /><p className="text-sm font-medium text-zinc-200">Upload a PDF to add page numbers</p><p className="mt-1 text-xs text-zinc-500">The file stays in your browser.</p></div> : <div className="flex flex-col justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><FileCheck2 className="h-5 w-5 shrink-0 text-emerald-400" /><div className="min-w-0"><p className="truncate text-xs font-medium text-zinc-200">{file.name}</p><p className="text-[11px] text-zinc-500">{pages.length} pages loaded</p></div></div><div className="flex w-full items-center gap-2 sm:w-auto"><button type="button" onClick={exportPdf} disabled={exporting} className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 sm:flex-none">{exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Export numbered PDF</button><button type="button" onClick={clearFile} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800" title="Remove file"><X className="h-4 w-4" /></button></div></div>}
          {error && <p className="rounded-lg border border-red-700/60 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          {file && <PageNumberingPanel settings={settings} onChange={setSettings} pageCount={pages.length} />}
          {loading ? <div className="flex justify-center gap-2 p-8 text-sm text-zinc-300"><Loader2 className="h-4 w-4 animate-spin" />Preparing previews...</div> : pages.length > 0 && <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7">{pages.map((page, index) => { const numberingIndex = index - (settings.startPage - 1); const isRunningHeader = settings.position === "running-header"; const previewPosition = isRunningHeader ? "top-center" : getPageNumberPositionForPage(settings, numberingIndex); const headerText = settings.headerTextMode === "double" && index % 2 === 1 ? settings.evenHeaderText : settings.headerText; const horizontalClass = previewPosition.endsWith("left") ? "left-1" : previewPosition.endsWith("right") ? "right-1" : "left-1/2 -translate-x-1/2"; const verticalClass = previewPosition.startsWith("top") ? "top-1" : "bottom-1"; const shouldShow = settings.enabled && (isRunningHeader || numberingIndex >= 0); return <div key={index} className="relative overflow-hidden rounded-lg border border-zinc-800 bg-white"><img src={page.dataUrl} alt={`Page ${index + 1}`} className="h-32 w-full object-contain" />{shouldShow && <>{isRunningHeader && <>{(settings.headerRulePosition === "above" || settings.headerRulePosition === "both") && <span className="absolute left-1 right-1 top-0 border-t border-black" />}{(settings.headerRulePosition === "below" || settings.headerRulePosition === "both") && <span className="absolute left-1 right-1 top-4 border-t border-black" />}</>}<span className={`absolute ${verticalClass} ${horizontalClass} whitespace-nowrap text-[9px] text-black`} style={{ fontSize: Math.max(8, settings.fontSize / 2) }}>{isRunningHeader ? headerText : getPageNumberText(settings, numberingIndex)}</span></>}{<div className="bg-zinc-900 px-2 py-1 text-center text-[10px] font-mono text-zinc-400">Page {index + 1}</div>}</div>; })}</div>}
        </section>
      </div>
    </main>
  );
}
