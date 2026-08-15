interface CacheEvent {
  timestamp: number;
  key: string;
  result: "hit" | "miss";
}

const events: CacheEvent[] = [];

export function recordCacheEvent(event: CacheEvent) {
  events.push(event);
}

export function getCacheSummary() {
  const hits = events.filter((e) => e.result === "hit").length;
  const misses = events.filter((e) => e.result === "miss").length;
  const total = hits + misses;

  return {
    hits,
    misses,
    total,
    hitRate: total === 0 ? 0 : Number((hits / total).toFixed(3)),
  };
}

export function resetCacheMetrics() {
  events.length = 0;
}