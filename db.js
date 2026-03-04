import mongoose from "mongoose";


const db_string = "mongodb+srv://adithya:adithya@cluster0.q1caws3.mongodb.net/?appName=Cluster0"


const connectDB = async () => {
  try {
    await mongoose.connect(db_string);
    console.log("MongoDB Connected");
  } catch (error) {
    console.log("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;