import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { webhookSchema } from "../schemas/webhook.js";
import { processarBoleto } from "../services/boleto-service.js";

export const webhookRoutes = new Hono();

webhookRoutes.post(
  "/webhook",
  zValidator("json", webhookSchema),
  async (c) => {
    const body = c.req.valid("json");
    const clientId =
      body.client_id ?? c.req.header("X-Client-Id");

    if (!clientId) {
      return c.json(
        { error: "client_id é obrigatório (body ou header X-Client-Id)" },
        400
      );
    }

    const message = await processarBoleto({
      placa: body.placa,
      telefone: body.telefone,
      client_id: String(clientId),
    });

    return c.json({ message });
  }
);
