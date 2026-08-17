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
  if (jobsWithStats.length === 0) return <div className="ll-empty">No jobs yet. Start a workload below.</div>;

  return (
    <div id="jobs-list-panel" className="ll-list">
      {jobsWithStats.map(({ job, stats }) => {
        const status = stats.status;
        const statusLabel = status === "running" ? "Running" : status[0].toUpperCase() + status.slice(1);
        return (
          <div key={job.jobId} className={`ll-job ${job.jobId === selectedJobId ? "is-selected" : ""}`} onClick={() => onSelect(job.jobId)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(job.jobId); }}>
            <div className="ll-job-icon" aria-hidden="true">▱</div>
            <div className="ll-job-main">
              <div className="ll-job-name" title={job.jobId}>{job.jobId.slice(0, 12)}</div>
              <div className="ll-job-sub">{job.rateLimiterConfig.algorithm} · {job.trafficConfig.rps} req/s</div>
              <div className="ll-job-stats"><span>{stats.requestsSent} sent</span><span style={{ color: "var(--ll-green)" }}>{stats.requestsAllowed} allowed</span><span style={{ color: stats.requestsRejected ? "var(--ll-red)" : undefined }}>{stats.requestsRejected} rejected</span></div>
            </div>
            <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
              <span className="ll-job-status" data-status={status}><span className="ll-status-dot" />{statusLabel}</span>
              {status === "running" && <button className="ll-btn-danger" onClick={(event) => { event.stopPropagation(); void onStop(job.jobId); }}>Stop</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
