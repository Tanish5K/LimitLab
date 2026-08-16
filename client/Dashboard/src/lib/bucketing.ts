import type { RequestEvent } from "../hooks/useTrafficSocket";

export interface SecondBucket {
  second: number;
  total: number;
  allowed: number;
  rejected: number;
  cacheHits: number;
  cacheMisses: number;
  avgLatencyMs: number;
}

export function bucketEventsBySecond(events: RequestEvent[], windowSeconds = 30): SecondBucket[] {
  const nowSecond = Math.floor(Date.now() / 1000);
  const startSecond = nowSecond - windowSeconds + 1;

  const buckets = new Map<number, RequestEvent[]>();
  for (const event of events) {
    const sec = Math.floor(event.timestamp / 1000);
    if (sec < startSecond) continue;
    if (!buckets.has(sec)) buckets.set(sec, []);
    buckets.get(sec)!.push(event);
  }

  const result: SecondBucket[] = [];
  for (let sec = startSecond; sec <= nowSecond; sec++) {
    const bucketEvents = buckets.get(sec) ?? [];
    const allowed = bucketEvents.filter((e) => e.status !== null && e.status < 400).length;
    const rejected = bucketEvents.filter((e) => e.status === 429).length;
    const cacheHits = bucketEvents.filter((e) => e.cacheStatus === "cache-hit").length;
    const cacheMisses = bucketEvents.filter((e) => e.cacheStatus === "cache-miss").length;
    const latencies = bucketEvents.map((e) => e.durationMs).filter((d): d is number => typeof d === "number");
    const avgLatencyMs = latencies.length
      ? Math.round(latencies.reduce((sum, v) => sum + v, 0) / latencies.length)
      : 0;

    result.push({
      second: sec,
      total: bucketEvents.length,
      allowed,
      rejected,
      cacheHits,
      cacheMisses,
      avgLatencyMs,
    });
  }

  return result;
}