import { Worker } from "bullmq";
import IOredis from "ioredis";

const connection = new IOredis({maxRetriesPerRequest: null});

const worker = new Worker("my-queue", async job => {
    //intentinally fail one time then pass the job to test retry mechanism this is not working as expected because the job is not being retried after the first failure, it is being marked as failed and not retried. This is because the worker is not throwing an error when the job fails, it is just logging the error and not throwing it. To fix this, we need to throw an error when the job fails so that the worker can retry the job according to the specified retry strategy.

    if(job.attemptsMade === 0){
        console.log(`Job ${job.id} is failing intentionally on the first attempt`);
        throw new Error("Intentional failure to test retry mechanism");
    }
    //print rety count and job data to console
    console.log(`Job ${job.id} has been retried ${job.attemptsMade} times`);
    console.log(`Processing job ${job.id} with data:`, job.data);
    // Simulate some work
    // await new Promise(resolve => setTimeout(resolve, 2000));
    // console.log(`Job ${job.id} completed`);
}, { connection });

worker.on('completed', (job) => {
    console.log(`Job ${job.id} has been completed`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} has failed with error:`, err);
});

console.log("Worker is running and waiting for jobs...");
