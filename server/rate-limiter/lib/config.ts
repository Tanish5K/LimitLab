import type { RateLimiterConfig } from "./types";

export const rateLimiterConfig: RateLimiterConfig = {
  algorithm: "token-bucket",
  tokenBucket: { capacity: 20, refillRatePerSec: 5 },
  leakyBucket: { capacity: 20, drainRatePerSec: 5 },
  slidingWindow: { maxRequests: 20, windowMs: 1000, mode: "counter" },
};