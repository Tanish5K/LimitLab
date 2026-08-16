import type { Request, Response, NextFunction } from "express";
import { recordEvent } from "../metricStore";

interface Bucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
}

const buckets = new Map<string, Bucket>();

export function createTokenBucketMiddleware(config: { capacity: number; refillRatePerSec: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = (req.headers["x-client-id"] as string) || "anonymous";
    const now = Date.now();

    let bucket = buckets.get(clientId);
    if (!bucket) {
      bucket = { tokens: config.capacity, lastRefill: now, capacity: config.capacity };
      buckets.set(clientId, bucket);
    }
    bucket.capacity = config.capacity

    // lazy refill
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(config.capacity, bucket.tokens + elapsedSec * config.refillRatePerSec);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      recordEvent({ timestamp: now, clientId, algorithm: "token-bucket", result: "allowed" });
      return next();
    }

    recordEvent({ timestamp: now, clientId, algorithm: "token-bucket", result: "rejected" });
    res.status(429).json({ error: "Too Many Requests" });
  };
}

export function getTokenLevels(): { clientId: string; tokens: number; capacity: number }[] {
  return Array.from(buckets.entries()).map(([clientId, bucket]) => ({
    clientId,
    tokens: Math.floor(bucket.tokens),
    capacity: bucket.capacity ?? 0,
  }));
}