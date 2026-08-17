import type { JobRecord } from "../lib/types";

interface JobStats {
  requestsSent: number;
  requestsAllowed: number;
  requestsRejected: number;
  requestsFailed: number;
  status: JobRecord["status"];
}

interface JobsListProps {
  jobsWithStats: { job: JobRecord; stats: JobStats }[];
  selectedJobId: string | null;
  onSelect: (jobId: string) => void;
  onStop: (jobId: string) => void;
}

function statusStyle(status: JobRecord["status"]): React.CSSProperties {
  if (status === "running") return { color: "var(--ll-signal)" };
  if (status === "stopped") return { color: "var(--ll-reject)" };
  return { color: "var(--ll-text-dim)" };
}

export function JobsList({ jobsWithStats, selectedJobId, onSelect, onStop }: JobsListProps) {
  return (
    <section id="jobs-list-panel" className="chart-card">
      <h2 className="chart-title">Jobs</h2>
      <table id="jobs-table">
        <thead>
          <tr>
            <th>job</th>
            <th>pattern</th>
            <th>rps</th>
            <th>algorithm</th>
            <th>cache</th>
            <th>status</th>
            <th>sent</th>
            <th>allowed</th>
            <th>rejected</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {jobsWithStats.map(({ job, stats }) => (
            <tr
              key={job.jobId}
              className={job.jobId === selectedJobId ? "selected-job-row" : ""}
              onClick={() => onSelect(job.jobId)}
            >
              <td className="text-[var(--ll-text)]">{job.jobId.slice(0, 8)}</td>
              <td className="text-[var(--ll-text-dim)]">{job.trafficConfig.pattern}</td>
              <td className="text-[var(--ll-text)]">{job.trafficConfig.rps}</td>
              <td className="text-[var(--ll-text-dim)]">{job.rateLimiterConfig.algorithm}</td>
              <td style={{ color: job.cacheConfig.enabled ? "var(--ll-warn)" : "var(--ll-text-faint)" }}>
                {job.cacheConfig.enabled ? `on (${job.cacheConfig.ttlSeconds}s)` : "off"}
              </td>
              <td>
                <span className="inline-flex items-center gap-1.5" style={statusStyle(stats.status)}>
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: "currentColor", boxShadow: "0 0 6px currentColor" }}
                  />
                  {stats.status}
                </span>
              </td>
              <td className="text-[var(--ll-text)]">{stats.requestsSent}</td>
              <td style={{ color: "var(--ll-signal)" }}>{stats.requestsAllowed}</td>
              <td style={{ color: stats.requestsRejected > 0 ? "var(--ll-reject)" : "var(--ll-text-faint)" }}>
                {stats.requestsRejected}
              </td>
              <td>
                {stats.status === "running" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStop(job.jobId);
                    }}
                  >
                    stop
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
