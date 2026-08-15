import { Router } from "express";
import { getConfig, updateConfig } from "../lib/config";
import { getRateSummary, resetMetrics } from "../lib/metricStore";

const router = Router();

router.get("/config", (req, res) => {
  res.json(getConfig());
});

router.post("/config", (req, res) => {
  updateConfig(req.body);
  res.json(getConfig());
});

router.get("/metrics", (req, res) => {
  res.json(getRateSummary());
});

router.post("/metrics/reset", (req, res) => {
  resetMetrics();
  res.json({ ok: true });
});

export default router;