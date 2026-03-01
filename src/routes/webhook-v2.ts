import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { webhookV2Schema } from "../schemas/webhook.js";
import { processarBoleto } from "../services/boleto-service.js";

export const webhookV2Routes = new Hono();

function normalizarPlaca(answer: string): string {
  return answer.replace(/\s|-/g, "").toUpperCase();
}

function normalizarTelefone(phonenumber: string): string {
  return phonenumber.replace(/\D/g, "");
}

webhookV2Routes.post(
  "/webhook",
  zValidator("json", webhookV2Schema),
  async (c) => {
    const body = c.req.valid("json");
    const clientId = body.metadata.chave_integracao;
    const placa = normalizarPlaca(body.questions.placa_veiculo.answer);
    const telefone = normalizarTelefone(body.contact.phonenumber);

    const result = await processarBoleto({
      placa,
      telefone,
      client_id: clientId,
    });

    return c.json({
      message: result.message,
      response: result.responseKey,
    });
  }
);
