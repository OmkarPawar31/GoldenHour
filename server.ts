import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { connectDB } from "./lib/db";
import { redisClient, redisSubscriber } from "./lib/redis";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT || 3000;

app.prepare().then(async () => {
  // Connect MongoDB
  await connectDB();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Export io globally inside the server instance so API routes can emit if needed,
  // or handle Redis subscription events here.
  (global as any).io = io;

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  // Listen for Redis Pub/Sub events (e.g., from Python or API routes)
  if (redisSubscriber) {
    redisSubscriber.subscribe("signal_updates", (err: any) => {
      if (err) console.error("Redis Sub Error:", err);
    });
    redisSubscriber.subscribe("detection_events", (err: any) => {
      if (err) console.error("Redis Sub Error:", err);
    });

    redisSubscriber.on("message", (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        if (channel === "signal_updates") {
          io.emit("signal_update", data);
        } else if (channel === "detection_events") {
          io.emit("detection_event", data);
        }
      } catch (e) {
        console.error("Error parsing Redis message", e);
      }
    });
  }

  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
