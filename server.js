import express from 'express';
const port = process.env.PORT || 3000;
import {addJob,getJobStatus,getAllJobs,getQueueMetrics} from './bullmq.js';
import { listDeadLetters, replayDeadLetter } from './dlq.js';
import connectDB from './db.js';
import User from './Model.js';
import FailedJob from './Failedjobs.js';
import 'dotenv/config';
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

connectDB();
const app=express();
app.use(express.json());

app.use(cors());
app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
    console.log(`Monitoring dashboard: http://localhost:${port}/dashboard`);
});


app.route('/').get((req,res)=>{
    res.send('Welcome to the API');
});

app.route("/register").post(async(req,res)=>{
    const {username,email}=req.body;

    // Validate before touching the database.
    if(!username || !email){
        return res.status(400).json({message:'Username and email are required'});
    }

    let user;
    try {
        user = await User.create({name:username,email});
        console.log("User created:", user._id);
    } catch (err) {
        console.error("Error creating user:", err);
        return res.status(500).json({message:'Error creating user'});
    }

    const result = await addJob({ userId: user._id })

    console.log(result);

    res.status(201).json({result});
});

app.route("/job/:jobid").get(async (req,res)=>{
    const {jobid} = req.params;
    const result = await getJobStatus(jobid);
    res.json(result);
});

app.route("/retry-failed/:jobId").post(async(req,res)=>{
    const {jobId} = req.params;

    const failedJob = await FailedJob.findOne({ jobId });
    console.log("Failed job found:", failedJob);

    if (!failedJob) {
        return res.status(404).json({ message: "Failed job not found" });
    }

    const result = await addJob({userId:failedJob.userId});

    res.json({ message: "Job retried", result });

})

app.route("/jobs").get(async(req,res)=>{

    const jobs = await getAllJobs();
    res.json(jobs);
})

app.route("/metrics").get(async(req,res)=>{
    const metrics = await getQueueMetrics();
    res.json(metrics);
});

// Dead-letter queue: jobs that failed every retry.
app.route("/dlq").get(async(req,res)=>{
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json(await listDeadLetters(limit));
});

app.route("/dlq/:id/replay").post(async(req,res)=>{
    const result = await replayDeadLetter(req.params.id, addJob);
    if (!result) {
        return res.status(404).json({ message: "Dead-letter job not found" });
    }
    res.json({ message: "Job replayed from dead-letter queue", result });
});

// Live monitoring dashboard (polls /metrics, /jobs and /dlq).
app.use(express.static(publicDir));
app.route("/dashboard").get((req,res)=>{
    res.sendFile(path.join(publicDir, "dashboard.html"));
});
