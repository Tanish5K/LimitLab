interface LatencyEvent {
  timestamp: number;
  durationMs: number;
  source: "cache" | "backend";
}

const events: LatencyEvent[] = [];
const MAX_EVENTS = 5000;

export function recordLatency(event: LatencyEvent) {
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
}

export function getRecentLatencies(sinceTimestamp: number) {
  return events.filter((e) => e.timestamp >= sinceTimestamp);
}