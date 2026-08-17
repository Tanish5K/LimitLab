import type { RequestEvent } from "../hooks/useTrafficSocket";

function statusColor(event: RequestEvent) {
  if (event.failed || event.status === 429) return "var(--ll-red)";
  if (event.status !== null && event.status < 400) return "var(--ll-green)";
  return "var(--ll-yellow)";
}
function cacheColor(status: RequestEvent["cacheStatus"]) {
  if (status === "cache-hit") return "var(--ll-green)";
  if (status === "cache-miss") return "var(--ll-text-dim)";
  return "var(--ll-text-faint)";
}

export function RequestEventsTable({ events }: { events: RequestEvent[] }) {
  const recent = [...events].reverse().slice(0, 25);
  return <section id="request-events-panel" className="ll-panel">
    <div className="ll-panel-header"><div><div className="ll-kicker">Live request log</div><h2 className="ll-panel-title">Recent events</h2></div><span className="ll-panel-meta">{recent.length} shown</span></div>
    {recent.length === 0 ? <div className="ll-empty">Request events will appear here when the selected job is active.</div> : <div className="ll-table-wrap"><table id="request-events-table" className="ll-request-table"><thead><tr><th>Time</th><th>Client</th><th>Resource</th><th>Status</th><th>Cache</th><th>Latency</th></tr></thead><tbody>
      {recent.map((event, index) => <tr key={`${event.timestamp}-${index}`}><td className="ll-mono">{new Date(event.timestamp).toLocaleTimeString()}</td><td className="ll-mono">{event.clientId}</td><td className="ll-mono">{event.resourceId}</td><td style={{ color: statusColor(event) }}>{event.failed ? "FAILED" : event.status}</td><td style={{ color: cacheColor(event.cacheStatus) }}>{event.cacheStatus}</td><td className="ll-mono">{event.durationMs}ms</td></tr>)}
    </tbody></table></div>}
  </section>;
}
