import type { RequestEvent } from "../hooks/useTrafficSocket";

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
              <td>{new Date(event.timestamp).toLocaleTimeString()}</td>
              <td>{event.clientId}</td>
              <td>{event.resourceId}</td>
              <td>{event.failed ? "FAILED" : event.status}</td>
              <td>{event.cacheStatus}</td>
              <td>{event.durationMs}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}