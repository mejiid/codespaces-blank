"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDocument, rgb } from "pdf-lib";
import {
  Layers,
  Copy,
  Check,
  Download,
  FileUp,
  FileCheck2,
  Table as TableIcon,
  LayoutGrid,
  FileCode,
  Printer,
  Sparkles,
  Scissors,
  Loader2,
  AlertCircle,
  X,
  Sun,
  Moon,
} from "lucide-react";

// --- Types & Interfaces ---
interface PageNode {
  logicalPageNumber: number | null; // null represents a [Blank] page
  isCover?: boolean;
}

interface SheetSide {
  left: PageNode;
  right: PageNode;
}

interface ImposedSheet {
  sheetNumber: number;
  front: SheetSide;
  back: SheetSide;
}

interface ImpositionSummary {
  startPage: number;
  endPage: number;
  rawPageCount: number;
  paddedPageCount: number;
  blankPagesAdded: number;
  totalSheets: number;
  sheets: ImposedSheet[];
  printSequenceText: string;
}

type ViewMode = "cards" | "table" | "sequence";

// --- Saddle-Stitch Calculator ---
function calculateBookletImposition(
  input: string,
  maxAllowed?: number
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

    sheets.push({
      sheetNumber: i,
      front: {
        left: getPageNode(frontLeftIdx),
        right: getPageNode(frontRightIdx),
      },
      back: {
        left: getPageNode(backLeftIdx),
        right: getPageNode(backRightIdx),
      },
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

export default function BookletStudioPage() {
  const [inputVal, setInputVal] = useState<string>("1-16");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("booklet-studio-theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const nextTheme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : prefersLight
        ? "light"
        : "dark";

    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("booklet-studio-theme", theme);
  }, [theme]);

  const isDark = theme === "dark";
  const shellClass = isDark
    ? "bg-[#07090e] text-zinc-200"
    : "bg-slate-100 text-slate-800";
  const panelClass = isDark
    ? "bg-[#0f1422] border-zinc-800/90"
    : "bg-white border-slate-200 shadow-[0_14px_30px_rgba(15,23,42,0.08)]";
  const softPanelClass = isDark
    ? "bg-[#0a0d17] border-zinc-700/70"
    : "bg-slate-50 border-slate-200";
  const mutedTextClass = isDark ? "text-zinc-400" : "text-slate-500";
  const subtleTextClass = isDark ? "text-zinc-500" : "text-slate-400";
  const cardClass = isDark ? "bg-[#07090e] border-zinc-800/80" : "bg-slate-50 border-slate-200";
  const actionClass = isDark
    ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700";
  const tableHeaderClass = isDark
    ? "bg-zinc-900/60 text-zinc-400 border-zinc-800"
    : "bg-slate-100 text-slate-500 border-slate-200";

  // PDF File Upload State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [addFoldLine, setAddFoldLine] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = ["1-8", "1-12", "1-16", "1-20", "1-24", "1-32"];

  const imposition = useMemo(() => {
    return calculateBookletImposition(inputVal, pdfTotalPages || undefined);
  }, [inputVal, pdfTotalPages]);

  // Handle PDF Upload
  const handleFileUpload = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      alert("Please upload a valid PDF document.");
      return;
    }
    setIsProcessingPdf(true);
    try {
      const buffer = await file.arrayBuffer();
      const loadedDoc = await PDFDocument.load(buffer);
      const pageCount = loadedDoc.getPageCount();

      setPdfFile(file);
      setPdfBuffer(buffer);
      setPdfTotalPages(pageCount);
      setInputVal(`1-${pageCount}`);
    } catch (err) {
      console.error("Failed to read PDF:", err);
      alert("Could not read PDF. Make sure it is not password protected.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const removeUploadedPdf = () => {
    setPdfFile(null);
    setPdfBuffer(null);
    setPdfTotalPages(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Generate & Download the Imposed PDF
  const handleGenerateBookletPdf = async () => {
    if (!pdfBuffer || !imposition) return;
    setIsProcessingPdf(true);

    try {
      const srcDoc = await PDFDocument.load(pdfBuffer);
      const outDoc = await PDFDocument.create();

      // Read reference dimensions from the first page
      const firstPage = srcDoc.getPage(0);
      const { width: pWidth, height: pHeight } = firstPage.getSize();
      const sheetWidth = pWidth * 2;
      const sheetHeight = pHeight;

      for (const sheet of imposition.sheets) {
        // --- Side A (Front) ---
        const frontPage = outDoc.addPage([sheetWidth, sheetHeight]);

        // Left Page
        if (sheet.front.left.logicalPageNumber !== null) {
          const srcIdx = sheet.front.left.logicalPageNumber - 1;
          if (srcIdx < srcDoc.getPageCount()) {
            const [embedded] = await outDoc.embedPages([srcDoc.getPage(srcIdx)]);
            frontPage.drawPage(embedded, {
              x: 0,
              y: 0,
              width: pWidth,
              height: pHeight,
            });
          }
        }
        // Right Page
        if (sheet.front.right.logicalPageNumber !== null) {
          const srcIdx = sheet.front.right.logicalPageNumber - 1;
          if (srcIdx < srcDoc.getPageCount()) {
            const [embedded] = await outDoc.embedPages([srcDoc.getPage(srcIdx)]);
            frontPage.drawPage(embedded, {
              x: pWidth,
              y: 0,
              width: pWidth,
              height: pHeight,
            });
          }
        }
        // Center fold guideline
        if (addFoldLine) {
          frontPage.drawLine({
            start: { x: pWidth, y: 15 },
            end: { x: pWidth, y: sheetHeight - 15 },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
            dashArray: [3, 3],
          });
        }

        // --- Side B (Back) ---
        const backPage = outDoc.addPage([sheetWidth, sheetHeight]);

        // Left Page
        if (sheet.back.left.logicalPageNumber !== null) {
          const srcIdx = sheet.back.left.logicalPageNumber - 1;
          if (srcIdx < srcDoc.getPageCount()) {
            const [embedded] = await outDoc.embedPages([srcDoc.getPage(srcIdx)]);
            backPage.drawPage(embedded, {
              x: 0,
              y: 0,
              width: pWidth,
              height: pHeight,
            });
          }
        }
        // Right Page
        if (sheet.back.right.logicalPageNumber !== null) {
          const srcIdx = sheet.back.right.logicalPageNumber - 1;
          if (srcIdx < srcDoc.getPageCount()) {
            const [embedded] = await outDoc.embedPages([srcDoc.getPage(srcIdx)]);
            backPage.drawPage(embedded, {
              x: pWidth,
              y: 0,
              width: pWidth,
              height: pHeight,
            });
          }
        }
        if (addFoldLine) {
          backPage.drawLine({
            start: { x: pWidth, y: 15 },
            end: { x: pWidth, y: sheetHeight - 15 },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
            dashArray: [3, 3],
          });
        }
      }

      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${pdfFile?.name.replace(".pdf", "")}_booklet_imposed.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Imposition error:", err);
      alert("An error occurred during PDF generation.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const exportCSV = () => {
    if (!imposition) return;
    const headers = [
      "Sheet #",
      "Front Left",
      "Front Right",
      "Back Left",
      "Back Right",
    ];
    const rows = imposition.sheets.map((s) => [
      s.sheetNumber,
      s.front.left.logicalPageNumber ?? "[Blank]",
      s.front.right.logicalPageNumber ?? "[Blank]",
      s.back.left.logicalPageNumber ?? "[Blank]",
      s.back.right.logicalPageNumber ?? "[Blank]",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `imposition_matrix_${imposition.startPage}-${imposition.endPage}.csv`
    );
    link.click();
  };

  return (
    <div className={`min-h-screen antialiased font-sans flex flex-col items-center p-4 sm:p-8 selection:bg-indigo-500/30 selection:text-indigo-200 transition-colors duration-200 ${shellClass}`}>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.12),rgba(255,255,255,0))]" />

      <main className="w-full max-w-5xl z-10 space-y-6">
        <header className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b ${isDark ? "border-zinc-800/80" : "border-slate-200"}`}>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className={`text-xl font-semibold tracking-tight ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                Booklet Imposition Studio
              </h1>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${isDark ? "bg-zinc-800/80 border-zinc-700/60 text-zinc-400" : "bg-slate-200 border-slate-300 text-slate-600"}`}>
                Next.js Edition
              </span>
            </div>
            <p className={`text-sm mt-1 ${mutedTextClass}`}>
              Impose, calculate, and convert PDF documents into print-ready 2-up saddle-stitch booklets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isDark
                  ? "bg-zinc-900/90 border-zinc-800 text-zinc-200"
                  : "bg-white border-slate-200 text-slate-700"
              }`}
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? "Light" : "Dark"} mood</span>
            </button>

            {imposition && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border ${isDark ? "bg-zinc-900/90 border-zinc-800 text-zinc-300" : "bg-white border-slate-200 text-slate-700"}`}>
                  <Printer className={`w-3.5 h-3.5 ${mutedTextClass}`} />
                  <span>
                    {imposition.totalSheets}{" "}
                    {imposition.totalSheets === 1 ? "Sheet" : "Sheets"}
                  </span>
                </div>
                <div className={`px-3 py-1.5 rounded-md border ${isDark ? "bg-zinc-900/90 border-zinc-800 text-zinc-400" : "bg-white border-slate-200 text-slate-500"}`}>
                  Duplex Landscape
                </div>
              </div>
            )}
          </div>
        </header>

        <section className={`p-4 sm:p-5 rounded-xl border shadow-xl space-y-4 ${panelClass}`}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
            accept="application/pdf"
            className="hidden"
          />

          {!pdfFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`cursor-pointer border border-dashed transition-all rounded-lg p-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left ${
                isDark
                  ? "border-zinc-700 hover:border-indigo-500/60 hover:bg-zinc-900/40"
                  : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
              }`}
            >
              <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-sm font-medium ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                  Drop your PDF here or click to browse
                </p>
                <p className={`text-xs mt-0.5 ${subtleTextClass}`}>
                  100% client-side. The file never leaves your browser.
                </p>
              </div>
            </div>
          ) : (
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg border ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className={`text-xs font-mono font-medium truncate max-w-xs sm:max-w-md ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                    {pdfFile.name}
                  </p>
                  <p className={`text-[11px] font-mono ${subtleTextClass}`}>
                    {pdfTotalPages} Pages Detected • Ready for Imposition
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className={`flex items-center gap-2 text-xs font-mono cursor-pointer select-none mr-2 ${mutedTextClass}`}>
                  <input
                    type="checkbox"
                    checked={addFoldLine}
                    onChange={(e) => setAddFoldLine(e.target.checked)}
                    className={`rounded focus:ring-0 cursor-pointer ${isDark ? "border-zinc-700 bg-zinc-800 text-indigo-600" : "border-slate-300 bg-white text-indigo-600"}`}
                  />
                  <Scissors className={`w-3.5 h-3.5 ${mutedTextClass}`} />
                  <span>Fold Line</span>
                </label>

                <button
                  onClick={handleGenerateBookletPdf}
                  disabled={isProcessingPdf}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                >
                  {isProcessingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Imposing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Imposed PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={removeUploadedPdf}
                  className={`p-1.5 rounded-md transition-colors ${isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"}`}
                  title="Remove File"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pt-2">
            <div className="flex-1 flex items-center gap-3">
              <div className="relative flex-1">
                <label className={`text-[10px] font-mono uppercase tracking-wider absolute -top-2 left-2.5 px-1 ${isDark ? "text-zinc-400 bg-[#0f1422]" : "text-slate-500 bg-white"}`}>
                  Page Range
                </label>
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="e.g. 1-16 or 24"
                  className={`w-full font-mono text-sm px-3.5 py-2.5 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    isDark
                      ? "bg-[#0a0d17] text-zinc-100 border-zinc-700/70"
                      : "bg-white text-slate-800 border-slate-300"
                  }`}
                />
              </div>

              {imposition && imposition.blankPagesAdded > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>+{imposition.blankPagesAdded} Blank Pad</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className={`flex rounded-lg p-1 border ${isDark ? "bg-[#0a0d17] border-zinc-800" : "bg-slate-100 border-slate-200"}`}>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "cards"
                      ? isDark
                        ? "bg-zinc-800 text-zinc-100"
                        : "bg-white text-slate-900 shadow-sm"
                      : mutedTextClass + " hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Visual</span>
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "table"
                      ? isDark
                        ? "bg-zinc-800 text-zinc-100"
                        : "bg-white text-slate-900 shadow-sm"
                      : mutedTextClass + " hover:text-slate-900"
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => setViewMode("sequence")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "sequence"
                      ? isDark
                        ? "bg-zinc-800 text-zinc-100"
                        : "bg-white text-slate-900 shadow-sm"
                      : mutedTextClass + " hover:text-slate-900"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Order</span>
                </button>
              </div>

              <button
                onClick={() =>
                  imposition && copyToClipboard(imposition.printSequenceText, "quick")
                }
                className={`p-2 rounded-lg border transition-colors ${actionClass}`}
                title="Copy Duplex Sequence"
              >
                {copiedKey === "quick" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={exportCSV}
                className={`p-2 rounded-lg border transition-colors ${actionClass}`}
                title="Export CSV Matrix"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className={`text-xs font-mono ${mutedTextClass}`}>Presets:</span>
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => setInputVal(preset)}
                className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all ${
                  inputVal === preset
                    ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-semibold"
                    : isDark
                      ? "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </section>

        {imposition ? (
          <AnimatePresence mode="wait">
            {viewMode === "cards" && (
              <motion.div
                key="cards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {imposition.sheets.map((sheet) => (
                  <SheetCard
                    key={sheet.sheetNumber}
                    sheet={sheet}
                    totalSheets={imposition.totalSheets}
                    isDark={isDark}
                  />
                ))}
              </motion.div>
            )}

            {viewMode === "table" && (
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`overflow-hidden rounded-xl border ${isDark ? "border-zinc-800 bg-[#0f1422]" : "border-slate-200 bg-white"}`}
              >
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className={`border-b text-[11px] font-mono uppercase ${tableHeaderClass}`}>
                      <th className="py-3 px-4">Sheet</th>
                      <th className={`py-3 px-4 border-l ${isDark ? "border-zinc-800" : "border-slate-200"}`} colSpan={2}>
                        Front Spread (Side A)
                      </th>
                      <th className={`py-3 px-4 border-l ${isDark ? "border-zinc-800" : "border-slate-200"}`} colSpan={2}>
                        Back Spread (Side B)
                      </th>
                    </tr>
                    <tr className={`border-b text-[10px] font-mono ${isDark ? "border-zinc-800/60 bg-zinc-900/30 text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      <th className="py-2 px-4 font-normal">Index</th>
                      <th className="py-2 px-4 font-normal">Index</th>
                      <th className={`py-2 px-4 font-normal border-l ${isDark ? "border-zinc-800/60" : "border-slate-200"}`}>Left</th>
                      <th className="py-2 px-4 font-normal">Right</th>
                      <th className={`py-2 px-4 font-normal border-l ${isDark ? "border-zinc-800/60" : "border-slate-200"}`}>Left</th>
                      <th className="py-2 px-4 font-normal">Right</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono text-xs ${isDark ? "divide-zinc-800/50" : "divide-slate-200"}`}>
                    {imposition.sheets.map((sheet) => (
                      <tr key={sheet.sheetNumber} className={isDark ? "hover:bg-zinc-800/30" : "hover:bg-slate-50"}>
                        <td className={`py-3 px-4 ${mutedTextClass}`}>Sheet {sheet.sheetNumber}</td>
                        <td className={`py-3 px-4 border-l ${isDark ? "border-zinc-800/50" : "border-slate-200"}`}>
                          <PageBadge node={sheet.front.left} compact isDark={isDark} />
                        </td>
                        <td className="py-3 px-4">
                          <PageBadge node={sheet.front.right} compact isDark={isDark} />
                        </td>
                        <td className={`py-3 px-4 border-l ${isDark ? "border-zinc-800/50" : "border-slate-200"}`}>
                          <PageBadge node={sheet.back.left} compact isDark={isDark} />
                        </td>
                        <td className="py-3 px-4">
                          <PageBadge node={sheet.back.right} compact isDark={isDark} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {viewMode === "sequence" && (
              <motion.div
                key="seq"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-6 rounded-xl border space-y-4 ${isDark ? "bg-[#0f1422] border-zinc-800" : "bg-white border-slate-200"}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-sm font-medium ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span>Formatted Duplex Sequence</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(imposition.printSequenceText, "seq")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono ${isDark ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
                  >
                    {copiedKey === "seq" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy String</span>
                  </button>
                </div>
                <div className={`p-4 rounded-lg border font-mono text-xs break-words leading-relaxed ${isDark ? "bg-[#07090e] border-zinc-800 text-indigo-300" : "bg-slate-50 border-slate-200 text-indigo-700"}`}>
                  {imposition.printSequenceText}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <div className={`p-12 text-center rounded-xl border border-dashed ${isDark ? "bg-[#0f1422] border-zinc-800 text-zinc-400" : "bg-white border-slate-200 text-slate-500"}`}>
            <AlertCircle className={`w-7 h-7 mx-auto mb-2 ${isDark ? "text-zinc-500" : "text-slate-400"}`} />
            <p className="text-sm">Invalid page range. Please input a valid range (e.g. 1-16).</p>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Visual Helpers ---

function SheetCard({
  sheet,
  totalSheets,
  isDark,
}: {
  sheet: ImposedSheet;
  totalSheets: number;
  isDark: boolean;
}) {
  return (
    <div className={`p-4 sm:p-5 rounded-xl border shadow-md space-y-4 ${isDark ? "bg-[#0f1422] border-zinc-800/90" : "bg-white border-slate-200"}`}>
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
            Sheet {sheet.sheetNumber}
          </span>
          <span className={isDark ? "text-zinc-500" : "text-slate-400"}>of {totalSheets}</span>
        </div>
        {sheet.sheetNumber === 1 && (
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
            Outer Cover
          </span>
        )}
        {sheet.sheetNumber === totalSheets && (
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-violet-500/10 border border-violet-500/30 text-violet-300">
            Center Fold
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-3 rounded-lg border space-y-2 ${isDark ? "bg-[#07090e] border-zinc-800/80" : "bg-slate-50 border-slate-200"}`}>
          <div className={`flex items-center justify-between text-[11px] font-mono ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
            <span>Side A (Front)</span>
            <span className={isDark ? "text-[10px] text-zinc-500" : "text-[10px] text-slate-400"}>Left & Right</span>
          </div>
          <SpreadVisual left={sheet.front.left} right={sheet.front.right} isDark={isDark} />
        </div>

        <div className={`p-3 rounded-lg border space-y-2 ${isDark ? "bg-[#07090e] border-zinc-800/80" : "bg-slate-50 border-slate-200"}`}>
          <div className={`flex items-center justify-between text-[11px] font-mono ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
            <span>Side B (Back)</span>
            <span className={isDark ? "text-[10px] text-zinc-500" : "text-[10px] text-slate-400"}>Left & Right</span>
          </div>
          <SpreadVisual left={sheet.back.left} right={sheet.back.right} isDark={isDark} />
        </div>
      </div>
    </div>
  );
}

function SpreadVisual({ left, right, isDark }: { left: PageNode; right: PageNode; isDark: boolean }) {
  return (
    <div className={`relative flex items-stretch h-24 rounded-md border overflow-hidden ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-slate-200"}`}>
      <div className="flex-1 flex flex-col justify-between p-2.5">
        <span className={isDark ? "text-[10px] font-mono text-zinc-500" : "text-[10px] font-mono text-slate-400"}>Left</span>
        <div className="self-center">
          <PageBadge node={left} isDark={isDark} />
        </div>
        <div className={`h-1.5 w-8 rounded-sm ${isDark ? "bg-zinc-800" : "bg-slate-200"}`} />
      </div>

      <div className={isDark ? "w-px bg-zinc-800 border-r border-dashed border-zinc-700/60" : "w-px bg-slate-200 border-r border-dashed border-slate-300"} />

      <div className="flex-1 flex flex-col justify-between p-2.5">
        <div className="flex justify-end">
          <span className={isDark ? "text-[10px] font-mono text-zinc-500" : "text-[10px] font-mono text-slate-400"}>Right</span>
        </div>
        <div className="self-center">
          <PageBadge node={right} isDark={isDark} />
        </div>
        <div className="flex justify-end">
          <div className={`h-1.5 w-8 rounded-sm ${isDark ? "bg-zinc-800" : "bg-slate-200"}`} />
        </div>
      </div>
    </div>
  );
}

function PageBadge({ node, compact, isDark }: { node: PageNode; compact?: boolean; isDark?: boolean }) {
  const darkMode = isDark ?? true;

  if (node.logicalPageNumber === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
        [Blank]
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-mono font-bold border shadow-sm ${
        darkMode ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-slate-100 text-slate-700 border-slate-200"
      } ${compact ? "px-2 py-0.5 text-xs rounded" : "px-2.5 py-1 text-sm rounded-md"}`}
    >
      Pg {node.logicalPageNumber}
    </span>
  );
}
