import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { rateLimiterMiddleware, rateLimiterRoutes } from "../../rate-limiter/src/index";
import { cacheMiddleware, cacheRoutes } from "../../cache/src/index";
import { connectRedis } from "../../database/redisClient";
import { recordLatency } from "../lib/latencyStore";
import { startMetricsAggregator } from "../lib/metricsAggregator";
import { setIoInstance } from "../lib/socket";
import { getConfig as getRateLimiterConfig } from "../../rate-limiter/src/index";
import { getCacheConfig } from "../../cache/lib/config";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));

const BACKEND_URL = process.env.BACKEND_URL;
const CLIENT_URL = process.env.CLIENT_URL;
const BACKEND_PORT = process.env.BACKEND_PORT;

if (!BACKEND_URL) {
  throw new Error("BACKEND_URL is not defined in .env");
}
if (!BACKEND_PORT) {
  throw new Error("BACKEND_PORT is not defined in .env");
}

await connectRedis();

app.get("/", (req, res) => {
  return res.json({ message: "Server is running" });
});

app.get("/health", (req, res) => {
  return res.json({ status: "ok" });
});

// admin/config routes for the rate limiter & cache
app.use("/api/rate-limiter", rateLimiterRoutes);
app.use("/api/cache", cacheRoutes);

// traffic path - rate limiter and cache middleware are applied here
app.use("/resource", rateLimiterMiddleware);
app.use("/resource", cacheMiddleware);

app.get("/resource/:id", async (req, res) => {
  const start = Date.now();
  const { id } = req.params;

  try {
    const url = new URL(`${BACKEND_URL}/resource/${id}`);
    if (req.query.latency) url.searchParams.set("latency", String(req.query.latency));

    const backendRes = await fetch(url.toString());
    const data = await backendRes.json();

    const duration = Date.now() - start;
    console.log(backendRes.status, backendRes.statusText);
    console.log(`[${new Date().toISOString()}] GET /resource/${id} - ${duration}ms`);
    recordLatency({ timestamp: Date.now(), durationMs: duration, source: "backend" });

    res.status(backendRes.status).json({
      ...data,
      gatewayDurationMs: duration,
      backendStatus: backendRes.status,
    });
  } catch (error) {
    console.error("Error proxying to backend:", error);
    res.status(502).json({ error: "Backend unavailable" });
  }
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
  },
});
setIoInstance(io);

io.on("connection", (socket) => {
  console.log("dashboard connected:", socket.id);

  socket.emit("initial-config", {
    rateLimiter: getRateLimiterConfig(),
    cache: getCacheConfig(),
  });

  socket.on("disconnect", () => {
    console.log("dashboard disconnected:", socket.id);
  });
});

httpServer.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
  startMetricsAggregator(io);
});

export { io };