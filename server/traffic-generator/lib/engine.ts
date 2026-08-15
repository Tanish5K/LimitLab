import type { TrafficConfig } from "./types";
import { Server } from "socket.io";
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

let io: Server | null = null;
export function setIo(serverIo: Server) {
  io = serverIo;
}

//fires a request & updates jobs
async function fireRequest(config: TrafficConfig, clientId: number, jobId: string) {
  const id = config.resourceMode === "identical" ? 1 : randomId(1000);

  try {
    const res = await fetch(`${GATEWAY_URL}/resource/${id}`, {
      headers: { "x-client-id": String(clientId) },
    });

    let cacheStatus = "n/a (cache disabled)";
    try {
      const body = await res.clone().json();
      if (typeof body.cacheHit === "boolean") {
        cacheStatus = body.cacheHit ? "cache-hit" : "cache-miss";
      }
    } catch {
      // body wasn't JSON
      console.log(`if you see this, my code is broken..`)
    }

    console.log(
      `[traffic-gen] client=${clientId} resource=${id} status=${res.status} ${cacheStatus}`
    );
    io?.emit("request-event", {
      timestamp: Date.now(),
      jobId,
      clientId,
      resourceId: id,
      status: res.status,
      cacheStatus,
    });

    const job = getJob(jobId);
    if (!job) return;

    if (res.status === 429) {
      updateJob(jobId, { requestsRejected: (job.requestsRejected ?? 0) + 1 });
    } else if (res.ok) {
      updateJob(jobId, { requestsAllowed: (job.requestsAllowed ?? 0) + 1 });
    } else {
      updateJob(jobId, { requestsFailed: (job.requestsFailed ?? 0) + 1 });
    }
  } catch {
    console.log(`[traffic-gen] client=${clientId} resource=${id} status=FAILED`);
    io?.emit("request-event", {
      timestamp: Date.now(),
      jobId,
      clientId,
      resourceId: id,
      status: null,
      cacheHit: null,
      failed: true,
    });
    
    updateJob(jobId, { requestsFailed: (getJob(jobId)?.requestsFailed ?? 0) + 1 });
  }
}

const activeIntervals = new Map<string, NodeJS.Timeout>();

//starts a traffic simulation based on the provided configuration
export function startSimulation(config: TrafficConfig): string {
  const jobId = crypto.randomUUID();

  createJob({
    id: jobId,
    config,
    status: "running",
    startedAt: Date.now(),
    requestsSent: 0,
    requestsAllowed: 0,
    requestsRejected: 0,
    requestsFailed: 0,
  });

  const startTime = Date.now();

  const interval = setInterval(() => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    if (elapsedSeconds >= config.durationSeconds) {
      clearInterval(interval);
      updateJob(jobId, { status: "done" });
      activeIntervals.delete(jobId);
      console.log(`[traffic-gen] job ${jobId} done`);
      return;
    }

    const targetRps = rpsAtTime(config, elapsedSeconds);
    const requestsThisTick = Math.round((targetRps * TICK_MS) / 1000);

    // Logging the current state of the traffic (you can comment it out if you want its not like I care or anything ._.)
    console.log(`[traffic-gen] t=${elapsedSeconds.toFixed(1)}s target=${targetRps}rps firing=${requestsThisTick}`);

    for (let i = 0; i < requestsThisTick; i++) {
      const clientId = randomId(config.clients);
      fireRequest(config, clientId, jobId);
    }
  }, TICK_MS);

  activeIntervals.set(jobId, interval);
  return jobId;
}

export function stopSimulation(jobId: string): boolean {
  const interval = activeIntervals.get(jobId);
  if (!interval) return false;

  clearInterval(interval);
  activeIntervals.delete(jobId);
  updateJob(jobId, { status: "stopped" });
  console.log(`[traffic-gen] job ${jobId} stopped manually`);
  return true;
}