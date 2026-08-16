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
              <td>{job.jobId.slice(0, 8)}</td>
              <td>{job.trafficConfig.pattern}</td>
              <td>{job.trafficConfig.rps}</td>
              <td>{job.rateLimiterConfig.algorithm}</td>
              <td>{job.cacheConfig.enabled ? `on (${job.cacheConfig.ttlSeconds}s)` : "off"}</td>
              <td>{stats.status}</td>
              <td>{stats.requestsSent}</td>
              <td>{stats.requestsAllowed}</td>
              <td>{stats.requestsRejected}</td>
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