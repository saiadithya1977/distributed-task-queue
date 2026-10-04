// Integration test for the dead-letter flow against a real Redis.
// Run: REDIS_URL=redis://localhost:6379 npm test
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Queue, Worker, QueueEvents } from "bullmq";
import { connection } from "../connection.js";
import { deadLetterQueue, isFinalFailure, listDeadLetters, moveToDeadLetter, replayDeadLetter, deadLetterCount } from "../dlq.js";
import { timingStats } from "../metrics.js";

const suffix = Date.now();
const main = new Queue(`test-main-${suffix}`, { connection, prefix: "bull" });
const dlq = new Queue(`test-dlq-${suffix}`, { connection, prefix: "bull" });
let worker;

before(async () => {
  worker = new Worker(
    main.name,
    async (job) => {
      if (job.data.shouldFail) throw new Error("SMTP timeout");
    },
    { connection, prefix: "bull" }
  );
  worker.on("failed", async (job, err) => {
    if (isFinalFailure(job)) await moveToDeadLetter(job, err, dlq);
  });
});

after(async () => {
  await worker.close();
  await main.obliterate({ force: true });
  await dlq.obliterate({ force: true });
  await main.close();
  await dlq.close();
  await deadLetterQueue.close();
  await connection.quit();
});

async function waitFor(check, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("Timed out waiting for condition");
}

test("a job that fails every retry ends up in the dead-letter queue exactly once", async () => {
  const job = await main.add("job", { userId: "u1", shouldFail: true }, { attempts: 3, backoff: { type: "fixed", delay: 20 } });

  await waitFor(async () => (await deadLetterCount(dlq)) === 1);

  const [entry] = await listDeadLetters(10, dlq);
  assert.equal(entry.originalJobId, job.id);
  assert.equal(entry.attempts, 3);
  assert.equal(entry.reason, "SMTP timeout");
  assert.deepEqual(entry.data, { userId: "u1", shouldFail: true });

  // A duplicate failure event must not create a second entry.
  await moveToDeadLetter(await main.getJob(job.id), new Error("dup"), dlq);
  assert.equal(await deadLetterCount(dlq), 1);
});

test("a job that succeeds on a retry never reaches the dead-letter queue", async () => {
  let calls = 0;
  const flaky = new Worker(`flaky-${suffix}`, async () => { if (++calls < 2) throw new Error("blip"); }, { connection, prefix: "bull" });
  const flakyQueue = new Queue(`flaky-${suffix}`, { connection, prefix: "bull" });
  const eventsConnection = connection.duplicate();
  const events = new QueueEvents(`flaky-${suffix}`, { connection: eventsConnection, prefix: "bull" });
  flaky.on("failed", async (job, err) => { if (isFinalFailure(job)) await moveToDeadLetter(job, err, dlq); });

  const before = await deadLetterCount(dlq);
  const job = await flakyQueue.add("job", {}, { attempts: 3, backoff: { type: "fixed", delay: 20 } });
  await job.waitUntilFinished(events, 5000);
  assert.equal(await deadLetterCount(dlq), before);

  await flaky.close();
  await events.close();
  await eventsConnection.quit();
  await flakyQueue.obliterate({ force: true });
  await flakyQueue.close();
});

test("replaying a dead-lettered job re-queues its original data and clears it from the DLQ", async () => {
  const [entry] = await listDeadLetters(10, dlq);
  const requeued = [];
  const result = await replayDeadLetter(entry.id, async (data) => { requeued.push(data); return { ok: true }; }, dlq);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(requeued, [{ userId: "u1", shouldFail: true }]);
  assert.equal(await deadLetterCount(dlq), 0);
  assert.equal(await replayDeadLetter("missing", async () => ({}), dlq), null);
});

test("timingStats computes wait, processing time and recent throughput", () => {
  const now = 1_000_000;
  const stats = timingStats(
    [
      { timestamp: now - 5000, processedOn: now - 4000, finishedOn: now - 3000 },
      { timestamp: now - 90_000, processedOn: now - 89_000, finishedOn: now - 88_000 },
      null,
      { timestamp: now - 10, processedOn: undefined, finishedOn: undefined },
    ],
    now
  );
  assert.deepEqual(stats, { sampleSize: 2, avgWaitMs: 1000, avgProcessingMs: 1000, completedLastMinute: 1 });
});
