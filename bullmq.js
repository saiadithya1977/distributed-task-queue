import { Queue } from "bullmq";
import { connection } from "./connection.js";

const myQueue = new Queue("my-queue", { connection });

async function addJob(data){
    const job = await myQueue.add("job", data, {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000
        },
        removeOnFailed: false
    });

    console.log("Job added with id:", job.id);
    return { message: "Job added to the queue", jobId: job.id };
}

async function getJobStatus(jobId){
    const job = await myQueue.getJob(jobId);
    if(!job){
        return { message: "Job not found" };
    }

    const state = await job.getState();
    console.log("Current state:", state);

    return { jobId: job.id, status: state };
}

export { addJob, getJobStatus };