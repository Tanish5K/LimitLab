import type { MetricsTick } from "../hooks/useMetricSocket";

function SlidingWindowView({ mode, clients }: { mode: "log" | "counter"; clients: { clientId: string; count: number }[] | { clientId: string; estimate: number }[] }) {
  const values = mode === "log" ? (clients as { clientId: string; count: number }[]).map((client) => client.count) : (clients as { clientId: string; estimate: number }[]).map((client) => client.estimate);
  const max = Math.max(1, ...values);
  return <section id="algorithm-state-view" className="ll-panel">
    <div className="ll-panel-header"><div><div className="ll-kicker">Algorithm state</div><h2 className="ll-panel-title">Sliding window {mode}</h2></div><span className="ll-panel-meta">live estimates</span></div>
    <div className="ll-gauge-list">
      {clients.map((client) => {
        const value = mode === "log" ? (client as { clientId: string; count: number }).count : (client as { clientId: string; estimate: number }).estimate;
        return <div className="ll-gauge-row" key={client.clientId}><span>cl:{client.clientId}</span><div className="ll-gauge-track"><div className="ll-gauge-track-fill" style={{ width: `${value / max * 100}%` }} /></div><span className="ll-gauge-output">{mode === "log" ? value : `~${value}`}</span></div>;
      })}
    </div>
  </section>;
}

export function AlgorithmStateView({ algorithmState }: { algorithmState: MetricsTick["algorithmState"] }) {
  if (!algorithmState) {
    return <div id="algorithm-state-view" className="ll-panel"><div className="ll-kicker">Algorithm state</div><h2 className="ll-panel-title">Token bucket</h2><div className="ll-empty">No active algorithm state</div></div>;
  }

  if (algorithmState.type === "token-bucket") {
    return <section id="algorithm-state-view" className="ll-panel">
      <div className="ll-panel-header"><div><div className="ll-kicker">Algorithm state</div><h2 className="ll-panel-title">Token bucket</h2></div><span className="ll-panel-meta">per client</span></div>
      <div className="ll-algorithm-grid">
        {algorithmState.clients.map((client) => {
          const percentage = client.capacity > 0 ? Math.max(0, Math.min(100, client.tokens / client.capacity * 100)) : 0;
          return <div className={`ll-client-card ${percentage < 20 ? "is-hot" : ""}`} key={client.clientId}>
            <div className="ll-client-top"><span className="ll-client-id">Client {client.clientId}</span><span>{client.tokens}/{client.capacity}</span></div>
            <div className="ll-gauge"><div className="ll-gauge-fill" style={{ "--gauge-height": `${percentage}%` } as React.CSSProperties} /></div>
            <div className="ll-client-value">{client.tokens} / {client.capacity}</div>
            <div className="ll-client-status">{percentage < 20 ? "Refilling" : "Healthy"}</div>
          </div>;
        })}
      </div>
    </section>;
  }

  if (algorithmState.type === "leaky-bucket") {
    return <section id="algorithm-state-view" className="ll-panel">
      <div className="ll-panel-header"><div><div className="ll-kicker">Algorithm state</div><h2 className="ll-panel-title">Leaky bucket</h2></div><span className="ll-panel-meta">live queue depth</span></div>
      <div className="ll-queue-state"><div className="ll-queue-bar" aria-hidden="true"><div className="ll-queue-bar-fill" /></div><div><div className="ll-queue-value">{algorithmState.totalQueueDepth}</div><div className="ll-queue-label">requests queued</div></div></div>
    </section>;
  }

  if (algorithmState.type === "sliding-window-log") return <SlidingWindowView mode="log" clients={algorithmState.clients} />;
  return <SlidingWindowView mode="counter" clients={algorithmState.clients} />;
}
