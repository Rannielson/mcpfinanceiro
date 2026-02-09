import { z } from "zod";

const configuracoesBoletoBase = z.object({
  dias_antes_vencimento: z.number().int().min(0).max(30),
  dias_depois_vencimento: z.number().int().min(0).max(30),
  situacoes_permitidas_envio: z.array(z.string()).min(1),
  dias_inadimplente_permitido: z.number().int().min(0),
});

const configuracoesBoletoSchema = configuracoesBoletoBase.refine(
  (data) => data.dias_antes_vencimento + data.dias_depois_vencimento <= 30,
  { message: "Intervalo entre datas não pode superar 30 dias" }
);

const configuracoesRespostasSchema = z.object({
  response_sucesso: z.string().min(1),
  response_regularizacao_moto: z.string().min(1),
  response_regularizacao_veiculo: z.string().min(1),
  response_boleto_baixado: z.string().min(1),
});

const configuracoesRevistoriaSchema = z.object({
  enviar_midia: z.boolean(),
  video_moto: z.string().url().optional().nullable(),
  video_carro: z.string().url().optional().nullable(),
});

export const createClienteSchema = z.object({
  nome: z.string().min(1),
  ativo: z.boolean().default(true),
  token_erp: z.string().min(1),
  token_chat: z.string().min(1),
  token_canal: z.string().min(1),
  perfil_sistema: z.enum(["SGA", "SOUTH"]).default("SGA"),
  base_url: z.string().url().optional().default("https://api.hinova.com.br/api/sga/v2"),
  configuracoes_boleto: configuracoesBoletoSchema,
  configuracoes_respostas: configuracoesRespostasSchema,
  configuracoes_revistoria: configuracoesRevistoriaSchema,
});

export type CreateClienteInput = z.infer<typeof createClienteSchema>;

export const patchConfiguracoesSchema = z.object({
  configuracoes_boleto: configuracoesBoletoBase.partial().optional(),
  configuracoes_respostas: configuracoesRespostasSchema.partial().optional(),
  configuracoes_revistoria: configuracoesRevistoriaSchema.partial().optional(),
}).refine(
  (data) => {
    const b = data.configuracoes_boleto;
    if (!b) return true;
    const antes = b.dias_antes_vencimento;
    const depois = b.dias_depois_vencimento;
    if (antes != null && depois != null) {
      return antes + depois <= 30;
    }
    return true;
  },
  { message: "Intervalo entre datas não pode superar 30 dias" }
);

export type PatchConfiguracoesInput = z.infer<typeof patchConfiguracoesSchema>;
