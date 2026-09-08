"use client";

import { useEffect, useState } from "react";
import { Check, Cloud, Moon, Sun } from "lucide-react";

type Mood = "midnight" | "paper" | "slate";

const moods: { id: Mood; label: string; icon: typeof Moon }[] = [
  { id: "midnight", label: "Midnight", icon: Moon },
  { id: "paper", label: "Paper", icon: Sun },
  { id: "slate", label: "Slate", icon: Cloud },
];

export default function ThemeToggle() {
  const [mood, setMood] = useState<Mood>(() => {
    if (typeof window === "undefined") return "midnight";
    const saved = window.localStorage.getItem("booklet-studio-mood");
    return saved === "paper" || saved === "slate" || saved === "midnight" ? saved : "midnight";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-mood", mood);
    window.localStorage.setItem("booklet-studio-mood", mood);
  }, [mood]);

  return (
    <div className="mood-selector" aria-label="Choose visual mood">
      {moods.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => setMood(id)} className={`mood-option ${mood === id ? "is-active" : ""}`} aria-pressed={mood === id} title={`${label} mood`}>
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
          {mood === id && <Check className="h-3 w-3" />}
        </button>
      ))}
    </div>
  );
}
