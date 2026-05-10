import { computeCapacity, QUEUE_GREEN_RATIO, QUEUE_YELLOW_RATIO, QUEUE_AMBER_RATIO, QUEUE_ORANGE_RATIO } from "./capacity";

export type LoadZone = "green" | "yellow" | "amber" | "orange" | "red";

export function classifyLoadZone(ratio: number): LoadZone {
  if (ratio <= QUEUE_GREEN_RATIO) return "green";
  if (ratio <= QUEUE_YELLOW_RATIO) return "yellow";
  if (ratio <= QUEUE_AMBER_RATIO) return "amber";
  if (ratio <= QUEUE_ORANGE_RATIO) return "orange";
  return "red";
}

export function deriveCapacity(dailyTimeBudgetMinutes: number, expectedDailyDue: number) {
  const { reviewCapacity, newCapacity } = computeCapacity(dailyTimeBudgetMinutes, expectedDailyDue);
  return { reviewCapacity, newCapacity };
}
