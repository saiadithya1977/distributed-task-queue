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

* Dead-letter queue handling
* Rate limiting for external APIs
* Real email provider integration
* WebSocket notifications instead of polling
* Monitoring dashboard

---

##Author

Kuchana Sai Adithya

---

## License

This project is for learning and demonstration purposes.
