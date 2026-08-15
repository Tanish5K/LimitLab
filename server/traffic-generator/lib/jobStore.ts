import type { JobState } from "./types";

const jobs = new Map<string, JobState>();

export function createJob(job: JobState) {
  jobs.set(job.id, job);
}

export function updateJob(id: string, patch: Partial<JobState>) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...patch });
}

export function getJob(id: string) {
  return jobs.get(id);
}