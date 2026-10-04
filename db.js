import mongoose from "mongoose";
import "dotenv/config";

// The connection string comes from the environment (.env locally, secrets in deployment).
// Never commit credentials to the repository.
const db_string = process.env.MONGODB_URI;

const connectDB = async () => {
  if (!db_string) {
    console.log("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }
  try {
    await mongoose.connect(db_string);
    console.log("MongoDB Connected");
  } catch (error) {
    console.log("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
