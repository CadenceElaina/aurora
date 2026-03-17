const difficultyClasses = {
  Easy: "bg-green-500/15 text-green-500",
  Medium: "bg-amber-500/15 text-amber-500",
  Hard: "bg-red-500/15 text-red-500",
} as const;

export function DifficultyBadge({ difficulty }: { difficulty: "Easy" | "Medium" | "Hard" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${difficultyClasses[difficulty]}`}>
      {difficulty}
    </span>
  );
}
