import type { MetricsTick } from "../hooks/useMetricSocket";

export function AlgorithmStateView({ algorithmState }: { algorithmState: MetricsTick["algorithmState"] }) {
  if (!algorithmState) {
    return <div id="algorithm-state-view" className="chart-card">no active algorithm state</div>;
  }

  if (algorithmState.type === "token-bucket") {
    return (
      <div id="algorithm-state-view" className="chart-card">
        <h3 className="chart-title">Token Bucket — Live Client State</h3>
        <div className="flex flex-col gap-2">
          {algorithmState.clients.map((c) => (
            <div key={c.clientId} className="flex items-center gap-2">
              <span className="w-16">client {c.clientId}</span>
              <div className="token-gauge-track flex-1">
                <div
                  className="token-gauge-fill"
                  style={{ width: `${c.capacity > 0 ? (c.tokens / c.capacity) * 100 : 0}%` }}
                />
              </div>
              <span className="w-20 text-right">{c.tokens}/{c.capacity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (algorithmState.type === "leaky-bucket") {
    return (
      <div id="algorithm-state-view" className="chart-card">
        <h3 className="chart-title">Leaky Bucket — Live Queue Depth</h3>
        <div className="text-2xl">{algorithmState.totalQueueDepth} requests queued</div>
      </div>
    );
  }

  if (algorithmState.type === "sliding-window-log") {
    return (
      <div id="algorithm-state-view" className="chart-card">
        <h3 className="chart-title">Sliding Window (log) — Live Counts</h3>
        <div className="flex flex-col gap-2">
          {algorithmState.clients.map((c) => (
            <div key={c.clientId} className="flex justify-between">
              <span>client {c.clientId}</span>
              <span>{c.count} in window</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="algorithm-state-view" className="chart-card">
      <h3 className="chart-title">Sliding Window (counter) — Live Estimates</h3>
      <div className="flex flex-col gap-2">
        {algorithmState.clients.map((c) => (
          <div key={c.clientId} className="flex justify-between">
            <span>client {c.clientId}</span>
            <span>~{c.estimate} in window</span>
          </div>
        ))}
      </div>
    </div>
  );
}