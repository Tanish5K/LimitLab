// client/Dashboard/src/App.tsx
import { useState } from "react";
import { useMetricSocket } from "./hooks/useMetricSocket";
import { useTrafficSocket } from "./hooks/useTrafficSocket";

import {
  updateRateLimiterConfig,
  updateCacheConfig,
  startSimulation,
  stopSimulation,
  resetMetrics,
} from "./api/api";

function App() {
  const { connected: metricsConnected, ticks } = useMetricSocket();
  const { connected: trafficGenConnected, events } = useTrafficSocket();
  const [jobId, setJobId] = useState<string | null>(null);

  const latestTick = ticks[ticks.length - 1];
  const recentEvents = [...events].reverse().slice(0, 15); // newest first, capped for readability

  async function handleStart() {
    await resetMetrics();
    const { jobId } = await startSimulation({
      pattern: "constant",
      rps: 10,
      durationSeconds: 15,
      clients: 3,
      resourceMode: "unique",
    });
    setJobId(jobId);
  }

  async function handleStop() {
    if (!jobId) return;
    await stopSimulation(jobId);
    setJobId(null);
  }

  return (
    <div id="dashboard-root" className="min-h-screen p-6">
      <header id="dashboard-header" className="mb-4 flex gap-4">
        <span id="metrics-connection-status">
          gateway socket: {metricsConnected ? "connected" : "disconnected"}
        </span>
        <span id="trafficgen-connection-status">
          traffic-gen socket: {trafficGenConnected ? "connected" : "disconnected"}
        </span>
      </header>

      <section id="config-panel" className="mb-6 flex gap-4">
        <div id="traffic-config-form">{/* pattern/rps/duration/clients/resourceMode inputs go here */}</div>
        <div id="rate-limiter-config-form">{/* algorithm + params inputs go here */}</div>
        <div id="cache-config-form">{/* enabled + ttl inputs go here */}</div>
      </section>

      <section id="run-controls" className="mb-6 flex gap-2">
        <button id="start-btn" onClick={handleStart}>Start</button>
        <button id="stop-btn" onClick={handleStop} disabled={!jobId}>Stop</button>
      </section>

      <section id="metrics-panel" className="grid grid-cols-2 gap-4 mb-6">
        <div id="requests-chart">req/sec: {latestTick?.requestsPerSec ?? 0}</div>
        <div id="allowed-rejected-chart">
          allowed: {latestTick?.allowed ?? 0} / rejected: {latestTick?.rejected ?? 0}
        </div>
        <div id="cache-hit-rate-chart">hit rate: {latestTick?.cacheHitRate ?? "n/a"}</div>
        <div id="latency-chart">avg latency: {latestTick?.avgLatencyMs ?? 0}ms</div>
      </section>

      <section id="request-events-panel">
        <h2 id="request-events-heading">live requests</h2>
        <table id="request-events-table">
          <thead>
            <tr>
              <th>time</th>
              <th>client</th>
              <th>resource</th>
              <th>status</th>
              <th>cache</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.map((event, i) => (
              <tr key={`${event.timestamp}-${i}`}>
                <td>{new Date(event.timestamp).toLocaleTimeString()}</td>
                <td>{event.clientId}</td>
                <td>{event.resourceId}</td>
                <td>{event.failed ? "FAILED" : event.status}</td>
                <td>{event.cacheStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;
