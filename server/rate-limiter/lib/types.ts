export type Algorithm = "token-bucket" | "leaky-bucket" | "sliding-window";
export type SlidingWindowMode = "log" | "counter";
export type LimiterResult = "allowed" | "rejected" | "queued";

export interface RateLimiterConfig {
  algorithm: Algorithm;
  tokenBucket: { capacity: number; refillRatePerSec: number };
  leakyBucket: { capacity: number; drainRatePerSec: number };
  slidingWindow: { maxRequests: number; windowMs: number; mode: SlidingWindowMode };
}