import { Router } from "express";
import { getConfig, updateConfig } from "../lib/config";
import { getRateSummary, resetMetrics } from "../lib/metricStore";
import { getIoInstance } from "../../gateway/lib/socket";

const router = Router();

router.get("/config", (req, res) => {
  res.json(getConfig());
});

router.post("/config", (req, res) => {
  updateConfig(req.body);
  const newConfig = getConfig();
  getIoInstance().emit("rate-limiter-config-changed", newConfig);
  res.json(newConfig);
});

router.get("/metrics", (req, res) => {
  res.json(getRateSummary());
});

router.post("/metrics/reset", (req, res) => {
  resetMetrics();
  res.json({ ok: true });
});

export default router;