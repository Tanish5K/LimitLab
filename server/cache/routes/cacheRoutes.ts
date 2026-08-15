import { Router } from "express";
import { getCacheConfig, updateCacheConfig } from "../lib/config";
import { getCacheSummary, resetCacheMetrics } from "../lib/cacheStore";
import { redisClient } from "../../database/redisClient";

const router = Router();

router.get("/config", (req, res) => {
  res.json(getCacheConfig());
});

router.post("/config", (req, res) => {
  updateCacheConfig(req.body);
  res.json(getCacheConfig());
});

router.get("/metrics", (req, res) => {
  res.json(getCacheSummary());
});

router.post("/metrics/reset", (req, res) => {
  resetCacheMetrics();
  res.json({ ok: true });
});

router.post("/invalidate", async (req, res) => {
  const keys = await redisClient.keys("cache:*");
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
  res.json({ invalidated: keys.length });
});

export default router;