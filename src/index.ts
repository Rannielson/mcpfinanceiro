import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config.js";
import { clientesRoutes } from "./routes/clientes.js";
import { webhookRoutes } from "./routes/webhook.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.route("/api/v1/clientes", clientesRoutes);
app.route("/api/v1", webhookRoutes);

app.get("/", (c) => c.json({ status: "ok", service: "mcpfinanceiro" }));

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
