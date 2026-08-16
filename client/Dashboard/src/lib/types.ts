export type TrafficPattern = "constant" | "spike" | "ramp-up";
export type ResourceMode = "identical" | "unique";
export type Algorithm = "token-bucket" | "leaky-bucket" | "sliding-window";
export type SlidingWindowMode = "log" | "counter";

export interface TrafficConfig {
  pattern: TrafficPattern;
  rps: number;
  durationSeconds: number;
  clients: number;
  resourceMode: ResourceMode;
  spikeAt?: number;
  spikeMultiplier?: number;
}

export interface RateLimiterConfig {
  algorithm: Algorithm;
  tokenBucket: { capacity: number; refillRatePerSec: number };
  leakyBucket: { capacity: number; drainRatePerSec: number };
  slidingWindow: { maxRequests: number; windowMs: number; mode: SlidingWindowMode };
}

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
}

export interface JobState {
  id: string;
  status: "running" | "done" | "stopped" | "error";
  requestsSent: number;
  requestsAllowed: number;
  requestsRejected: number;
  requestsFailed: number;
}

export interface JobRecord {
  jobId: string;
  trafficConfig: TrafficConfig;
  rateLimiterConfig: RateLimiterConfig;
  cacheConfig: CacheConfig;
  createdAt: number;
  status: "running" | "done" | "stopped" | "error";
  liveState?: JobState;
}