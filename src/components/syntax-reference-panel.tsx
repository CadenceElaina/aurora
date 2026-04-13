"use client";

import { useState } from "react";
import { CodeEditor } from "@/components/code-editor";
import { SYNTAX_ENTRIES, type SyntaxEntry } from "@/components/syntax-entries";

export type { SyntaxEntry };

const ALL_CATEGORIES = [...new Set(SYNTAX_ENTRIES.map((e) => e.category))];

export function SyntaxReferencePanel() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [scratchCode, setScratchCode] = useState<Record<string, string>>({});

  const filtered = SYNTAX_ENTRIES.filter((e) => {
    const matchesQuery =
      !query ||
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.summary.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !activeCategory || e.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Search */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search syntax… (e.g. defaultdict, heapq)"
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50"
      />

      {/* Category pills */}
      {ALL_CATEGORIES.length > 1 && (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              activeCategory === null
                ? "bg-accent/20 text-accent"
                : "bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-accent/20 text-accent"
                  : "bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Entry count */}
      <p className="text-[10px] text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
      </p>

      {/* Entries */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No matches for &quot;{query}&quot;</p>
        )}
        {filtered.map((entry) => {
          const isOpen = openId === entry.id;
          return (
            <div
              key={entry.id}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              {/* Entry header — click to expand */}
              <button
                onClick={() => setOpenId(isOpen ? null : entry.id)}
                className="w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-accent/5 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-foreground">{entry.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">{entry.category}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{entry.summary}</p>
                </div>
                <span className="text-muted-foreground/50 text-xs shrink-0 mt-0.5">{isOpen ? "▲" : "▼"}</span>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-border/50 px-3 py-3 space-y-3">
                  {/* Syntax */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Syntax</p>
                    <CodeEditor value={entry.syntax} onChange={() => {}} readOnly minHeight="auto" />
                  </div>

                  {/* Variants */}
                  {entry.variants && entry.variants.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Variants</p>
                      <div className="space-y-1">
                        {entry.variants.map((v: string, i: number) => (
                          <code key={i} className="block font-mono text-xs text-accent/80 bg-muted rounded px-2 py-1">
                            {v}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Example */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Example</p>
                    <CodeEditor value={entry.example} onChange={() => {}} readOnly minHeight="auto" />
                  </div>

                  {/* Scratch pad */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Scratch pad</p>
                    <CodeEditor
                      value={scratchCode[entry.id] ?? ""}
                      onChange={(val) => setScratchCode((prev) => ({ ...prev, [entry.id]: val }))}
                      placeholder="Try it here…"
                      minHeight="80px"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
