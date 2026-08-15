import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "redis";
import { createServer } from "http";
import { Server } from "socket.io";
import { getRateLimiter } from "../rate-limiter/src/index";

dotenv.config();

const app = express();
const rateLimiter = getRateLimiter();

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

const redisUrl = process.env.REDIS_URL;
const BACKEND_URL = process.env.BACKEND_URL;
const CLIENT_URL = process.env.CLIENT_URL;
const BACKEND_PORT = process.env.BACKEND_PORT;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined in .env");
}
if (!BACKEND_URL) {
  throw new Error("BACKEND_URL is not defined in .env");
}
if (!BACKEND_PORT) {
  throw new Error("BACKEND_PORT is not defined in .env");
}

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (error) => {
  console.error("Redis Client Error:", error);
});

await redisClient.connect();

console.log("Connected to Redis");

app.get("/", (req, res) => {
  return res.json({ message: "Server is running" });
});

app.get("/resource/:id", async (req, res) => {
  const start = Date.now();
  const { id } = req.params;

  try {
    const url = new URL(`${BACKEND_URL}/resource/${id}`);
    if (req.query.latency) url.searchParams.set("latency", String(req.query.latency));

    const backendRes = await fetch(url.toString());
    const data = await backendRes.json();

    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] GET /resource/${id} - ${duration}ms`);

    res.json({ ...data, gatewayDurationMs: duration });
  } catch (error) {
    console.error("Error proxying to backend:", error);
    res.status(502).json({ error: "Backend unavailable" });
  }
});

app.get("/health", (req, res) => {
  return res.json({ status: "ok" });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
  },
});

io.on("connection", (socket) => {
  console.log("dashboard connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("dashboard disconnected:", socket.id);
  });
});

httpServer.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

export { io };