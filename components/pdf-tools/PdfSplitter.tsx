"use client";

import { useRef, useState } from "react";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { Archive, Download, FileCheck2, FileUp, Loader2, X } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { createPdfSplitRanges, type PdfSplitRange } from "./pdfSplitUtils";

export default function PdfSplitter() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [interval, setInterval] = useState("10");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsedInterval = Number.parseInt(interval, 10);
  const ranges = createPdfSplitRanges(pageCount, parsedInterval);

  const loadFile = async (nextFile: File) => {
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a valid PDF file.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const sourceBytes = await nextFile.arrayBuffer();
      const document = await PDFDocument.load(sourceBytes);
      setFile(nextFile);
      setBytes(sourceBytes);
      setPageCount(document.getPageCount());
    } catch (loadError) {
      console.error("Failed to read PDF:", loadError);
      setError("Could not read the PDF. Please try another file.");
      clearFile();
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clearFile = () => {
    setFile(null);
    setBytes(null);
    setPageCount(0);
    setError(null);
  };

  const createSplitPdf = async (source: PDFDocument, range: PdfSplitRange) => {
    const output = await PDFDocument.create();
    const pages = await output.copyPages(
      source,
      Array.from({ length: range.end - range.start + 1 }, (_, index) => range.start - 1 + index)
    );
    pages.forEach((page) => output.addPage(page));
    return output.save();
  };

  const exportZip = async () => {
    if (!file || !bytes || !ranges.length) return;

    setExporting(true);
    setError(null);
    try {
      const source = await PDFDocument.load(bytes);
      const zip = new JSZip();
      const baseName = file.name.replace(/\.pdf$/i, "");

      for (const range of ranges) {
        const splitBytes = await createSplitPdf(source, range);
        zip.file(`${baseName}_${range.label}.pdf`, splitBytes);
      }

      const zipBytes = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBytes);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${baseName}_split.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error("Failed to export split PDFs:", exportError);
      setError("Could not create the ZIP file. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="theme-page min-h-screen bg-[#07090e] p-4 text-zinc-200 antialiased sm:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-3 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3"><div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400"><Archive className="h-5 w-5" /></div><h1 className="text-xl font-semibold text-zinc-100">Split PDF</h1></div>
            <p className="mt-1 text-sm text-zinc-400">Split a PDF into page ranges and download them as one ZIP.</p>
          </div>
          <ThemeToggle />
        </header>

        <section className="space-y-4 rounded-xl border border-zinc-800/90 bg-[#0f1422] p-4 shadow-xl sm:p-5">
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => event.target.files?.[0] && loadFile(event.target.files[0])} />
          {!file ? (
            <div onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files[0]) loadFile(event.dataTransfer.files[0]); }} className="cursor-pointer rounded-lg border border-dashed border-zinc-700 p-10 text-center hover:border-cyan-500/60 hover:bg-zinc-900/40">
              <FileUp className="mx-auto mb-3 h-6 w-6 text-cyan-400" />
              <p className="text-sm font-medium text-zinc-200">Upload a PDF to split</p>
              <p className="mt-1 text-xs text-zinc-500">The file stays in your browser.</p>
            </div>
          ) : (
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3"><FileCheck2 className="h-5 w-5 text-emerald-400" /><div><p className="text-xs font-medium text-zinc-200">{file.name}</p><p className="text-[11px] text-zinc-500">{pageCount} pages detected</p></div></div>
              <div className="flex w-full items-center gap-2 sm:w-auto"><button type="button" onClick={exportZip} disabled={exporting || !ranges.length} className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50 sm:flex-none">{exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Export ZIP</button><button type="button" onClick={clearFile} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800" title="Remove file"><X className="h-4 w-4" /></button></div>
            </div>
          )}

          {error && <p className="rounded-lg border border-red-700/60 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <label className="block w-full max-w-xs text-xs text-zinc-400">Pages per split file
            <input type="number" min={1} step={1} value={interval} onChange={(event) => setInterval(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700/70 bg-[#0a0d17] px-3.5 py-2.5 font-mono text-sm text-zinc-100 outline-none focus:border-cyan-500" placeholder="10" />
          </label>
        </section>

        {loading ? <div className="flex justify-center gap-2 rounded-xl border border-zinc-800 bg-[#0f1422] p-8 text-sm text-zinc-300"><Loader2 className="h-4 w-4 animate-spin" />Reading PDF...</div> : file && <SplitRangeList ranges={ranges} />}
      </div>
    </main>
  );
}

function SplitRangeList({ ranges }: { ranges: PdfSplitRange[] }) {
  return <section className="rounded-xl border border-zinc-800 bg-[#0f1422] p-4 shadow-xl sm:p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-zinc-200">Split preview</h2><p className="mt-1 text-xs text-zinc-500">{ranges.length} PDF files will be created.</p></div><Archive className="h-5 w-5 text-cyan-400" /></div>{ranges.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ranges.map((range, index) => <div key={range.label} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5"><span className="font-mono text-sm text-zinc-200">{range.label}</span><span className="text-[11px] text-zinc-500">Part {index + 1}</span></div>)}</div> : <p className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">Enter a positive split interval.</p>}</section>;
}
