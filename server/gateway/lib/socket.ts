import { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setIoInstance(server: Server) {
  ioInstance = server;
}

export function getIoInstance(): Server {
  if (!ioInstance) throw new Error("io not initialized yet");
  return ioInstance;
}