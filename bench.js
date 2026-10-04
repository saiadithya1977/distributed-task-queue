// Measures raw queue throughput: how many jobs per second BullMQ + Redis can move
// through enqueue -> worker -> completed, with a no-op job body.
// It measures the queue itself, not email sending (which is deliberately slow).
//
// Usage: node bench.js [jobs] [concurrency]
//   e.g. REDIS_URL=redis://localhost:6379 node bench.js 10000 50
import { Queue, Worker, QueueEvents } from "bullmq";
import { connection } from "./connection.js";

const TOTAL = Number(process.argv[2]) || 5000;
const CONCURRENCY = Number(process.argv[3]) || 50;
const name = `bench-${Date.now()}`;

const queue = new Queue(name, { connection, prefix: "bull" });
let done = 0;
let resolveDone;
const finished = new Promise((r) => (resolveDone = r));

const worker = new Worker(name, async () => {}, {
  connection: connection.duplicate(),
  prefix: "bull",
  concurrency: CONCURRENCY,
  removeOnComplete: { count: 0 },
});
worker.on("completed", () => {
  if (++done === TOTAL) resolveDone();
});

await worker.waitUntilReady();
const start = performance.now();

// Enqueue in batches, as a busy API would.
for (let i = 0; i < TOTAL; i += 500) {
  const batch = Array.from({ length: Math.min(500, TOTAL - i) }, (_, k) => ({ name: "job", data: { n: i + k } }));
  await queue.addBulk(batch);
}

await finished;
const seconds = (performance.now() - start) / 1000;
console.log(`${TOTAL} jobs, concurrency ${CONCURRENCY}: ${seconds.toFixed(2)} s -> ${Math.round(TOTAL / seconds)} jobs/s`);

await worker.close();
await queue.obliterate({ force: true });
await queue.close();
await connection.quit();
