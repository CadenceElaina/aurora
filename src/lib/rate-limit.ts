// In-memory sliding window rate limiter.
// Vercel Fluid Compute reuses function instances, so this provides per-instance
// protection against bursts. Not a distributed lock — suitable for abuse deterrence.

const store = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  let timestamps = store.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > cutoff);
  timestamps.push(now);
  store.set(key, timestamps);

  const count = timestamps.length;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
