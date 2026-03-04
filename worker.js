import pkg from "bullmq";
const { Worker } = pkg;

import User from "./Model.js";
import connectDB from "./db.js";
import FailedJob from "./Failedjobs.js";
import "dotenv/config";
import { sendWelcomeEmail } from "./services/mailService.js";
import { connection } from "./connection.js";

async function startWorker() {
  try {
    await connectDB();
    console.log("MongoDB connected (Worker)");

    const worker = new Worker(
      "my-queue",
      async (job) => {
        console.log(`\nProcessing job ${job.id} (attempt ${job.attemptsMade + 1})`);

        const { userId } = job.data;

        const user = await User.findById(userId);

        if (!user) {
          console.log("User not found. Skipping job.");
          return;
        }

        if (user.emailSent) {
          console.log(`Job ${job.id}: Email already sent to ${user.email}. Skipping.`);
          return;
        }

        await sendWelcomeEmail(user);

        user.emailSent = true;
        await user.save();

        console.log(`Email successfully recorded for ${user.email}`);
      },
      {
        connection,

        concurrency: Number(process.env.WORKER_CONCURRENCY) || 2,

        limiter: {
          max: Number(process.env.WORKER_RATE_LIMIT_MAX) || 5,
          duration: Number(process.env.WORKER_RATE_LIMIT_DURATION) || 5000
        }
      }
    );

    worker.on("ready", () => {
      console.log("Worker connected to Redis");
    });

    worker.on("active", (job) => {
      console.log(`Job ${job.id} started processing`);
    });

    worker.on("completed", (job) => {
      console.log(`Job ${job.id} completed`);
    });

    worker.on("failed", async (job, err) => {
      console.log(`Job ${job?.id} failed: ${err.message}`);

      if (job && job.attemptsMade >= job.opts.attempts) {
        console.log(`Job ${job.id} permanently failed. Saving to Dead Letter DB.`);

        await FailedJob.create({
          jobId: job.id,
          userId: job.data.userId,
          reason: err.message,
          attempts: job.attemptsMade
        });
      }
    });

    worker.on("error", (err) => {
      console.error("Worker error:", err);
    });

    console.log("Worker is running and waiting for jobs...");

    const shutdown = async () => {
      console.log("Shutting down worker...");
      await worker.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (err) {
    console.error("Worker startup failed:", err);
  }
}

startWorker();