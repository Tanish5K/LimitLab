import { useDashboard } from "./hooks/useDashboard";
import { JobConfigForm } from "./components/JobConfigForm";
import { JobsList } from "./components/JobsList";
import { RequestsPerSecChart } from "./components/charts/RequestsPerSecChart";
import { AllowedRejectedChart } from "./components/charts/AllowedRejectedChart";
import { CacheHitRateChart } from "./components/charts/CacheHitRateChart";
import { LatencyChart } from "./components/charts/LatencyChart";
import { AlgorithmStateView } from "./components/AlgorithmStateView";
import { RequestEventsTable } from "./components/RequestEventTable";

function App() {
  const d = useDashboard();

  return (
    <div id="dashboard-root" className="min-h-screen flex flex-col gap-6 p-6">
      <header id="dashboard-header" className="flex justify-between items-center">
        <h1 className="dashboard-title">Limit Lab</h1>
        <div className="flex gap-4 text-sm">
          <span id="metrics-connection-status">gateway: {d.metricsConnected ? "connected" : "disconnected"}</span>
          <span id="trafficgen-connection-status">traffic-gen: {d.trafficGenConnected ? "connected" : "disconnected"}</span>
        </div>
      </header>

      <JobConfigForm onJobStarted={d.handleJobStarted} />
      <JobsList jobsWithStats={d.jobsWithStats} selectedJobId={d.selectedJobId} onSelect={d.setSelectedJobId} onStop={d.handleStopJob} />

      <section id="global-metrics-panel" className="chart-card">
        <div className="flex justify-between items-center">
          <h2 className="chart-title">Global Gateway Metrics (all jobs combined, since last reset)</h2>
          <div className="flex gap-2">
            <button id="reset-metrics-btn" onClick={() => d.resetMetrics()}>reset metrics</button>
            <button id="invalidate-cache-btn" onClick={() => d.invalidateCache()}>invalidate cache</button>
          </div>
        </div>
        <div id="global-metrics-summary" className="flex flex-wrap gap-6 text-sm">
          <span>allowed: {d.latestTick?.rate.allowed ?? 0}</span>
          <span>rejected: {d.latestTick?.rate.rejected ?? 0}</span>
          <span>queued (total): {d.latestTick?.rate.queued ?? 0}</span>
          <span>cache hits: {d.latestTick?.cache.hits ?? 0}</span>
          <span>cache misses: {d.latestTick?.cache.misses ?? 0}</span>
          <span>hit rate: {d.latestTick ? `${Math.round(d.latestTick.cache.hitRate * 100)}%` : "n/a"}</span>
          <span>avg latency: {d.latestTick?.avgLatencyMs ?? 0}ms</span>
        </div>
      </section>

      {d.selectedJobId ? (
        <>
          <section id="job-charts-panel" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RequestsPerSecChart data={d.bucketedData} />
            <AllowedRejectedChart data={d.bucketedData} />
            <CacheHitRateChart data={d.bucketedData} />
            <LatencyChart data={d.bucketedData} />
          </section>
          <AlgorithmStateView algorithmState={d.latestTick?.algorithmState ?? null} />
          <RequestEventsTable events={d.selectedJobEvents} />
        </>
      ) : (
        <p id="no-job-selected-message">start or select a job above to see live charts</p>
      )}
    </div>
  );
}

export default App;