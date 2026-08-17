import { useMemo, useState } from "react";
import { JobConfigForm } from "./components/JobConfigForm";
import { JobsList } from "./components/JobsList";
import { RequestsPerSecChart } from "./components/charts/RequestsPerSecChart";
import { AllowedRejectedChart } from "./components/charts/AllowedRejectedChart";
import { CacheHitRateChart } from "./components/charts/CacheHitRateChart";
import { LatencyChart } from "./components/charts/LatencyChart";
import { AlgorithmStateView } from "./components/AlgorithmStateView";
import { RequestEventsTable } from "./components/RequestEventTable";
import { PipelineDiagram } from "./components/PipelineDiagram";
import { useDashboard } from "./hooks/useDashboard";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const points = useMemo(() => {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);
    return values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 100;
        const y = 21 - ((value - min) / span) * 17;
        return `${x},${y}`;
      })
      .join(" ");
  }, [values]);
  return (
    <svg className="ll-sparkline" viewBox="0 0 100 24" aria-hidden="true" style={{ "--ll-accent": color } as React.CSSProperties}>
      <polyline points={points} />
    </svg>
  );
}

function StatCard({ label, value, change, note, color, values }: { label: string; value: string; change: string; note: string; color: string; values: number[] }) {
  return (
    <article className="ll-stat-card" style={{ "--ll-accent": color } as React.CSSProperties}>
      <div className="ll-stat-top">
        <span className="ll-stat-label">{label}</span>
        <span className="ll-stat-change">{change}</span>
      </div>
      <div className="ll-stat-value">{value}</div>
      <div className="ll-stat-foot">
        <span className="ll-stat-note">{note}</span>
        <Sparkline values={values} color={color} />
      </div>
    </article>
  );
}

function ConnectionStatus({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="ll-connection" data-live={connected}>
      <span className="ll-connection-label"><span className="ll-dot" aria-hidden="true" />{label}</span>
      <span className="ll-connection-state">{connected ? "Connected" : "Offline"}</span>
    </div>
  );
}

