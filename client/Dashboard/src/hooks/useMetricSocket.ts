import { useEffect, useState } from "react";
import { socket } from "../lib/metricSocket";

export interface MetricsTick {
  timestamp: number;
  rate: {
    allowed: number;
    rejected: number;
    queued: number;
    total: number;
    allowedRatio: number | null;
    rejectedRatio: number | null;
    requestsPerSec: number;
    allowedDelta: number;
    rejectedDelta: number;
  };
  cache: {
    hits: number;
    misses: number;
    total: number;
    hitRate: number;
    hitsDelta: number;
    missesDelta: number;
  };
  avgLatencyMs: number;
  algorithmState:
    | { type: "leaky-bucket"; totalQueueDepth: number }
    | { type: "token-bucket"; clients: { clientId: string; tokens: number; capacity: number }[] }
    | { type: "sliding-window-log"; clients: { clientId: string; count: number }[] }
    | { type: "sliding-window-counter"; clients: { clientId: string; estimate: number }[] }
    | null;
}

const MAX_POINTS = 100;

export function useMetricSocket() {
  const [connected, setConnected] = useState(false);
  const [ticks, setTicks] = useState<MetricsTick[]>([]);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);
    }
    function handleDisconnect() {
      setConnected(false);
    }
    function handleMetrics(tick: MetricsTick) {
      setTicks((prev) => {
        const next = [...prev, tick];
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
      });
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("metrics", handleMetrics);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("metrics", handleMetrics);
    };
  }, []);

  return { connected, ticks };
}