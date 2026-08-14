import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "redis";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined in .env");
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

app.get("/health", (req, res) => {
  return res.json({ status: "ok" });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
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