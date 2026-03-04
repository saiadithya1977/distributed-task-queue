import mongoose from "mongoose";

const failedJobSchema = new mongoose.Schema({
    jobId: { type: String, required: true },
    userId : { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    reason:{ type: String},
    attempts : { type: Number},
    failedAt:{type: Date, default: Date.now}
})


export default mongoose.model('FailedJob',failedJobSchema);
