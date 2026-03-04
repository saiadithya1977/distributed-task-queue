import { Queue } from "bullmq";
import { connection } from "./connection.js";
import User from "./Model.js";

const myQueue = new Queue("my-queue", {
  connection,
  prefix: "bull"
});

async function addJob(data) {
  const job = await myQueue.add("job", data, {
    attempts: Number(process.env.QUEUE_ATTEMPTS) || 3,
    backoff: {
      type: "exponential",
      delay: Number(process.env.QUEUE_BACKOFF_DELAY) || 5000,
    },
    removeOnFail: false,
    removeOnComplete: false,
  });

  console.log("Job added with id:", job.id);

  return {
    message: "Job added to the queue",
    jobId: job.id,
  };
}

async function getJobStatus(jobId) {
  const job = await myQueue.getJob(jobId);

  if (!job) {
    return {
      jobId,
      status: "not_found",
    };
  }

  const state = await job.getState();

  let status;

  switch (state) {
    case "waiting":
      status = "waiting";
      break;
    case "active":
      status = "processing";
      break;
    case "completed":
      status = "completed";
      break;
    case "failed":
      status = "failed";
      break;
    case "delayed":
      status = "retrying";
      break;
    default:
      status = "unknown";
  }

  return {
    jobId: job.id,
    status,
  };
}

async function getAllJobs() {
  try {
    const jobs = await myQueue.getJobs(
      ["waiting", "active", "completed", "failed", "delayed"],
      0,
      19
    );

    if (!jobs.length) {
      return [];
    }

    const userIds = [
      ...new Set(
        jobs
          .map((job) => job.data?.userId)
          .filter((id) => id)
      ),
    ];

    const users = await User.find(
      { _id: { $in: userIds } },
      { email: 1 }
    );

    const userMap = {};
    users.forEach((user) => {
      userMap[user._id.toString()] = user.email;
    });

    const formattedJobs = await Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState();

        let status;

        switch (state) {
          case "waiting":
            status = "waiting";
            break;
          case "active":
            status = "processing";
            break;
          case "completed":
            status = "completed";
            break;
          case "failed":
            status = "failed";
            break;
          case "delayed":
            status = "retrying";
            break;
          default:
            status = "unknown";
        }

        return {
          jobId: job.id,
          email: userMap[job.data?.userId] || "Unknown",
          status,
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason || null,
          timestamp: job.timestamp,
        };
      })
    );

    return formattedJobs;

  } catch (error) {
    console.error("Error fetching jobs:", error);
    return [];
  }
}

export { addJob, getJobStatus, getAllJobs };