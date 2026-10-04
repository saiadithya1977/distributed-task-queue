import { Queue } from "bullmq";
import { connection } from "./connection.js";

// Jobs that exhaust every retry are moved here instead of sitting in the main
// queue's failed set. Nothing consumes this queue automatically: an operator
// inspects the jobs and replays them once the root cause is fixed.
export const DEAD_LETTER_QUEUE = "my-queue-dead-letter";

export const deadLetterQueue = new Queue(DEAD_LETTER_QUEUE, {
  connection,
  prefix: "bull",
});

/** True when BullMQ will not retry this job again. */
export function isFinalFailure(job) {
  return Boolean(job) && job.attemptsMade >= (job.opts.attempts ?? 1);
}

/**
 * Copies a permanently failed job into the dead-letter queue.
 * Uses the original job id as the dead-letter job id, so a duplicate
 * "failed" event can never create two dead-letter entries.
 */
export async function moveToDeadLetter(job, err, queue = deadLetterQueue) {
  return queue.add(
    "dead-letter",
    {
      originalJobId: job.id,
      originalQueue: job.queueName,
      data: job.data,
      reason: err?.message ?? job.failedReason ?? "unknown",
      attempts: job.attemptsMade,
      failedAt: Date.now(),
    },
    { jobId: `dlq-${job.id}`, removeOnComplete: true, removeOnFail: false }
  );
}

export async function listDeadLetters(limit = 50, queue = deadLetterQueue) {
  const jobs = await queue.getJobs(["waiting", "delayed", "paused"], 0, limit - 1);
  return jobs
    .filter(Boolean)
    .map((job) => ({ id: job.id, ...job.data }))
    .sort((a, b) => b.failedAt - a.failedAt);
}

/** Puts a dead-lettered job back on its original queue and removes it from the DLQ. */
export async function replayDeadLetter(id, addJobFn, queue = deadLetterQueue) {
  const job = await queue.getJob(id);
  if (!job) return null;
  const result = await addJobFn(job.data.data);
  await job.remove();
  return result;
}

export async function deadLetterCount(queue = deadLetterQueue) {
  const counts = await queue.getJobCounts("waiting", "delayed", "paused");
  return counts.waiting + counts.delayed + counts.paused;
}
