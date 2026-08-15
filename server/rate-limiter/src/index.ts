import { rateLimiterConfig } from "../lib/config";
import { createTokenBucketMiddleware } from "../lib/algorithms/tokenBucket";
import { createLeakyBucketMiddleware } from "../lib/algorithms/leakyBucket";
import { createSlidingWindowLogMiddleware } from "../lib/algorithms/slidingWindowLog";
import { createSlidingWindowCounterMiddleware } from "../lib/algorithms/slidingWindowCounter";

export function getRateLimiter() {
  const cfg = rateLimiterConfig;

  switch (cfg.algorithm) {
    case "token-bucket":
      return createTokenBucketMiddleware(cfg.tokenBucket);
    case "leaky-bucket":
      return createLeakyBucketMiddleware(cfg.leakyBucket);
    case "sliding-window":
      return cfg.slidingWindow.mode === "log"
        ? createSlidingWindowLogMiddleware(cfg.slidingWindow)
        : createSlidingWindowCounterMiddleware(cfg.slidingWindow);
  }
}

export { getSummary, resetMetrics } from "../lib/metricStore";