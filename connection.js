import IORedis from "ioredis";
import "dotenv/config";

export const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 20000,   // give more time to connect
  retryStrategy(times) {
    return Math.min(times * 200, 2000); // retry backoff
  },
  tls: {
    rejectUnauthorized: false
  }
});