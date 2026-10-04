import IORedis from "ioredis";
import "dotenv/config";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 20000,   // give more time to connect
  retryStrategy(times) {
    return Math.min(times * 200, 2000); // retry backoff
  },
  // Hosted Redis uses TLS (rediss://); a local Docker Redis does not.
  ...(redisUrl.startsWith("rediss://") ? { tls: { rejectUnauthorized: false } } : {}),
});
