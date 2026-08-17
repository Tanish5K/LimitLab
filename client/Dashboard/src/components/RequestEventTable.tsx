import type { RequestEvent } from "../hooks/useTrafficSocket";

function statusColor(event: RequestEvent) {
  if (event.failed) return "var(--ll-reject)";
  if (event.status === 429) return "var(--ll-reject)";
  if (event.status !== null && event.status < 400) return "var(--ll-signal)";
  return "var(--ll-warn)";
}

function cacheColor(cacheStatus: RequestEvent["cacheStatus"]) {
  if (cacheStatus === "cache-hit") return "var(--ll-signal)";
  if (cacheStatus === "cache-miss") return "var(--ll-text-dim)";
  return "var(--ll-text-faint)";
}

export function RequestEventsTable({ events }: { events: RequestEvent[] }) {
  const recent = [...events].reverse().slice(0, 25);

  return (
    <section id="request-events-panel" className="chart-card">
      <h3 className="chart-title">Live Requests</h3>
      <table id="request-events-table">
        <thead>
          <tr>
            <th>time</th>
            <th>client</th>
            <th>resource</th>
            <th>status</th>
            <th>cache</th>
            <th>latency</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((event, i) => (
            <tr key={`${event.timestamp}-${i}`}>
              <td className="text-[var(--ll-text-faint)]">{new Date(event.timestamp).toLocaleTimeString()}</td>
              <td className="text-[var(--ll-text-dim)]">{event.clientId}</td>
              <td className="text-[var(--ll-text-dim)]">{event.resourceId}</td>
              <td style={{ color: statusColor(event) }}>{event.failed ? "FAILED" : event.status}</td>
              <td style={{ color: cacheColor(event.cacheStatus) }}>{event.cacheStatus}</td>
              <td className="text-[var(--ll-text)]">{event.durationMs}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
