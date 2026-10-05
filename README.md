# distributed-task-queue   

# Reliable Background Job Processing System (Node.js + Redis + BullMQ)

A fault-tolerant background task processing service that decouples slow operations (like sending emails) from the main API using a Redis-backed job queue and worker processes.

This project demonstrates how real backend systems handle retries, failures, and scalability instead of blocking HTTP requests.

---

## Problem

In a typical backend:

```
User registers → API sends email → waits for email service
```

Problems:

* API becomes slow
* Users wait for response
* If email provider is down → request fails
* High traffic can crash the server

Slow external operations should **never run inside the request-response cycle**.

---

## Solution

Move long-running tasks to a background worker using a queue.

The API only **accepts the request**, and the worker performs the work later.

```
Client → API → Queue → Worker → Email/External Service
```

The user gets an instant response while the system processes reliably in the background.

---

## System Architecture

```
                ┌──────────────┐
                │    Client    │
                └──────┬───────┘
                       │ HTTP
                       ▼
                ┌──────────────┐
                │   API Server │  (Producer)
                └──────┬───────┘
                       │ Adds Job
                       ▼
                ┌──────────────┐
                │  Redis Queue │
                └──────┬───────┘
                       │ Consumes Job
                       ▼
                ┌──────────────┐
                │    Worker    │  (Consumer)
                └──────┬───────┘
                       │
                       ▼
                External Service / Database
```

---

## Features

* Asynchronous job processing
* Redis-backed persistent queue
* Background worker execution
* Job status tracking endpoint
* Automatic retries
* Exponential backoff
* Failure recovery
* Horizontal worker scaling
* Idempotent job handling (prevents duplicate actions)
* Dead-letter queue for jobs that exhaust every retry, with replay
* Live monitoring dashboard (queue depth, job states, wait and processing time)
* Throughput benchmark script

---

## How It Works

1. User calls `POST /register`
2. API stores user and pushes a job to the queue
3. API immediately returns `jobId`
4. Worker picks the job and performs the task
5. Client checks status via `GET /job/:jobId`

---

## 📡 Job Lifecycle

```
waiting → active → completed
           │
           └─(error)→ delayed → retry → completed
                                  │
                                  └─(all attempts used)→ dead-letter queue → replay
```

The system guarantees **at-least-once execution** while idempotency ensures the real-world action occurs only once.

---

## Reliability Concepts Implemented

### Retry with Backoff

If a job fails (e.g., network issue), it is retried automatically after a delay instead of failing permanently.

### Failure Recovery

If a worker crashes mid-job, the queue detects the stalled job and reprocesses it.

### Idempotency

Prevents duplicate side-effects such as sending the same email twice.

### Horizontal Scaling

Multiple workers can run simultaneously and share the workload automatically.

### Dead-Letter Queue

When a job fails on its final attempt, the worker copies it (original data, error and attempt count) into
a separate `my-queue-dead-letter` queue and records it in MongoDB. Nothing consumes the dead-letter queue
automatically: an operator inspects the failures and replays a job once the root cause is fixed.

* The dead-letter entry uses the original job id, so a duplicate failure event cannot create two entries.
* A MongoDB outage does not stop a job from reaching the dead-letter queue.

| Endpoint | Purpose |
| --- | --- |
| `GET /dlq` | List dead-lettered jobs, newest first |
| `POST /dlq/:id/replay` | Re-queue the original job data and remove it from the dead-letter queue |

---

## Monitoring Dashboard

Open `http://localhost:3000/dashboard` while the API is running. It refreshes every 2 seconds from
`/metrics`, `/jobs` and `/dlq` and shows:

* Waiting, active, retrying, completed, failed and dead-lettered job counts
* Average time a job waits in the queue and average processing time (last 500 completed jobs)
* Jobs completed in the last minute
* The dead-letter queue, with a **Replay** button per job
* The most recent jobs with status, attempts and error

---

## Benchmark

`bench.js` measures raw queue throughput: jobs moving through enqueue → worker → completed with a
no-op job body (it measures the queue, not email sending).

```bash
REDIS_URL=redis://localhost:6379 npm run bench
```

On a 2-core machine with local Redis: **~8,000–9,000 jobs/s** at concurrency 10–50.
Results depend on hardware and on Redis latency, so a hosted Redis over TLS will be slower.

---

## Tests

```bash
REDIS_URL=redis://localhost:6379 npm test
```

Integration tests run against a real Redis and cover: a job that fails every retry lands in the
dead-letter queue exactly once, a job that succeeds on retry never does, replay re-queues the original
data, and the timing statistics used by the dashboard.

---

## Tech Stack

* Node.js
* Express.js
* Redis
* BullMQ
* Docker

---

## Running the Project

### 1. Start Redis (Docker)

```bash
docker run -d -p 6379:6379 --name redis redis
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start API server

```bash
node server.js
```

### 4. Start worker (separate terminal)

```bash
node worker.js
```

You can start multiple workers to test scaling.

---

## Checking Job Status

After registering:

```
GET /job/:jobId
```

Possible responses:

```
waiting
active
completed
failed
delayed
```

---

## Testing Failure Handling

If the worker fails:

* The job is retried automatically
* No user action required
* System eventually completes the task

---

## Why This Matters

Real production systems cannot rely on synchronous execution for:

* Email notifications
* Payment confirmation
* Order processing
* Webhooks
* Report generation

This project demonstrates the **queue-based architecture** used in large-scale backend systems.

---

## What This Project Demonstrates

* Distributed system thinking
* Event-driven architecture
* Fault-tolerant design
* Reliable background processing
* Separation of API and worker responsibilities

---

## Future Improvements

* Real email provider integration
* WebSocket notifications instead of polling
* Alerting when the dead-letter queue grows

---

##Author

Kuchana Sai Adithya

---

## License

This project is for learning and demonstration purposes.
