import type { JobRecord } from "../lib/types";

interface JobsListProps {
  jobs: JobRecord[];
  selectedJobId: string | null;
  onSelect: (jobId: string) => void;
  onStop: (jobId: string) => void;
}

export function JobsList({ jobs, selectedJobId, onSelect, onStop }: JobsListProps) {
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
          {jobs.map((job) => (
            <tr
              key={job.jobId}
              className={job.jobId === selectedJobId ? "selected-job-row" : ""}
              onClick={() => onSelect(job.jobId)}
            >
              <td>{job.jobId.slice(0, 8)}</td>
              <td>{job.trafficConfig.pattern}</td>
              <td>{job.trafficConfig.rps}</td>
              <td>{job.rateLimiterConfig.algorithm}</td>
              <td>{job.cacheConfig.enabled ? `on (${job.cacheConfig.ttlSeconds}s)` : "off"}</td>
              <td>{job.status}</td>
              <td>{job.liveState?.requestsSent ?? "—"}</td>
              <td>{job.liveState?.requestsAllowed ?? "—"}</td>
              <td>{job.liveState?.requestsRejected ?? "—"}</td>
              <td>
                {job.status === "running" && (
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