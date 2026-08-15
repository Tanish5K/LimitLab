import type { Request, Response, NextFunction } from "express";
import { redisClient } from "../../database/redisClient";
import { getCacheConfig } from "../lib/config";
import { recordCacheEvent } from "../lib/cacheStore";
import { recordLatency } from "../../gateway/lib/latencyStore";

function buildCacheKey(req: Request): string {
  return `cache:${req.originalUrl}`;
}

export async function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  const config = getCacheConfig();

  if (!config.enabled) {
    console.log("Cache is disabled, bypassing cache middleware.");
    return next();
  }

  const key = buildCacheKey(req);
  const start = Date.now();

  try {
    const cached = await redisClient.get(key);

    if (cached) {
      recordCacheEvent({ timestamp: Date.now(), key, result: "hit" });
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] GET ${req.originalUrl} - ${duration}ms (cache hit)`);
      recordLatency({ timestamp: Date.now(), durationMs: duration, source: "cache" });
      const parsed = JSON.parse(cached);
      return res.json({ ...parsed, cacheHit: true });
    }

    console.log(`[${new Date().toISOString()}] GET ${req.originalUrl} - cache miss, forwarding to backend`);
    recordCacheEvent({ timestamp: Date.now(), key, result: "miss" });
    
    // intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      redisClient
        .setEx(key, config.ttlSeconds, JSON.stringify(body))
        .catch((err) => console.error("Redis SETEX failed:", err));
      return originalJson({ ...(body as object), cacheHit: false });
    };

    next();
  } catch (error) {
    console.error("Cache middleware error, bypassing cache:", error);
    next();
  }
}

export { default as cacheRoutes } from "../routes/cacheRoutes";