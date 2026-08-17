import type { Request, Response, NextFunction } from "express";
import { recordEvent } from "../metricStore";

interface CounterState {
  windowStart: number;
  currentCount: number;
  previousCount: number;
}

const states = new Map<string, CounterState>();

export function resetSlidingWindowCounter() {
  states.clear();
}

export function createSlidingWindowCounterMiddleware(config: { maxRequests: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = (req.headers["x-client-id"] as string) || "anonymous";
    const now = Date.now();

    let state = states.get(clientId);
    if (!state) {
      state = { windowStart: now, currentCount: 0, previousCount: 0 };
      states.set(clientId, state);
    }

    const elapsed = now - state.windowStart;
    if (elapsed >= config.windowMs) {
      const windowsPassed = Math.floor(elapsed / config.windowMs);
      state.previousCount = windowsPassed === 1 ? state.currentCount : 0;
      state.currentCount = 0;
      state.windowStart += windowsPassed * config.windowMs;
    }

    const elapsedInCurrent = now - state.windowStart;
    const overlapWeight = 1 - elapsedInCurrent / config.windowMs;
    const estimate = state.previousCount * overlapWeight + state.currentCount;

    if (estimate < config.maxRequests) {
      state.currentCount += 1;
      recordEvent({ timestamp: now, clientId, algorithm: "sliding-window-counter", result: "allowed" });
      return next();
    }

    recordEvent({ timestamp: now, clientId, algorithm: "sliding-window-counter", result: "rejected" });
    res.status(429).json({ error: "Too Many Requests" });
  };
}

export function getWindowEstimates(windowMs: number): { clientId: string; estimate: number }[] {
  const now = Date.now();

  return Array.from(states.entries()).map(([clientId, state]) => {
    const elapsedInCurrent = now - state.windowStart;
    const overlapWeight = Math.max(0, 1 - elapsedInCurrent / windowMs);
    const estimate = state.previousCount * overlapWeight + state.currentCount;

    return { clientId, estimate: Number(estimate.toFixed(2)) };
  });
}