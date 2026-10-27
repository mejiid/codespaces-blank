"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ArrowDown, ArrowUp, Combine, Download, FileCheck2, FileUp, Loader2, X } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { mergePdfBytes } from "./pdfMergeUtils";
import { saveExport } from "./saveExport";

interface MergeFile {
  id: string;
  file: File;
  bytes: ArrayBuffer;
  pageCount: number;
}

export default function PdfMerger() {
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalPages = files.reduce((sum, item) => sum + item.pageCount, 0);

  const addFiles = async (nextFiles: FileList | File[]) => {
    const candidates = Array.from(nextFiles);
    if (!candidates.length) return;

    setLoading(true);
    setError(null);
    try {
      const loaded: MergeFile[] = [];
      for (const nextFile of candidates) {
        if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
          throw new Error(`"${nextFile.name}" is not a valid PDF.`);
        }
        const bytes = await nextFile.arrayBuffer();
        const document = await PDFDocument.load(bytes.slice(0));
        loaded.push({
          id: `${nextFile.name}-${nextFile.size}-${nextFile.lastModified}-${crypto.randomUUID()}`,
          file: nextFile,
          bytes,
          pageCount: document.getPageCount(),
        });
      }
      setFiles((current) => [...current, ...loaded]);
    } catch (loadError) {
      console.error("Failed to read PDF:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Could not read one of the PDFs. Please try again.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    setFiles((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((item) => item.id !== id));
  };

  const exportMerged = async () => {
    if (files.length < 2) {
      setError("Add at least two PDFs to merge.");
      return;
    }

    setExporting(true);
    setError(null);
    try {
      const merged = await mergePdfBytes(files.map((item) => item.bytes));
      const baseName = files[0].file.name.replace(/\.pdf$/i, "");
      await saveExport(merged, `${baseName}_merged.pdf`, "application/pdf");
    } catch (exportError) {
      console.error("Failed to merge PDFs:", exportError);
      setError("Could not merge the PDFs. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="theme-page min-h-screen bg-[#07090e] p-4 text-zinc-200 antialiased sm:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-3 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400">
                <Combine className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold text-zinc-100">Merge PDFs</h1>
            </div>
            <p className="mt-1 text-sm text-zinc-400">Combine several PDFs into one file, in the order you choose.</p>
          </div>
          <ThemeToggle />
        </header>

        <section className="space-y-4 rounded-xl border border-zinc-800/90 bg-[#0f1422] p-4 shadow-xl sm:p-5">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(event) => event.target.files && addFiles(event.target.files)}
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
            }}
            className="cursor-pointer rounded-lg border border-dashed border-zinc-700 p-10 text-center hover:border-cyan-500/60 hover:bg-zinc-900/40"
          >
            <FileUp className="mx-auto mb-3 h-6 w-6 text-cyan-400" />
            <p className="text-sm font-medium text-zinc-200">Upload PDFs to merge</p>
            <p className="mt-1 text-xs text-zinc-500">Drop several files, or click to add more. They stay in your browser.</p>
          </div>

          {files.length > 0 && (
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-xs font-medium text-zinc-200">{files.length} files ready</p>
                  <p className="text-[11px] text-zinc-500">{totalPages} pages in merge order</p>
                </div>
              </div>
              <button
                type="button"
                onClick={exportMerged}
                disabled={exporting || files.length < 2}
                className="flex min-h-9 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Merge PDF
              </button>
            </div>
          )}

          {error && <p className="rounded-lg border border-red-700/60 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        </section>

        {loading ? (
          <div className="flex justify-center gap-2 rounded-xl border border-zinc-800 bg-[#0f1422] p-8 text-sm text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading PDFs...
          </div>
        ) : (
          files.length > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-[#0f1422] p-4 shadow-xl sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">Merge order</h2>
                  <p className="mt-1 text-xs text-zinc-500">Files are joined from top to bottom.</p>
                </div>
                <Combine className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="space-y-2">
                {files.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-200">{item.file.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {item.pageCount} pages · Part {index + 1}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveFile(index, -1)} disabled={index === 0} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30" title="Move up">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30" title="Move down">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeFile(item.id)} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800" title="Remove file">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        )}
      </div>
    </main>
  );
}
