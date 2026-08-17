import { useMemo, useState, useCallback } from "react";
import { useMetricSocket } from "./hooks/useMetricSocket";
import { useTrafficSocket, useJobStatusEvents } from "./hooks/useTrafficSocket";
import type { RequestEvent } from "./hooks/useTrafficSocket";
import { JobConfigForm } from "./components/JobConfigForm";
import { JobsList } from "./components/JobsList";
import { RequestsPerSecChart } from "./components/charts/RequestsPerSecChart";
import { AllowedRejectedChart } from "./components/charts/AllowedRejectedChart";
import { CacheHitRateChart } from "./components/charts/CacheHitRateChart";
import { LatencyChart } from "./components/charts/LatencyChart";
import { AlgorithmStateView } from "./components/AlgorithmStateView";
import { RequestEventsTable } from "./components/RequestEventTable";
import { bucketEventsBySecond } from "./lib/bucketing";
import { stopSimulation, resetMetrics, invalidateCache } from "./api/api";
import type { JobRecord } from "./lib/types";


function getJobStats(job: JobRecord, events: RequestEvent[]) {
  const jobEvents = events.filter((e) => e.jobId === job.jobId);
  const requestsSent = jobEvents.length;
  const requestsAllowed = jobEvents.filter((e) => e.status !== null && e.status < 400).length;
  const requestsRejected = jobEvents.filter((e) => e.status === 429).length;
  const requestsFailed = jobEvents.filter((e) => e.failed).length;

  return { requestsSent, requestsAllowed, requestsRejected, requestsFailed, status: job.status };
}

function App() {
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

  return (
    <div id="dashboard-root" className="min-h-screen flex flex-col gap-6 p-6">
      <header id="dashboard-header" className="flex justify-between items-center">
        <h1 className="dashboard-title">Limit Lab</h1>
        <div className="flex gap-4 text-sm">
          <span id="metrics-connection-status">gateway: {metricsConnected ? "connected" : "disconnected"}</span>
          <span id="trafficgen-connection-status">traffic-gen: {trafficGenConnected ? "connected" : "disconnected"}</span>
        </div>
      </header>

      <JobConfigForm onJobStarted={handleJobStarted} />
      <JobsList jobsWithStats={jobsWithStats} selectedJobId={selectedJobId} onSelect={setSelectedJobId} onStop={handleStopJob} />

      <section id="global-metrics-panel" className="chart-card">
        <div className="flex justify-between items-center">
          <h2 className="chart-title">Global Gateway Metrics (all jobs combined, since last reset)</h2>
          <div className="flex gap-2">
            <button id="reset-metrics-btn" onClick={() => resetMetrics()}>reset metrics</button>
            <button id="invalidate-cache-btn" onClick={() => invalidateCache()}>invalidate cache</button>
          </div>
        </div>
        <div id="global-metrics-summary" className="flex flex-wrap gap-6 text-sm">
          <span>allowed: {latestTick?.rate.allowed ?? 0}</span>
          <span>rejected: {latestTick?.rate.rejected ?? 0}</span>
          <span>queued (total): {latestTick?.rate.queued ?? 0}</span>
          <span>cache hits: {latestTick?.cache.hits ?? 0}</span>
          <span>cache misses: {latestTick?.cache.misses ?? 0}</span>
          <span>hit rate: {latestTick ? `${Math.round(latestTick.cache.hitRate * 100)}%` : "n/a"}</span>
          <span>avg latency: {latestTick?.avgLatencyMs ?? 0}ms</span>
        </div>
      </section>

      {selectedJobId ? (
        <>
          <section id="job-charts-panel" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RequestsPerSecChart data={bucketedData} />
            <AllowedRejectedChart data={bucketedData} />
            <CacheHitRateChart data={bucketedData} />
            <LatencyChart data={bucketedData} />
          </section>
          <AlgorithmStateView algorithmState={latestTick?.algorithmState ?? null} />
          <RequestEventsTable events={selectedJobEvents} />
        </>
      ) : (
        <p id="no-job-selected-message">start or select a job above to see live charts</p>
      )}
    </div>
  );
}

export default App;