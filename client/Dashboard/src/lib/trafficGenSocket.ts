import { io } from "socket.io-client";

export const trafficGenSocket = io(import.meta.env.VITE_TRAFFIC_GEN_URL || "http://localhost:5000");