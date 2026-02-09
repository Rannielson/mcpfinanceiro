import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import {
  createClienteSchema,
  patchConfiguracoesSchema,
} from "../schemas/cliente.js";

export const clientesRoutes = new Hono();

clientesRoutes.post(
  "/",
  zValidator("json", createClienteSchema),
  async (c) => {
    const body = c.req.valid("json");

    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .insert({
        nome: body.nome,
        ativo: body.ativo,
        token_erp: body.token_erp,
        token_chat: body.token_chat,
        token_canal: body.token_canal,
        perfil_sistema: body.perfil_sistema,
        base_url: body.base_url,
      })
      .select("id")
      .single();

    if (clienteError) {
      return c.json({ error: clienteError.message }, 400);
    }

    const clienteId = cliente.id;

    const { error: boletoError } = await supabase
      .from("configuracoes_boleto")
      .insert({
        cliente_id: clienteId,
        dias_antes_vencimento: body.configuracoes_boleto.dias_antes_vencimento,
        dias_depois_vencimento: body.configuracoes_boleto.dias_depois_vencimento,
        situacoes_envio_direto: body.configuracoes_boleto.situacoes_envio_direto,
        situacoes_com_checagem_vencimento: body.configuracoes_boleto.situacoes_com_checagem_vencimento,
        dias_checagem_vencimento: body.configuracoes_boleto.dias_checagem_vencimento,
      });

    if (boletoError) {
      await supabase.from("clientes").delete().eq("id", clienteId);
      return c.json({ error: boletoError.message }, 400);
    }

    const { error: respostasError } = await supabase
      .from("configuracoes_respostas")
      .insert({
        cliente_id: clienteId,
        response_sucesso: body.configuracoes_respostas.response_sucesso,
        response_regularizacao_moto: body.configuracoes_respostas.response_regularizacao_moto,
        response_regularizacao_veiculo: body.configuracoes_respostas.response_regularizacao_veiculo,
        response_boleto_baixado: body.configuracoes_respostas.response_boleto_baixado,
      });

    if (respostasError) {
      await supabase.from("clientes").delete().eq("id", clienteId);
      return c.json({ error: respostasError.message }, 400);
    }

    const { error: revistoriaError } = await supabase
      .from("configuracoes_revistoria")
      .insert({
        cliente_id: clienteId,
        enviar_midia: body.configuracoes_revistoria.enviar_midia,
        video_moto: body.configuracoes_revistoria.video_moto ?? null,
        video_carro: body.configuracoes_revistoria.video_carro ?? null,
      });

    if (revistoriaError) {
      await supabase.from("clientes").delete().eq("id", clienteId);
      return c.json({ error: revistoriaError.message }, 400);
    }

    return c.json({ id: clienteId, message: "Cliente criado com sucesso" }, 201);
  }
);

clientesRoutes.patch(
  "/:id/configuracoes",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator("json", patchConfiguracoesSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", id)
      .single();

    if (clienteError || !cliente) {
      return c.json({ error: "Cliente não encontrado" }, 404);
    }

    if (body.configuracoes_boleto) {
      const { error } = await supabase
        .from("configuracoes_boleto")
        .update(body.configuracoes_boleto)
        .eq("cliente_id", id);
      if (error) return c.json({ error: error.message }, 400);
    }

    if (body.configuracoes_respostas) {
      const { error } = await supabase
        .from("configuracoes_respostas")
        .update(body.configuracoes_respostas)
        .eq("cliente_id", id);
      if (error) return c.json({ error: error.message }, 400);
    }

    if (body.configuracoes_revistoria) {
      const { error } = await supabase
        .from("configuracoes_revistoria")
        .update(body.configuracoes_revistoria)
        .eq("cliente_id", id);
      if (error) return c.json({ error: error.message }, 400);
    }

    return c.json({ message: "Configurações atualizadas com sucesso" });
  }
);
