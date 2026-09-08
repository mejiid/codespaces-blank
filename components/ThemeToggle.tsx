"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Check, Cloud, Moon, Sun } from "lucide-react";

type Mood = "midnight" | "paper" | "slate";

const moods: { id: Mood; label: string; icon: typeof Moon }[] = [
  { id: "midnight", label: "Midnight", icon: Moon },
  { id: "paper", label: "Paper", icon: Sun },
  { id: "slate", label: "Slate", icon: Cloud },
];

const moodChangeEvent = "booklet-studio-mood-change";

const getMidnightMood = (): Mood => "midnight";

const subscribeToHydration = (): (() => void) => () => {};

function getSavedMood(): Mood {
  if (typeof window === "undefined") return "midnight";
  const saved = window.localStorage.getItem("booklet-studio-mood");
  return saved === "paper" || saved === "slate" || saved === "midnight" ? saved : "midnight";
}

function subscribeToMood(listener: () => void): () => void {
  window.addEventListener(moodChangeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(moodChangeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function saveMood(nextMood: Mood): void {
  window.localStorage.setItem("booklet-studio-mood", nextMood);
  window.dispatchEvent(new Event(moodChangeEvent));
}

export default function ThemeToggle() {
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const mood = useSyncExternalStore(
    subscribeToMood,
    isHydrated ? getSavedMood : getMidnightMood,
    getMidnightMood
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-mood", mood);
  }, [mood]);

  return (
    <div className="mood-selector" aria-label="Choose visual mood">
      {moods.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => saveMood(id)} className={`mood-option ${mood === id ? "is-active" : ""}`} aria-pressed={mood === id} title={`${label} mood`}>
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
          {mood === id && <Check className="h-3 w-3" />}
        </button>
      ))}
    </div>
  );
}
