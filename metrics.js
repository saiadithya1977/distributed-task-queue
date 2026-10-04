// Pure helpers for queue health numbers, kept separate so they are easy to test.

const average = (values) =>
  values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;

/**
 * Timing stats from a sample of completed jobs.
 * - avgWaitMs: time a job sat in the queue before a worker picked it up
 * - avgProcessingMs: time a worker spent running it
 * - completedLastMinute: throughput over the last 60 seconds of the sample
 */
export function timingStats(completedJobs, now = Date.now()) {
  const jobs = completedJobs.filter((j) => j && j.processedOn && j.finishedOn);
  return {
    sampleSize: jobs.length,
    avgWaitMs: average(jobs.map((j) => j.processedOn - j.timestamp)),
    avgProcessingMs: average(jobs.map((j) => j.finishedOn - j.processedOn)),
    completedLastMinute: jobs.filter((j) => j.finishedOn >= now - 60_000).length,
  };
}
