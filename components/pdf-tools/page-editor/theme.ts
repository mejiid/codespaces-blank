export type AppTheme = "dark" | "light";

export interface ThemeTokens {
  isDark: boolean;
  shellClass: string;
  panelClass: string;
  mutedTextClass: string;
  subtleTextClass: string;
  actionClass: string;
  tableHeaderClass: string;
}

/** Shared Tailwind class tokens so panels stay consistent across light/dark themes. */
export function getThemeTokens(isDark: boolean): ThemeTokens {
  return {
    isDark,
    shellClass: isDark
      ? "bg-[#07090e] text-zinc-200"
      : "bg-slate-100 text-slate-800",
    panelClass: isDark
      ? "bg-[#0f1422] border-zinc-800/90"
      : "bg-white border-slate-200 shadow-[0_14px_30px_rgba(15,23,42,0.08)]",
    mutedTextClass: isDark ? "text-zinc-400" : "text-slate-500",
    subtleTextClass: isDark ? "text-zinc-500" : "text-slate-400",
    actionClass: isDark
      ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
      : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700",
    tableHeaderClass: isDark
      ? "bg-zinc-900/60 text-zinc-400 border-zinc-800"
      : "bg-slate-100 text-slate-500 border-slate-200",
  };
}