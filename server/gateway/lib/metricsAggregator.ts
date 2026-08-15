import { Server } from "socket.io";
import { getRateSummary } from "../../rate-limiter/lib/metricStore";
import { getCacheSummary } from "../../cache/lib/cacheStore";
import { getRecentLatencies } from "./latencyStore";

const INTERVAL_MS = 250;

let lastRateSnapshot = { allowed: 0, rejected: 0, queued: 0, total: 0 };
let lastCacheSnapshot = { hits: 0, misses: 0, total: 0, hitRate: 0 };
let lastTickTime = Date.now();

export function startMetricsAggregator(io: Server) {
  setInterval(() => {
    const now = Date.now();
    const elapsedSec = (now - lastTickTime) / 1000;
    lastTickTime = now;

    const rateSummary = getRateSummary();
    const cacheSummary = getCacheSummary();
    const recentLatencies = getRecentLatencies(now - INTERVAL_MS);

    const avgLatencyMs = recentLatencies.length
      ? Math.round(recentLatencies.reduce((sum, e) => sum + e.durationMs, 0) / recentLatencies.length)
      : 0;

    const allowedRatio =
      rateSummary.total > 0 ? Number((rateSummary.allowed / rateSummary.total).toFixed(3)) : null;
    const rejectedRatio =
      rateSummary.total > 0 ? Number((rateSummary.rejected / rateSummary.total).toFixed(3)) : null;

    // what changed since the last tick — the "instant rate" data
    const totalDelta = rateSummary.total - lastRateSnapshot.total;
    const allowedDelta = rateSummary.allowed - lastRateSnapshot.allowed;
    const rejectedDelta = rateSummary.rejected - lastRateSnapshot.rejected;
    const hitsDelta = cacheSummary.hits - lastCacheSnapshot.hits;
    const missesDelta = cacheSummary.misses - lastCacheSnapshot.misses;

    lastRateSnapshot = rateSummary;
    lastCacheSnapshot = cacheSummary;

    io.emit("metrics", {
      timestamp: now,
      rate: {
        // totals — for climbing line charts / current-state displays
        allowed: rateSummary.allowed,
        rejected: rateSummary.rejected,
        queued: rateSummary.queued,
        total: rateSummary.total,
        allowedRatio,
        rejectedRatio,
        // deltas — for "right now" charts
        requestsPerSec: elapsedSec > 0 ? Math.round(totalDelta / elapsedSec) : 0,
        allowedDelta,
        rejectedDelta,
      },
      cache: {
        hits: cacheSummary.hits,
        misses: cacheSummary.misses,
        total: cacheSummary.total,
        hitRate: cacheSummary.hitRate,
        hitsDelta,
        missesDelta,
      },
      avgLatencyMs,
    });
  }, INTERVAL_MS);
}