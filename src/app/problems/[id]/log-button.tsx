"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogAttemptModal, type LogModalProblem } from "@/components/log-attempt-modal";

export function ProblemLogButton({
  problemId,
  title,
  leetcodeNumber,
  difficulty,
  isDue,
  hasAttempts,
}: {
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  isDue: boolean;
  hasAttempts: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const problem: LogModalProblem = {
    problemId,
    title,
    leetcodeNumber,
    difficulty,
    isReview: hasAttempts,
  };

  const handleLogged = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);

  const label = !hasAttempts ? "Start First Attempt" : isDue ? "Review Now (Due)" : "Log Attempt";
  const btnClass = isDue
    ? "bg-red-500 text-white"
    : "bg-accent text-accent-foreground";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex h-9 items-center rounded-md px-4 text-sm transition-colors hover:opacity-90 ${btnClass}`}
      >
        {label}
      </button>
      {open && (
        <LogAttemptModal
          problem={problem}
          onClose={() => setOpen(false)}
          onLogged={handleLogged}
        />
      )}
    </>
  );
}
