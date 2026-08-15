import type { LimiterResult } from "./types";

interface MetricEvent {
  timestamp: number;
  clientId: string;
  algorithm: string;
  result: LimiterResult;
}

const events: MetricEvent[] = [];

export function recordEvent(event: MetricEvent) {
  events.push(event);
}

export function getRateSummary() {
  return {
    allowed: events.filter((e) => e.result === "allowed").length,
    rejected: events.filter((e) => e.result === "rejected").length,
    queued: events.filter((e) => e.result === "queued").length,
    total: events.length,
  };
}

export function resetMetrics() {
  events.length = 0;
}