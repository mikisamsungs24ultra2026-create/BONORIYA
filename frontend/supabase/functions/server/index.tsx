import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check
app.get("/make-server-c3906627/health", (c) => c.json({ status: "ok", service: "bonoriya-api" }));

// KV store endpoints (used by Figma Make infra — keep intact)
app.get("/make-server-c3906627/kv/:key", async (c) => {
  const key = c.req.param("key");
  const value = await kv.get(key);
  return c.json({ key, value });
});

app.post("/make-server-c3906627/kv/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  await kv.set(key, body.value);
  return c.json({ success: true });
});

app.delete("/make-server-c3906627/kv/:key", async (c) => {
  const key = c.req.param("key");
  await kv.delete(key);
  return c.json({ success: true });
});

Deno.serve(app.fetch);