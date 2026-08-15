import { useEffect, useState } from "react";
import { trafficGenSocket } from "../lib/trafficGenSocket";

export interface RequestEvent {
  timestamp: number;
  jobId: string;
  clientId: number;
  resourceId: number;
  status: number | null;
  cacheHit: boolean | null;
  failed?: boolean;
}

const MAX_EVENTS = 200;

export function useTrafficSocket() {
  const [events, setEvents] = useState<RequestEvent[]>([]);

  useEffect(() => {
    function handleEvent(event: RequestEvent) {
      setEvents((prev) => {
        const next = [...prev, event];
        return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
      });
    }

    trafficGenSocket.on("request-event", handleEvent);
    return () => {
      trafficGenSocket.off("request-event", handleEvent);
    };
  }, []);

  return events;
}