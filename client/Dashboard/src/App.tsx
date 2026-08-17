import { useDashboard } from "./hooks/useDashboard";
import { JobConfigForm } from "./components/JobConfigForm";
import { JobsList } from "./components/JobsList";
import { RequestsPerSecChart } from "./components/charts/RequestsPerSecChart";
import { AllowedRejectedChart } from "./components/charts/AllowedRejectedChart";
import { CacheHitRateChart } from "./components/charts/CacheHitRateChart";
import { LatencyChart } from "./components/charts/LatencyChart";
import { AlgorithmStateView } from "./components/AlgorithmStateView";
import { RequestEventsTable } from "./components/RequestEventTable";
import { PipelineDiagram } from "./components/PipelineDiagram";

function App() {
  const d = useDashboard();

  return (
    <div id="dashboard-root" className="min-h-screen flex flex-col gap-8 p-6">
      <header id="dashboard-header" className="flex justify-between items-center gap-6 flex-wrap">
        <h1 className="dashboard-title">Limit Lab</h1>
        <div className="flex items-center gap-6">
          <span
            id="metrics-connection-status"
            className="ll-status-light"
            data-live={d.metricsConnected}
          >
            <span className="ll-dot" aria-hidden="true" />
            gateway: {d.metricsConnected ? "connected" : "disconnected"}
          </span>
          <span
            id="trafficgen-connection-status"
            className="ll-status-light"
            data-live={d.trafficGenConnected}
          >
            <span className="ll-dot" aria-hidden="true" />
            traffic-gen: {d.trafficGenConnected ? "connected" : "disconnected"}
          </span>
        </div>
      </header>

      <PipelineDiagram />

      <section id="new-job-section">
        <h2 className="ll-section-label">New Job</h2>
        <JobConfigForm onJobStarted={d.handleJobStarted} />
      </section>

      <section id="jobs-section">
        <h2 className="ll-section-label">Jobs</h2>
        <JobsList
          jobsWithStats={d.jobsWithStats}
          selectedJobId={d.selectedJobId}
          onSelect={d.setSelectedJobId}
          onStop={d.handleStopJob}
        />
      </section>

      <section id="global-metrics-panel" className="chart-card">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h2 className="chart-title">Global Gateway Metrics — all jobs combined, since last reset</h2>
          <div className="flex gap-2">
            <button id="reset-metrics-btn" className="ll-btn-ghost" onClick={() => d.resetMetrics()}>
              reset metrics
            </button>
            <button id="invalidate-cache-btn" className="ll-btn-ghost" onClick={() => d.invalidateCache()}>
              invalidate cache
            </button>
          </div>
        </div>
        <div id="global-metrics-summary" className="flex flex-wrap gap-8">
          <div className="ll-metric ll-metric--good">
            <span className="ll-metric__value">{d.latestTick?.rate.allowed ?? 0}</span>
            <span className="ll-metric__label">allowed</span>
          </div>
          <div className="ll-metric ll-metric--bad">
            <span className="ll-metric__value">{d.latestTick?.rate.rejected ?? 0}</span>
            <span className="ll-metric__label">rejected</span>
          </div>
          <div className="ll-metric">
            <span className="ll-metric__value">{d.latestTick?.rate.queued ?? 0}</span>
            <span className="ll-metric__label">queued (total)</span>
          </div>
          <div className="ll-metric">
            <span className="ll-metric__value">{d.latestTick?.cache.hits ?? 0}</span>
            <span className="ll-metric__label">cache hits</span>
          </div>
          <div className="ll-metric">
            <span className="ll-metric__value">{d.latestTick?.cache.misses ?? 0}</span>
            <span className="ll-metric__label">cache misses</span>
          </div>
          <div className="ll-metric ll-metric--warn">
            <span className="ll-metric__value">
              {d.latestTick ? `${Math.round(d.latestTick.cache.hitRate * 100)}%` : "n/a"}
            </span>
            <span className="ll-metric__label">hit rate</span>
          </div>
          <div className="ll-metric">
            <span className="ll-metric__value">{d.latestTick?.avgLatencyMs ?? 0}ms</span>
            <span className="ll-metric__label">avg latency</span>
          </div>
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
