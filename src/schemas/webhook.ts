import { z } from "zod";

export const webhookSchema = z.object({
  placa: z.string().min(1, "Placa é obrigatória"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  client_id: z.string().uuid("client_id deve ser um UUID válido").optional(),
});

export type WebhookInput = z.infer<typeof webhookSchema>;

/** Payload Cleoia (webhook v2) */
export const webhookV2Schema = z.object({
  metadata: z.object({
    chave_integracao: z.string().uuid("metadata.chave_integracao deve ser um UUID válido"),
  }),
  questions: z.object({
    placa_veiculo: z.object({
      answer: z.string().min(1, "questions.placa_veiculo.answer é obrigatória"),
    }),
  }),
  contact: z.object({
    phonenumber: z.string().min(1, "contact.phonenumber é obrigatório"),
  }),
});

export type WebhookV2Input = z.infer<typeof webhookV2Schema>;
