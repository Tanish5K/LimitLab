import { useEffect, useRef, useState } from "react";
import { trafficGenSocket } from "../lib/trafficGenSocket";

export interface RequestEvent {
  timestamp: number;
  jobId: string;
  clientId: number;
  resourceId: number;
  status: number | null;
  cacheStatus: "cache-hit" | "cache-miss" | "n/a";
  durationMs: number;
  failed?: boolean;
}

export interface JobStatusEvent {
  jobId: string;
  status: "done" | "stopped";
}

export function useJobStatusEvents(onStatusChange: (event: JobStatusEvent) => void) {
  useEffect(() => {
    function handleStatus(event: JobStatusEvent) {
      onStatusChange(event);
    }
    trafficGenSocket.on("job-status-changed", handleStatus);
    return () => {
      trafficGenSocket.off("job-status-changed", handleStatus);
    };
  }, [onStatusChange]);
}

const RETENTION_MS = 60_000;
const FLUSH_INTERVAL_MS = 250;

export function useTrafficSocket() {
  const [connected, setConnected] = useState(trafficGenSocket.connected);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const bufferRef = useRef<RequestEvent[]>([]);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);
    }
    function handleDisconnect() {
      setConnected(false);
    }
    function handleEvent(event: RequestEvent) {
      bufferRef.current.push(event);
    }

    trafficGenSocket.on("connect", handleConnect);
    trafficGenSocket.on("disconnect", handleDisconnect);
    trafficGenSocket.on("request-event", handleEvent);

    const flushInterval = setInterval(() => {
      if (bufferRef.current.length === 0) return;

      const toFlush = bufferRef.current;
      bufferRef.current = [];

      setEvents((prev) => {
        const combined = [...prev, ...toFlush];
        const cutoff = Date.now() - RETENTION_MS;
        return combined.filter((e) => e.timestamp >= cutoff);
      });
    }, FLUSH_INTERVAL_MS);

    return () => {
      trafficGenSocket.off("connect", handleConnect);
      trafficGenSocket.off("disconnect", handleDisconnect);
      trafficGenSocket.off("request-event", handleEvent);
      clearInterval(flushInterval);
    };
  }, []);

  return { connected, events };
}