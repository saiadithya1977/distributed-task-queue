import express from 'express';
const port=process.env.PORT || 3000;
import {addJob,getJobStatus} from './bullmq.js';

const app=express();
app.use(express.json());
app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
});

app.route('/').get((req,res)=>{
    res.send('Welcome to the API');
});

app.route("/register").post(async(req,res)=>{
    const {username,password}=req.body;
    if(!username || !password){
        return res.status(400).json({message:'Username and password are required'});
    }

    const result = await addJob({username,password});

    console.log(result);
    

    res.status(201).json({result});
});

app.route("/job/:jobid").get(async (req,res)=>{
    const {jobid} = req.params;
    const result = await getJobStatus(jobid);
    res.json(result);
});