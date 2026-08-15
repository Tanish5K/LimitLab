import { Server } from "socket.io";
import { getRateSummary } from "../../rate-limiter/lib/metricStore";
import { getCacheSummary } from "../../cache/lib/cacheStore";
import { getRecentLatencies } from "./latencyStore";

const INTERVAL_MS = 250;

let lastRateSnapshot = { allowed: 0, rejected: 0, queued: 0, total: 0 };
let lastCacheSnapshot = { hits: 0, misses: 0, total: 0, hitRate: 0 };
let lastEmitTime = Date.now();

export function startMetricsAggregator(io: Server) {
  setInterval(() => {
    const now = Date.now();
    const elapsedSec = (now - lastEmitTime) / 1000;
    lastEmitTime = now;

    const rateSummary = getRateSummary();
    const cacheSummary = getCacheSummary();
    const recentLatencies = getRecentLatencies(now - INTERVAL_MS);

    const allowedDelta = rateSummary.allowed - lastRateSnapshot.allowed;
    const rejectedDelta = rateSummary.rejected - lastRateSnapshot.rejected;
    const queuedDelta = rateSummary.queued - lastRateSnapshot.queued;
    const totalDelta = rateSummary.total - lastRateSnapshot.total;

    const hitsDelta = cacheSummary.hits - lastCacheSnapshot.hits;
    const missesDelta = cacheSummary.misses - lastCacheSnapshot.misses;

    lastRateSnapshot = rateSummary;
    lastCacheSnapshot = cacheSummary;

    const avgLatencyMs = recentLatencies.length
      ? Math.round(recentLatencies.reduce((sum, e) => sum + e.durationMs, 0) / recentLatencies.length)
      : 0;

    io.emit("metrics", {
      timestamp: now,
      requestsPerSec: elapsedSec > 0 ? Math.round(totalDelta / elapsedSec) : 0,
      allowed: allowedDelta,
      rejected: rejectedDelta,
      queued: queuedDelta,
      cacheHits: hitsDelta,
      cacheMisses: missesDelta,
      cacheHitRate: hitsDelta + missesDelta > 0 ? Number((hitsDelta / (hitsDelta + missesDelta)).toFixed(3)) : null,
      avgLatencyMs,
      cumulative: { rate: rateSummary, cache: cacheSummary },
    });
  }, INTERVAL_MS);
}