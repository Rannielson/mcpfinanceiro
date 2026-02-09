import { z } from "zod";

export const webhookSchema = z.object({
  placa: z.string().min(1, "Placa é obrigatória"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  client_id: z.string().uuid("client_id deve ser um UUID válido").optional(),
});

export type WebhookInput = z.infer<typeof webhookSchema>;
