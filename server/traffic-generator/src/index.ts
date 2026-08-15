import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { startSimulation, stopSimulation, setIo } from "../lib/engine";
import { getJob } from "../lib/jobStore";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173" },
});

setIo(io);

io.on("connection", (socket) => {
  console.log("dashboard connected to traffic-gen:", socket.id);
});

app.post("/simulate", (req, res) => {
  const jobId = startSimulation(req.body);
  res.json({ jobId });
});

app.get("/simulate/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json(job);
});

app.post("/simulate/:jobId/stop", (req, res) => {
  const stopped = stopSimulation(req.params.jobId);
  if (!stopped) return res.status(404).json({ error: "job not found or already finished" });
  res.json({ ok: true });
});

const PORT = process.env.TRAFFIC_GEN_PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Traffic generator running on port ${PORT}`);
});