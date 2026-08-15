// server/src/traffic-generator/types.ts
export type TrafficPattern = "constant" | "spike" | "ramp-up";

export interface TrafficConfig {
  pattern: TrafficPattern;
  rps: number;             
  durationSeconds: number;
  clients: number;        
  resourceMode: "identical" | "unique";
  spikeAt?: number;       
  spikeMultiplier?: number;
}

export interface JobState {
  id: string;
  config: TrafficConfig;
  status: "running" | "done" | "stopped" | "error";
  startedAt: number;
  requestsSent: number;
  requestsAllowed: number;
  requestsRejected: number;
  requestsFailed: number;
}