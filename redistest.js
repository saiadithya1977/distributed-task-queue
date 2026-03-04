import IORedis from "ioredis";
import "dotenv/config";

const redis = new IORedis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }
});

async function test() {
  await redis.set("test", "hello");
  const val = await redis.get("test");
  console.log("Redis value:", val);
  process.exit();
}

test();