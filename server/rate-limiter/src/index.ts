import type { Request, Response, NextFunction } from "express";
import { getConfig, updateConfig } from "../lib/config";
import { createTokenBucketMiddleware } from "../lib/algorithms/tokenBucket";
import { createLeakyBucketMiddleware } from "../lib/algorithms/leakyBucket";
import { createSlidingWindowLogMiddleware } from "../lib/algorithms/slidingWindowLog";
import { createSlidingWindowCounterMiddleware } from "../lib/algorithms/slidingWindowCounter";

function resolveMiddleware() {
  const cfg = getConfig();
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

//re-checks config on every request to allow dynamic updates
export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  const middleware = resolveMiddleware();
  middleware(req, res, next);
}

export { getConfig, updateConfig };
export { default as rateLimiterRoutes } from "../routes/rateLimiterRoutes";