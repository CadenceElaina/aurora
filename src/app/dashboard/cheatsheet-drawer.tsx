"use client";

import { useEffect, useRef, useState } from "react";
import type { Cheatsheet } from "@/lib/cheatsheets";
import { CheatsheetExpanded } from "@/app/cheatsheets/cheatsheets-client";

export function CheatsheetDrawer({
  sheets,
  onClose,
}: {
  sheets: Cheatsheet[];
  onClose: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Small delay so the button click that opened it doesn't immediately close it
    const id = setTimeout(() => document.addEventListener("mousedown", onClick), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  const active = sheets[activeIdx] ?? sheets[0];
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[52] pointer-events-none [will-change:transform]">
      {/* Backdrop — near-transparent; bg forces GPU compositing layer above scroll containers */}
      <div
        className="absolute inset-0 pointer-events-auto bg-black/[0.01]"
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 h-full w-full max-w-md pointer-events-auto
                   flex flex-col border-l border-border bg-background shadow-2xl
                   animate-in slide-in-from-right-8 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 shrink-0">
          <div>
            <span className="text-sm font-medium text-foreground">Pattern cheatsheets</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Quick references for your {sheets.length} review {sheets.length === 1 ? "category" : "categories"} today
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close cheatsheets"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab strip — scrollable if many categories */}
        {sheets.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-b border-border/60 px-3 py-2 shrink-0 scrollbar-none">
            {sheets.map((s, i) => (
              <button
                key={s.category}
                onClick={() => setActiveIdx(i)}
                className={`shrink-0 rounded px-2.5 py-1 text-xs transition-colors ${
                  i === activeIdx
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {s.category}
              </button>
            ))}
          </div>
        )}

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <CheatsheetExpanded sheet={active} />
        </div>
      </div>
    </div>
  );
}
