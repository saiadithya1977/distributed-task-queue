import express from 'express';
const port=3000;
import {addJob,getJobStatus,getAllJobs} from './bullmq.js';
import connectDB from './db.js';
import User from './Model.js';
import FailedJob from './Failedjobs.js';
import 'dotenv/config';
import cors from "cors";
    
connectDB();
const app=express();
app.use(express.json());

app.use(cors());
app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
});


app.route('/').get((req,res)=>{
    res.send('Welcome to the API');
});

app.route("/register").post(async(req,res)=>{
    const {username,email}=req.body;
    let insert_id =null;
    const user = await User.create({name:username,email}).then(user=>{
        console.log("User created:", user._id);
        insert_id = user._id;
    }).catch(err=>{
        res.status(500).json({message:'Error creating user'});
        console.error("Error creating user:", err);
    });


    if(!username || !email){
        return res.status(400).json({message:'Username and email are required'});
    }
    if(insert_id==null){
        return res.status(500).json({message:'Error creating user'});
    }
    const result = await addJob({ userId: insert_id })

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