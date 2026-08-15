import { useEffect, useState } from "react";
import { trafficGenSocket } from "../lib/trafficGenSocket";

export interface RequestEvent {
  timestamp: number;
  jobId: string;
  clientId: number;
  resourceId: number;
  status: number | null;
  cacheStatus: "cache-hit" | "cache-miss" | "n/a";
  failed?: boolean;
}

const MAX_EVENTS = 200;

export function useTrafficSocket() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<RequestEvent[]>([]);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);
    }
    function handleDisconnect() {
      setConnected(false);
    }
    function handleEvent(event: RequestEvent) {
      setEvents((prev) => {
        const next = [...prev, event];
        return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
      });
    }

    trafficGenSocket.on("connect", handleConnect);
    trafficGenSocket.on("disconnect", handleDisconnect);
    trafficGenSocket.on("request-event", handleEvent);

    return () => {
      trafficGenSocket.off("connect", handleConnect);
      trafficGenSocket.off("disconnect", handleDisconnect);
      trafficGenSocket.off("request-event", handleEvent);
    };
  }, []);

  return { connected, events };
}