function App() {
  const d = useDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const tick = d.latestTick;
  const allowed = tick?.rate.allowed ?? 0;
  const rejected = tick?.rate.rejected ?? 0;
  const hitRate = tick ? tick.cache.hitRate * 100 : 0;
  const latency = tick?.avgLatencyMs ?? 0;
  const allowedDelta = tick?.rate.allowedDelta ?? 0;
  const rejectedDelta = tick?.rate.rejectedDelta ?? 0;

  return (
    <div className={`ll-app ${sidebarOpen ? "" : "ll-sidebar-collapsed"}`}>
      <aside id="limit-lab-sidebar" className="ll-sidebar" aria-label="Limit Lab navigation">
        <div className="ll-brand">
          <div className="ll-brand-mark" aria-hidden="true">ϟ</div>
          <span className="ll-brand-name">Limit Lab</span>
          <span className="ll-beta">BETA</span>
        </div>
        <div className="ll-connection-list" aria-label="service connections">
          <ConnectionStatus label="Gateway" connected={d.metricsConnected} />
          <ConnectionStatus label="Traffic Gen" connected={d.trafficGenConnected} />
        </div>
        <nav className="ll-nav">
          <a className="ll-nav-link is-active" href="#overview"><span className="ll-nav-icon">◌</span>Overview</a>
          <a className="ll-nav-link" href="#jobs"><span className="ll-nav-icon">▣</span>Jobs</a>
          <a className="ll-nav-link" href="#traffic"><span className="ll-nav-icon">⌁</span>Traffic</a>
        </nav>
      </aside>

      <main className="ll-main">
        <header className="ll-topbar">
          <button
            id="sidebar-toggle"
            className="ll-sidebar-toggle"
            type="button"
            aria-expanded={sidebarOpen}
            aria-controls="limit-lab-sidebar"
            onClick={() => setSidebarOpen((open) => !open)}
            title={sidebarOpen ? "Collapse navigation" : "Expand navigation"}
          >
            <span aria-hidden="true">{sidebarOpen ? "‹" : "›"}</span>
            <span className="ll-toggle-label">{sidebarOpen ? "Collapse" : "Expand"}</span>
          </button>
          <span className="ll-topbar-live"><span className="ll-dot ll-live-dot" aria-hidden="true" />Live data streaming</span>
          <span className="ll-topbar-divider" aria-hidden="true" />
          <span>Updated just now</span>
          <div className="ll-topbar-actions">
            <button id="reset-metrics-btn" className="ll-btn-ghost" onClick={() => d.resetMetrics()}>Reset metrics</button>
            <button id="invalidate-cache-btn" className="ll-btn-ghost" onClick={() => d.invalidateCache()}>Invalidate cache</button>
          </div>
        </header>

        <section id="overview" aria-labelledby="overview-title">
          <h1 id="overview-title" className="visually-hidden">Limit Lab overview</h1>
          <div className="ll-stat-grid">
            <StatCard label="Allowed requests" value={formatNumber(allowed)} change={allowedDelta >= 0 ? `+${formatNumber(allowedDelta)}` : formatNumber(allowedDelta)} note="Total for Job" color="#63d58a" values={[Math.max(0, allowed - allowedDelta * 2), Math.max(0, allowed - allowedDelta), allowed]} />
            <StatCard label="Rejected requests" value={formatNumber(rejected)} change={rejectedDelta <= 0 ? formatNumber(rejectedDelta) : `+${formatNumber(rejectedDelta)}`} note="Total for Job" color="#ed777d" values={[Math.max(0, rejected - rejectedDelta * 2), Math.max(0, rejected - rejectedDelta), rejected]} />
            <StatCard label="Cache hit rate" value={tick ? `${hitRate.toFixed(1)}%` : "n/a"} change={tick ? `+${(tick.cache.hitsDelta / Math.max(tick.cache.total, 1) * 100).toFixed(1)}%` : "—"} note="% Throughout Job" color="#8a7cf3" values={[Math.max(0, hitRate - 2), Math.max(0, hitRate - 0.8), hitRate]} />
            <StatCard label="Avg. latency" value={`${formatNumber(latency)}ms`} change={latency ? `${(latency > 0 ? -1 : 0).toFixed(1)}%` : "—"} note="Average Throughout" color="#eac457" values={[latency + 2, latency + 1, latency]} />
          </div>
        </section>

        <PipelineDiagram className="ll-pipeline"/>

        <div className="ll-layout">
          <div className="ll-main-column">
            <section id="traffic" className="ll-panel ll-chart-panel">
              <div className="ll-panel-header">
                <div><div className="ll-kicker">Traffic volume</div><h2 className="ll-panel-title">Requests per second</h2></div>
                <select className="ll-select-compact" defaultValue="30"><option value="30">Last 30 seconds</option></select>
              </div>
              {d.selectedJobId ? <RequestsPerSecChart data={d.bucketedData} /> : <div className="ll-empty">Start or select a job to see live traffic volume.</div>}
            </section>

            <section className="ll-panel ll-chart-panel">
              <div className="ll-panel-header"><div><div className="ll-kicker">Rate limiter</div><h2 className="ll-panel-title">Allowed vs. rejected</h2></div><span className="ll-panel-meta">per second</span></div>
              {d.selectedJobId ? <AllowedRejectedChart data={d.bucketedData} /> : <div className="ll-empty">No selected job data yet.</div>}
            </section>

            <section id="algorithm-state-panel">
              <AlgorithmStateView algorithmState={tick?.algorithmState ?? null} />
            </section>

            <section id="request-log-panel">
              <RequestEventsTable events={d.selectedJobEvents} />
            </section>
          </div>

          <div className="ll-side-column">
            <section id="jobs" className="ll-panel">
              <div className="ll-panel-header"><div><div className="ll-kicker">Active workloads</div><h2 className="ll-panel-title">Jobs</h2></div><span className="ll-panel-meta">{d.jobsWithStats.length} total</span></div>
              <JobsList jobsWithStats={d.jobsWithStats} selectedJobId={d.selectedJobId} onSelect={d.setSelectedJobId} onStop={d.handleStopJob} />
              <details className="ll-form-details">
                <summary className="ll-start-summary"><span>＋</span> Start a new job</summary>
                <div className="ll-form-panel"><JobConfigForm onJobStarted={d.handleJobStarted} /></div>
              </details>
            </section>

            <section className="ll-panel ll-chart-panel">
              <div className="ll-panel-header"><div><div className="ll-kicker">Cache performance</div><h2 className="ll-panel-title">Cache hit rate</h2></div><span className="ll-panel-meta">live</span></div>
              {d.selectedJobId ? <CacheHitRateChart data={d.bucketedData} /> : <div className="ll-empty">Cache telemetry appears with a selected job.</div>}
            </section>

            <section className="ll-panel ll-chart-panel">
              <div className="ll-panel-header"><div><div className="ll-kicker">Gateway timing</div><h2 className="ll-panel-title">Average latency</h2></div><span className="ll-panel-meta">milliseconds</span></div>
              {d.selectedJobId ? <LatencyChart data={d.bucketedData} /> : <div className="ll-empty">Latency telemetry appears with a selected job.</div>}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
