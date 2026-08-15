import type { Request, Response, NextFunction } from "express";
import { recordEvent } from "../metricStore";

interface LeakyState {
  queue: Array<() => void>;
  timer: NodeJS.Timeout | null;
}

const states = new Map<string, LeakyState>();

export function createLeakyBucketMiddleware(config: { capacity: number; drainRatePerSec: number }) {
  const drainIntervalMs = 1000 / config.drainRatePerSec;

  function getState(clientId: string): LeakyState {
    let state = states.get(clientId);
    if (!state) {
      state = { queue: [], timer: null };
      states.set(clientId, state);
    }
    return state;
  }

  function startDraining(clientId: string, state: LeakyState) {
    if (state.timer) return;
    state.timer = setInterval(() => {
      const job = state.queue.shift();
      if (job) job();
      if (state.queue.length === 0 && state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
    }, drainIntervalMs);
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = (req.headers["x-client-id"] as string) || "anonymous";
    const state = getState(clientId);

    if (state.queue.length >= config.capacity) {
      recordEvent({ timestamp: Date.now(), clientId, algorithm: "leaky-bucket", result: "rejected" });
      return res.status(429).json({ error: "Queue full" });
    }

    recordEvent({ timestamp: Date.now(), clientId, algorithm: "leaky-bucket", result: "queued" });
    state.queue.push(() => {
      recordEvent({ timestamp: Date.now(), clientId, algorithm: "leaky-bucket", result: "allowed" });
      next();
    });

    startDraining(clientId, state);
  };
}