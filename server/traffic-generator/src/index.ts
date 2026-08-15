import express from "express";
import { startSimulation } from "../lib/engine";
import { getJob } from "../lib/jobStore";

const app = express();
app.use(express.json());

const PORT = process.env.TRAFFIC_GEN_PORT || 5000;

app.post("/simulate", (req, res) => {
  const jobId = startSimulation(req.body);
  res.json({ jobId });
});

app.get("/simulate/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json(job);
});

app.listen(PORT, () => {
  console.log(`Traffic generator running on port ${PORT}`);
});