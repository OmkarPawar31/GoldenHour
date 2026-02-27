/**
 * Redis is optional — the server works without it (in-memory fallback).
 * We only attempt to connect if REDIS_URL is explicitly set in the environment.
 */

let redisClient: any = null;
let redisSubscriber: any = null;

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  try {
    const { Redis } = await import("ioredis");
    if (!redisClient) {
      redisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
      redisClient.on("error", (err: any) =>
        console.warn("[Redis] Connection error (optional service):", err.code)
      );
      await redisClient.connect().catch(() => { redisClient = null; });
    }
    return redisClient;
  } catch {
    return null;
  }
}

async function getRedisSubscriber() {
  if (!process.env.REDIS_URL) return null;
  try {
    const { Redis } = await import("ioredis");
    if (!redisSubscriber) {
      redisSubscriber = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
      redisSubscriber.on("error", (err: any) =>
        console.warn("[Redis] Subscriber error (optional service):", err.code)
      );
      await redisSubscriber.connect().catch(() => { redisSubscriber = null; });
    }
    return redisSubscriber;
  } catch {
    return null;
  }
}

export { getRedisClient, getRedisSubscriber };
export { redisClient, redisSubscriber };
