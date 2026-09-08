import type { ImposedSheet, PageNode } from "./types";

export function SheetCard({
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