import type { TrafficConfig } from "./types";
import { createJob, updateJob, getJob } from "./jobStore";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";
const TICK_MS = 100;

function randomId(max: number) {
  return Math.floor(Math.random() * max) + 1;
}

//requests firing at current time
function rpsAtTime(config: TrafficConfig, elapsedSeconds: number): number {
  const { pattern, rps, durationSeconds, spikeAt, spikeMultiplier } = config;

  if (pattern === "constant") {
    return rps;
  }

  if (pattern === "ramp-up") {
    const progress = Math.min(elapsedSeconds / durationSeconds, 1);
    return Math.round(rps * progress);
  }

  if (pattern === "spike") {
    const triggerAt = spikeAt ?? durationSeconds / 2;
    const spikeWindow = 2;
    const isSpiking = elapsedSeconds >= triggerAt && elapsedSeconds < triggerAt + spikeWindow;
    return isSpiking ? rps * (spikeMultiplier ?? 5) : rps;
  }

  return rps;
}

//fires a request & updates jobs
async function fireRequest(config: TrafficConfig, clientId: number, jobId: string) {
  const id = config.resourceMode === "identical" ? 1 : randomId(1000);

  try {
    await fetch(`${GATEWAY_URL}/resource/${id}`, {
      headers: { "x-client-id": String(clientId) },
    });
    updateJob(jobId, { requestsSent: (getJob(jobId)?.requestsSent ?? 0) + 1 });
  } catch {
    updateJob(jobId, { requestsFailed: (getJob(jobId)?.requestsFailed ?? 0) + 1 });
  }
}

//starts a traffic simulation based on the provided configuration
export function startSimulation(config: TrafficConfig): string {
  const jobId = crypto.randomUUID();

  createJob({
    id: jobId,
    config,
    status: "running",
    startedAt: Date.now(),
    requestsSent: 0,
    requestsFailed: 0,
  });

  const startTime = Date.now();

  const interval = setInterval(() => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    if (elapsedSeconds >= config.durationSeconds) {
      clearInterval(interval);
      updateJob(jobId, { status: "done" });
      console.log(`[traffic-gen] job ${jobId} done`);
      return;
    }

    const targetRps = rpsAtTime(config, elapsedSeconds);
    const requestsThisTick = Math.round((targetRps * TICK_MS) / 1000);

    console.log(
      `[traffic-gen] t=${elapsedSeconds.toFixed(1)}s target=${targetRps}rps firing=${requestsThisTick}`
    );

    for (let i = 0; i < requestsThisTick; i++) {
      const clientId = randomId(config.clients);
      fireRequest(config, clientId, jobId);
    }
  }, TICK_MS);

  return jobId;
}