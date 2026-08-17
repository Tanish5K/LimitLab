import type { Request, Response, NextFunction } from "express";
import { recordEvent } from "../metricStore";

const states = new Map<string, number[]>();

export function resetSlidingWindowLog() {
  states.clear();
}

export function createSlidingWindowLogMiddleware(config: { maxRequests: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = (req.headers["x-client-id"] as string) || "anonymous";
    const now = Date.now();

    let timestamps = states.get(clientId) ?? [];
    timestamps = timestamps.filter((t) => now - t < config.windowMs);

    if (timestamps.length < config.maxRequests) {
      timestamps.push(now);
      states.set(clientId, timestamps);
      recordEvent({ timestamp: now, clientId, algorithm: "sliding-window-log", result: "allowed" });
      return next();
    }

    states.set(clientId, timestamps);
    recordEvent({ timestamp: now, clientId, algorithm: "sliding-window-log", result: "rejected" });
    res.status(429).json({ error: "Too Many Requests" });
  };
}

export function getWindowCounts(windowMs: number): { clientId: string; count: number }[] {
  const now = Date.now();
  return Array.from(states.entries()).map(([clientId, timestamps]) => ({
    clientId,
    count: timestamps.filter((t) => now - t < windowMs).length,
  }));
}