"use client";

import { Check } from "lucide-react";

export type PageNumberPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export interface PageNumberSettings {
  enabled: boolean;
  startNumber: number;
  position: PageNumberPosition;
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
  startNumber: 1,
  position: "bottom-center",
  fontSize: 12,
  prefix: "",
  suffix: "",
};

export function getPageNumberText(settings: PageNumberSettings, index: number) {
  return `${settings.prefix}${settings.startNumber + index}${settings.suffix}`;
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
          <label className="text-xs text-zinc-400">Start number
            <input type="number" min={0} value={settings.startNumber} onChange={(event) => update({ startNumber: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500" />
          </label>
          <label className="text-xs text-zinc-400">Position
            <select value={settings.position} onChange={(event) => update({ position: event.target.value as PageNumberPosition })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500">
              <option value="top-left">Top left</option>
              <option value="top-center">Top center</option>
              <option value="top-right">Top right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-center">Bottom center</option>
              <option value="bottom-right">Bottom right</option>
            </select>
          </label>
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
      {settings.enabled && <p className="mt-3 text-[11px] text-zinc-600">{pageCount} page numbers will be added when exported.</p>}
    </div>
  );
}
