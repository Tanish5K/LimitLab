import type { RateLimiterConfig } from "./types";

let currentConfig: RateLimiterConfig = {
  algorithm: "token-bucket",
  tokenBucket: { capacity: 20, refillRatePerSec: 5 },
  leakyBucket: { capacity: 20, drainRatePerSec: 5 },
  slidingWindow: { maxRequests: 20, windowMs: 1000, mode: "counter" },
};

export function getConfig(): RateLimiterConfig {
  return currentConfig;
}

export function updateConfig(patch: Partial<RateLimiterConfig>) {
  currentConfig = { ...currentConfig, ...patch };
}