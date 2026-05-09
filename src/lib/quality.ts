export function rankQuality(q: string | null): number {
  const ranks: Record<string, number> = { OPTIMAL: 4, SUBOPTIMAL: 3, BRUTE_FORCE: 2, NONE: 1 };
  return ranks[q ?? ""] ?? 0;
}
