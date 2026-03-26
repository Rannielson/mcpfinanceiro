import { z } from "zod";

const INTERVALO_MAX_DIAS = 50;

const configuracoesBoletoBase = z.object({
  dias_antes_vencimento: z.number().int().min(0).max(60),
  dias_depois_vencimento: z.number().int().min(0).max(60),
  situacoes_envio_direto: z.array(z.string()).min(1),
  situacoes_com_checagem_vencimento: z.array(z.string()),
  dias_checagem_vencimento: z.number().int().min(0),
});

const configuracoesBoletoSchema = configuracoesBoletoBase.refine(
  (data) => data.dias_antes_vencimento + data.dias_depois_vencimento <= INTERVALO_MAX_DIAS,
  { message: `Intervalo entre datas não pode superar ${INTERVALO_MAX_DIAS} dias` }
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

const createClienteBaseSchema = z.object({
  nome: z.string().min(1),
  ativo: z.boolean().default(true),
  token_erp: z.string().optional(),
  token_chat: z.string().min(1),
  token_canal: z.string().min(1),
  perfil_sistema: z.enum(["SGA", "SOUTH", "SGA/SOUTH"]).default("SGA"),
  base_url: z.string().url().optional(),
  token_erp_south: z.string().optional(),
  base_url_south: z.string().url().optional(),
  configuracoes_boleto: configuracoesBoletoSchema,
  configuracoes_respostas: configuracoesRespostasSchema,
  configuracoes_revistoria: configuracoesRevistoriaSchema,
});

export const createClienteSchema = createClienteBaseSchema.superRefine((data, ctx) => {
  const perfil = data.perfil_sistema;

  if (perfil === "SGA" || perfil === "SGA/SOUTH") {
    if (!data.token_erp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "token_erp é obrigatório para perfil SGA ou SGA/SOUTH",
        path: ["token_erp"],
      });
    }
    if (!data.base_url) {
      data.base_url = "https://api.hinova.com.br/api/sga/v2";
    }
  }

  if (perfil === "SOUTH" || perfil === "SGA/SOUTH") {
    if (!data.token_erp_south) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "token_erp_south é obrigatório para perfil SOUTH ou SGA/SOUTH",
        path: ["token_erp_south"],
      });
    }
    if (!data.base_url_south) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "base_url_south é obrigatório para perfil SOUTH ou SGA/SOUTH",
        path: ["base_url_south"],
      });
    }
  }
});

export type CreateClienteInput = z.infer<typeof createClienteSchema>;

export const patchConfiguracoesSchema = z.object({
  configuracoes_boleto: configuracoesBoletoBase.partial().optional(),
  configuracoes_respostas: configuracoesRespostasSchema.partial().optional(),
  configuracoes_revistoria: configuracoesRevistoriaSchema.partial().optional(),
  token_erp_south: z.string().min(1).optional(),
  base_url_south: z.string().url().optional(),
}).refine(
  (data) => {
    const b = data.configuracoes_boleto;
    if (!b) return true;
    const antes = b.dias_antes_vencimento;
    const depois = b.dias_depois_vencimento;
    if (antes != null && depois != null) {
      return antes + depois <= INTERVALO_MAX_DIAS;
    }
    return true;
  },
  { message: `Intervalo entre datas não pode superar ${INTERVALO_MAX_DIAS} dias` }
);

export type PatchConfiguracoesInput = z.infer<typeof patchConfiguracoesSchema>;
