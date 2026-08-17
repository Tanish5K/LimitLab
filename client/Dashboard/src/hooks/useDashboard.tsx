import { useCallback, useMemo, useState } from "react";
import { useMetricSocket } from "./useMetricSocket";
import { useTrafficSocket, useJobStatusEvents, type RequestEvent } from "./useTrafficSocket";
import { bucketEventsBySecond } from "../lib/bucketing";
import { stopSimulation, resetMetrics, invalidateCache } from "../api/api";
import type { JobRecord } from "../lib/types";

function getJobStats(job: JobRecord, events: RequestEvent[]) {
  const jobEvents = events.filter((e) => e.jobId === job.jobId);
  return {
    requestsSent: jobEvents.length,
    requestsAllowed: jobEvents.filter((e) => e.status !== null && e.status < 400).length,
    requestsRejected: jobEvents.filter((e) => e.status === 429).length,
    requestsFailed: jobEvents.filter((e) => e.failed).length,
    status: job.status,
  };
}

export function useDashboard() {
  const { connected: metricsConnected, ticks } = useMetricSocket();
  const { connected: trafficGenConnected, events } = useTrafficSocket();

  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const latestTick = ticks[ticks.length - 1];

  const jobsWithStats = useMemo(
    () => jobs.map((job) => ({ job, stats: getJobStats(job, events) })),
    [jobs, events]
  );

  useJobStatusEvents(
    useCallback((event) => {
      setJobs((prev) => prev.map((j) => (j.jobId === event.jobId ? { ...j, status: event.status } : j)));
    }, [])
  );

  function handleJobStarted(data: {
    jobId: string;
    trafficConfig: JobRecord["trafficConfig"];
    rateLimiterConfig: JobRecord["rateLimiterConfig"];
    cacheConfig: JobRecord["cacheConfig"];
  }) {
    const newJob: JobRecord = { ...data, createdAt: Date.now(), status: "running" };
    setJobs((prev) => [newJob, ...prev]);
    setSelectedJobId(data.jobId);
  }

  async function handleStopJob(jobId: string) {
    await stopSimulation(jobId);
    setJobs((prev) => prev.map((j) => (j.jobId === jobId ? { ...j, status: "stopped" } : j)));
  }

  const selectedJobEvents = useMemo(
    () => events.filter((e) => e.jobId === selectedJobId),
    [events, selectedJobId]
  );

  const bucketedData = useMemo(
    () => bucketEventsBySecond(selectedJobEvents, 30),
    [selectedJobEvents]
  );

  return {
    metricsConnected,
    trafficGenConnected,
    latestTick,
    jobsWithStats,
    selectedJobId,
    setSelectedJobId,
    handleJobStarted,
    handleStopJob,
    selectedJobEvents,
    bucketedData,
    resetMetrics,
    invalidateCache,
  };
}