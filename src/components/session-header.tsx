"use client";

import type { DrillConfidence } from "@/app/dashboard/demo-data";

interface SessionHeaderProps {
  current: number;         // 0-based index of current drill
  total: number;           // total drills in session
  combo: number;           // consecutive correct streak
  results: DrillConfidence[];
  autoContinue: boolean;
  muted: boolean;
  onToggleAutoContinue: () => void;
  onToggleMute: () => void;
  onExit: () => void;
  onPrevious?: () => void;
  categoryLabel?: string;
}

export function SessionHeader({
  current,
  total,
  combo,
  results,
  autoContinue,
  muted,
  onToggleAutoContinue,
  onToggleMute,
  onExit,
  onPrevious,
  categoryLabel,
}: SessionHeaderProps) {
  const correctCount = results.filter((c) => c >= 3).length;
  const scored = results.length;

  return (
    <div className="flex items-center justify-between shrink-0 py-1">
      {/* Left: back button + label + dot pips */}
      <div className="flex items-center gap-3">
        {onPrevious ? (
          <button
            onClick={onPrevious}
            title="Previous drill (Ctrl+,)"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            ‹ prev
          </button>
        ) : (
          <span className="text-xs text-muted-foreground/30 px-1 select-none">‹ prev</span>
        )}

        <span className="text-xs font-medium text-foreground">
          {categoryLabel ? `${categoryLabel} Practice` : "Daily Drill"}
        </span>

        {/* Dot pips */}
        <div className="flex items-center gap-1" aria-label={`Drill ${current + 1} of ${total}`}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`inline-block rounded-full transition-colors duration-200 ${
                i < current
                  ? "w-2 h-2 bg-accent/60"          // completed
                  : i === current
                  ? "w-2 h-2 bg-accent"              // current
                  : "w-2 h-2 bg-border"              // upcoming
              }`}
            />
          ))}
        </div>

        {/* Score */}
        {scored > 0 && (
          <span className="tabular-nums text-[10px] text-muted-foreground">
            <span className="text-green-500 font-medium">{correctCount}</span>/{scored} correct
          </span>
        )}

        {/* Combo badge — only after ≥4 consecutive correct */}
        {combo >= 4 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
            🔥 {combo} in a row
          </span>
        )}
      </div>

      {/* Right: auto-continue toggle + mute + exit */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAutoContinue}
          title={autoContinue ? "Auto-continue on" : "Auto-continue off"}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
            autoContinue
              ? "bg-accent/20 text-accent"
              : "bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          auto {autoContinue ? "▶" : "▷"}
        </button>

        <button
          onClick={onToggleMute}
          title={muted ? "Unmute sounds" : "Mute sounds"}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {muted ? "🔇" : "🔊"}
        </button>

        <button
          onClick={onExit}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
