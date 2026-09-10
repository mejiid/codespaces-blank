"use client";

import { Check } from "lucide-react";

export type PageNumberPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type PageNumberPlacement = PageNumberPosition | "alternating" | "running-header";
export type PageNumberFormat = "arabic" | "roman-lower" | "roman-upper";
export type HeaderTextMode = "single" | "double";
export type HeaderRulePosition = "above" | "below" | "both";

export interface PageNumberSettings {
  enabled: boolean;
  startPage: number;
  startNumber: number;
  format: PageNumberFormat;
  headerText: string;
  evenHeaderText: string;
  headerTextMode: HeaderTextMode;
  headerRulePosition: HeaderRulePosition;
  position: PageNumberPlacement;
  oddPagePosition: PageNumberPosition;
  evenPagePosition: PageNumberPosition;
  fontSize: number;
  prefix: string;
  suffix: string;
}

interface PageNumberingPanelProps {
  settings: PageNumberSettings;
  onChange: (settings: PageNumberSettings) => void;
  pageCount: number;
}

export const defaultPageNumberSettings: PageNumberSettings = {
  enabled: false,
  startPage: 1,
  startNumber: 1,
  format: "arabic",
  headerText: "",
  evenHeaderText: "",
  headerTextMode: "single",
  headerRulePosition: "both",
  position: "bottom-center",
  oddPagePosition: "top-right",
  evenPagePosition: "top-left",
  fontSize: 12,
  prefix: "",
  suffix: "",
};

export function getPageNumberText(settings: PageNumberSettings, index: number) {
  const number = settings.startNumber + index;
  const roman = toRoman(number);
  const formattedNumber = settings.format === "arabic" ? String(number) : settings.format === "roman-lower" ? roman.toLowerCase() : roman;
  return `${settings.prefix}${formattedNumber}${settings.suffix}`;
}

function toRoman(number: number) {
  if (number <= 0) return String(number);
  const values: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = number;
  let result = "";
  for (const [value, symbol] of values) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

export function getPageNumberPositionForPage(settings: PageNumberSettings, index: number) {
  if (settings.position === "alternating") return index % 2 === 0 ? settings.oddPagePosition : settings.evenPagePosition;
  if (settings.position === "running-header") return "top-center";
  return settings.position;
}

export function getPageNumberPosition(position: PageNumberPosition, width: number, height: number, fontSize: number) {
  const margin = Math.max(18, fontSize * 1.5);
  const isTop = position.startsWith("top");
  const horizontal = position.endsWith("left")
    ? margin
    : position.endsWith("right")
      ? width - margin
      : width / 2;

  return {
    x: horizontal,
    y: isTop ? height - margin : margin,
    align: position.endsWith("left") ? "left" : position.endsWith("right") ? "right" : "center",
  } as const;
}

export default function PageNumberingPanel({ settings, onChange, pageCount }: PageNumberingPanelProps) {
  const update = (patch: Partial<PageNumberSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#090b12] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Page numbers</h2>
          <p className="mt-1 text-xs text-zinc-500">Numbers follow the final exported page order.</p>
        </div>
        <button
          type="button"
          onClick={() => update({ enabled: !settings.enabled })}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${settings.enabled ? "border-indigo-500/50 bg-indigo-600 text-white" : "border-zinc-700 bg-zinc-800 text-zinc-300"}`}
        >
          {settings.enabled && <Check className="h-3.5 w-3.5" />}
          {settings.enabled ? "Enabled" : "Enable"}
        </button>
      </div>

      {settings.enabled && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs text-zinc-400">Start numbering at page
            <input type="number" min={1} max={pageCount || undefined} value={settings.startPage} onChange={(event) => update({ startPage: Math.min(pageCount || 1, Math.max(1, Number(event.target.value) || 1)) })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500" />
          </label>
          <label className="text-xs text-zinc-400">Start number
            <input type="number" min={0} value={settings.startNumber} onChange={(event) => update({ startNumber: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500" />
          </label>
          <label className="text-xs text-zinc-400">Number format
            <select value={settings.format} onChange={(event) => update({ format: event.target.value as PageNumberFormat })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500">
              <option value="arabic">Arabic (1, 2, 3)</option>
              <option value="roman-lower">Roman lowercase (i, ii, iii)</option>
              <option value="roman-upper">Roman uppercase (I, II, III)</option>
            </select>
          </label>
          <label className="text-xs text-zinc-400">Position
            <select value={settings.position} onChange={(event) => update({ position: event.target.value as PageNumberPlacement })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500">
              <option value="top-left">Top left</option>
              <option value="top-center">Top center</option>
              <option value="top-right">Top right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-center">Bottom center</option>
              <option value="bottom-right">Bottom right</option>
              <option value="alternating">Alternate odd/even</option>
            </select>
          </label>
          {settings.position === "alternating" && <>
            <label className="text-xs text-zinc-400">Odd pages
              <select value={settings.oddPagePosition} onChange={(event) => update({ oddPagePosition: event.target.value as PageNumberPosition })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500">
                <option value="top-left">Top left</option>
                <option value="top-center">Top center</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-center">Bottom center</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </label>
            <label className="text-xs text-zinc-400">Even pages
              <select value={settings.evenPagePosition} onChange={(event) => update({ evenPagePosition: event.target.value as PageNumberPosition })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500">
                <option value="top-left">Top left</option>
                <option value="top-center">Top center</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-center">Bottom center</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </label>
          </>}
          {settings.position === "running-header" && <>
            <label className="text-xs text-zinc-400">Header text mode
              <select value={settings.headerTextMode} onChange={(event) => update({ headerTextMode: event.target.value as HeaderTextMode })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500">
                <option value="single">Single text on every page</option>
                <option value="double">Two alternating texts</option>
              </select>
            </label>
            <label className="text-xs text-zinc-400">Header text
              <input value={settings.headerText} onChange={(event) => update({ headerText: event.target.value })} placeholder="Atomic Habits" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500" />
            </label>
            {settings.headerTextMode === "double" && <label className="text-xs text-zinc-400">Even-page text
              <input value={settings.evenHeaderText} onChange={(event) => update({ evenHeaderText: event.target.value })} placeholder="James Clear" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500" />
            </label>}
            <label className="text-xs text-zinc-400">Rules
              <select value={settings.headerRulePosition} onChange={(event) => update({ headerRulePosition: event.target.value as HeaderRulePosition })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500">
                <option value="above">Above text</option>
                <option value="below">Below text</option>
                <option value="both">Above and below</option>
              </select>
            </label>
          </>}
          <label className="text-xs text-zinc-400">Font size
            <input type="number" min={6} max={72} value={settings.fontSize} onChange={(event) => update({ fontSize: Math.min(72, Math.max(6, Number(event.target.value) || 12)) })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500" />
          </label>
          <label className="text-xs text-zinc-400">Prefix
            <input value={settings.prefix} onChange={(event) => update({ prefix: event.target.value })} placeholder="Page " className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500" />
          </label>
          <label className="text-xs text-zinc-400">Suffix
            <input value={settings.suffix} onChange={(event) => update({ suffix: event.target.value })} placeholder=" / 10" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500" />
          </label>
        </div>
      )}
      {settings.enabled && <p className="mt-3 text-[11px] text-zinc-600">{Math.max(0, pageCount - settings.startPage + 1)} page numbers will be added when exported.</p>}
    </div>
  );
}
