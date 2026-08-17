import type { MetricsTick } from "../hooks/useMetricSocket";

export function AlgorithmStateView({ algorithmState }: { algorithmState: MetricsTick["algorithmState"] }) {
  if (!algorithmState) {
    return (
      <div id="algorithm-state-view" className="chart-card">
        <h3 className="chart-title">Algorithm State</h3>
        <div className="ll-mono text-sm text-[var(--ll-text-faint)] py-6 text-center tracking-wider uppercase">
          no active algorithm state
        </div>
      </div>
    );
  }

  if (algorithmState.type === "token-bucket") {
    return (
      <div id="algorithm-state-view" className="chart-card">
        <h3 className="chart-title">Token Bucket — Live Client State</h3>
        <div className="flex flex-col gap-3">
          {algorithmState.clients.map((c) => {
            const pct = c.capacity > 0 ? (c.tokens / c.capacity) * 100 : 0;
            return (
              <div key={c.clientId} className="flex items-center gap-3">
                <span className="ll-mono w-16 text-xs text-[var(--ll-text-dim)] tabular-nums">
                  {"cl:"}{c.clientId}
                </span>
                <div className="token-gauge-track flex-1">
                  <div className="token-gauge-fill" style={{ width: `${pct}%` }} />
                </div>
                <span
                  className="ll-mono w-20 text-right text-xs tabular-nums"
                  style={{ color: pct < 20 ? "var(--ll-reject)" : "var(--ll-signal)" }}
                >
                  {c.tokens}/{c.capacity}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (algorithmState.type === "leaky-bucket") {
    return (
      <div id="algorithm-state-view" className="chart-card">
        <h3 className="chart-title">Leaky Bucket — Live Queue Depth</h3>
        <div className="flex items-center gap-4 py-2">
          {/* decorative flow/pressure indicator (ambient, not data-scaled) */}
          <div
            aria-hidden="true"
            className="h-14 w-2 rounded-full overflow-hidden shrink-0"
            style={{ background: "var(--ll-bg)", border: "1px solid var(--ll-line)" }}
          >
            <div
              className="w-full"
              style={{
                height: "100%",
                background:
                  "repeating-linear-gradient(0deg, var(--ll-signal) 0 4px, transparent 4px 10px)",
                animation: "ll-dash 1.2s linear infinite",
                opacity: 0.7,
              }}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="ll-mono text-5xl font-semibold tabular-nums text-[var(--ll-signal)] leading-none">
              {algorithmState.totalQueueDepth}
            </span>
            <span className="ll-mono text-xs uppercase tracking-widest text-[var(--ll-text-dim)]">
              requests queued
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (algorithmState.type === "sliding-window-log") {
    const max = Math.max(1, ...algorithmState.clients.map((c) => c.count));
    return (
      <div id="algorithm-state-view" className="chart-card">
        <h3 className="chart-title">Sliding Window (log) — Live Counts</h3>
        <div className="flex flex-col gap-2.5">
          {algorithmState.clients.map((c) => (
            <div key={c.clientId} className="flex items-center gap-3">
              <span className="ll-mono w-20 text-xs text-[var(--ll-text-dim)] tabular-nums shrink-0">
                {"cl:"}{c.clientId}
              </span>
              <div className="token-gauge-track flex-1">
                <div className="token-gauge-fill" style={{ width: `${(c.count / max) * 100}%` }} />
              </div>
              <span className="ll-mono w-24 text-right text-xs tabular-nums text-[var(--ll-signal)]">
                {c.count} <span className="text-[var(--ll-text-faint)]">in win</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const max = Math.max(1, ...algorithmState.clients.map((c) => c.estimate));
  return (
    <div id="algorithm-state-view" className="chart-card">
      <h3 className="chart-title">Sliding Window (counter) — Live Estimates</h3>
      <div className="flex flex-col gap-2.5">
        {algorithmState.clients.map((c) => (
          <div key={c.clientId} className="flex items-center gap-3">
            <span className="ll-mono w-20 text-xs text-[var(--ll-text-dim)] tabular-nums shrink-0">
              {"cl:"}{c.clientId}
            </span>
            <div className="token-gauge-track flex-1">
              <div className="token-gauge-fill" style={{ width: `${(c.estimate / max) * 100}%` }} />
            </div>
            <span className="ll-mono w-24 text-right text-xs tabular-nums text-[var(--ll-signal)]">
              ~{c.estimate} <span className="text-[var(--ll-text-faint)]">in win</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
