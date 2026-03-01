import { supabase } from "../lib/supabase.js";
import type { SGABoleto, SGAVeiculoBuscar } from "./sga-client.js";
import { SGAClient } from "./sga-client.js";
import { AtomosClient } from "./atomos-client.js";

function isMotocicleta(codigoFipe: string | null | undefined): boolean {
  return Boolean(codigoFipe?.trim().startsWith("81"));
}

function formatDateBR(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseDate(str: string): Date {
  const trimmed = str.trim();
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]?.slice(0, 2) ?? 0);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const parts = trimmed.split("/");
  const d = Number(parts[0]);
  const m = Number(parts[1]);
  const y = Number(parts[2]);
  return new Date(Date.UTC(y, m - 1, d));
}

function diasAposVencimento(dataVencimentoStr: string): number {
  const dataVenc = parseDate(dataVencimentoStr);
  const hoje = new Date();
  const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  const vencUTC = new Date(Date.UTC(dataVenc.getUTCFullYear(), dataVenc.getUTCMonth(), dataVenc.getUTCDate()));
  const ms = hojeUTC.getTime() - vencUTC.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function replaceTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{\\s*\\$?${key}\\s*\\}\\}`, "g"), value);
  }
  return result;
}

export interface ClienteComConfigs {
  id: string;
  nome: string;
  ativo: boolean;
  token_erp: string;
  token_chat: string;
  token_canal: string;
  base_url: string;
  configuracoes_boleto: {
    dias_antes_vencimento: number;
    dias_depois_vencimento: number;
    situacoes_envio_direto: string[];
    situacoes_com_checagem_vencimento: string[];
    dias_checagem_vencimento: number;
  };
  configuracoes_respostas: {
    response_sucesso: string;
    response_regularizacao_moto: string;
    response_regularizacao_veiculo: string;
    response_boleto_baixado: string;
  };
  configuracoes_revistoria: {
    enviar_midia: boolean;
    video_moto: string | null;
    video_carro: string | null;
  };
}

async function getClienteComConfigs(clientId: string): Promise<ClienteComConfigs | null> {
  const { data: cliente, error: clienteError } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", clientId)
    .single();

  if (clienteError || !cliente) return null;

  const { data: cfgBoleto } = await supabase
    .from("configuracoes_boleto")
    .select("*")
    .eq("cliente_id", clientId)
    .single();

  const { data: cfgRespostas } = await supabase
    .from("configuracoes_respostas")
    .select("*")
    .eq("cliente_id", clientId)
    .single();

  const { data: cfgRevistoria } = await supabase
    .from("configuracoes_revistoria")
    .select("*")
    .eq("cliente_id", clientId)
    .single();

  if (!cfgBoleto || !cfgRespostas || !cfgRevistoria) return null;

  return {
    id: cliente.id,
    nome: cliente.nome,
    ativo: cliente.ativo,
    token_erp: cliente.token_erp,
    token_chat: cliente.token_chat,
    token_canal: cliente.token_canal,
    base_url: cliente.base_url ?? "https://api.hinova.com.br/api/sga/v2",
    configuracoes_boleto: {
      dias_antes_vencimento: cfgBoleto.dias_antes_vencimento,
      dias_depois_vencimento: cfgBoleto.dias_depois_vencimento,
      situacoes_envio_direto: Array.isArray(cfgBoleto.situacoes_envio_direto) ? cfgBoleto.situacoes_envio_direto : ["ATIVO"],
      situacoes_com_checagem_vencimento: Array.isArray(cfgBoleto.situacoes_com_checagem_vencimento) ? cfgBoleto.situacoes_com_checagem_vencimento : ["INADIMPLENTE"],
      dias_checagem_vencimento: Number(cfgBoleto.dias_checagem_vencimento) || 2,
    },
    configuracoes_respostas: {
      response_sucesso: cfgRespostas.response_sucesso,
      response_regularizacao_moto: cfgRespostas.response_regularizacao_moto,
      response_regularizacao_veiculo: cfgRespostas.response_regularizacao_veiculo,
      response_boleto_baixado: cfgRespostas.response_boleto_baixado,
    },
    configuracoes_revistoria: {
      enviar_midia: cfgRevistoria.enviar_midia ?? false,
      video_moto: cfgRevistoria.video_moto,
      video_carro: cfgRevistoria.video_carro,
    },
  };
}

export type BoletoResult = { message: string; responseKey: "boleto_ativo" | "boleto_fora" };

export async function processarBoleto(params: {
  placa: string;
  telefone: string;
  client_id: string;
}): Promise<BoletoResult> {
  const cliente = await getClienteComConfigs(params.client_id);
  if (!cliente || !cliente.ativo) {
    return { message: "Cliente não encontrado ou inativo.", responseKey: "boleto_fora" };
  }

  const sga = new SGAClient({
    baseUrl: cliente.base_url,
    tokenErp: cliente.token_erp,
  });

  const atomos = new AtomosClient({
    tokenChat: cliente.token_chat,
    tokenCanal: cliente.token_canal,
  });

  const hoje = new Date();
  const diasAntes = cliente.configuracoes_boleto.dias_antes_vencimento;
  const diasDepois = cliente.configuracoes_boleto.dias_depois_vencimento;

  const dataInicial = new Date(hoje);
  dataInicial.setDate(dataInicial.getDate() - diasAntes);
  const dataFinal = new Date(hoje);
  dataFinal.setDate(dataFinal.getDate() + diasDepois);

  const dataVencimentoInicial = formatDateBR(dataInicial);
  const dataVencimentoFinal = formatDateBR(dataFinal);

  let boletos: SGABoleto[] = [];
  try {
    boletos = await sga.listarBoletoAssociadoVeiculo({
      placa: params.placa,
      data_vencimento_inicial: dataVencimentoInicial,
      data_vencimento_final: dataVencimentoFinal,
    });
  } catch (e) {
    return { message: `Erro ao buscar boleto: ${e instanceof Error ? e.message : String(e)}`, responseKey: "boleto_fora" };
  }

  if (boletos.length > 0) {
    const boletosOrdenados = [...boletos].sort(
      (a, b) => parseDate(a.data_vencimento).getTime() - parseDate(b.data_vencimento).getTime()
    );
    return processarBoletoEncontrado(
      boletosOrdenados[0],
      params.telefone,
      cliente,
      atomos
    );
  }

  let veiculos: SGAVeiculoBuscar[] = [];
  try {
    veiculos = await sga.buscarVeiculo(params.placa);
  } catch (e) {
    return { message: `Erro ao buscar veículo: ${e instanceof Error ? e.message : String(e)}`, responseKey: "boleto_fora" };
  }

  if (veiculos.length === 0) {
    return { message: "Veículo não encontrado.", responseKey: "boleto_fora" };
  }

  return processarVeiculoSemBoleto(
    veiculos[0],
    params.telefone,
    cliente,
    atomos
  );
}

/** Instrução para o agente de IA (prefixo da mensagem de regularização). Não é para o cliente final. */
const PREFIXO_INSTRUCAO_IA_REVISTORIA =
  "Isto é imprescindível: Acione a habilidade de Pendência de Revistoria quando identificar inadimplência no veículo.";

function getResponseRegularizacao(
  codigoFipe: string | null | undefined,
  respostas: ClienteComConfigs["configuracoes_respostas"]
): string {
  const mensagem = isMotocicleta(codigoFipe)
    ? respostas.response_regularizacao_moto
    : respostas.response_regularizacao_veiculo;
  return `${PREFIXO_INSTRUCAO_IA_REVISTORIA}\n\n${mensagem}`;
}

function enviarVideoRegularizacaoSeConfigurado(
  telefone: string,
  codigoFipe: string | null | undefined,
  cliente: ClienteComConfigs,
  atomos: AtomosClient
): void {
  if (!cliente.configuracoes_revistoria.enviar_midia) return;
  const videoUrl = isMotocicleta(codigoFipe)
    ? cliente.configuracoes_revistoria.video_moto
    : cliente.configuracoes_revistoria.video_carro;
  if (videoUrl) {
    atomos.sendVideo(telefone, videoUrl).catch(() => {});
  }
}

function processarBoletoEncontrado(
  boleto: SGABoleto,
  telefone: string,
  cliente: ClienteComConfigs,
  atomos: AtomosClient
): BoletoResult {
  if (boleto.situacao_boleto === "BAIXADO") {
    return { message: cliente.configuracoes_respostas.response_boleto_baixado, responseKey: "boleto_fora" };
  }

  if (boleto.situacao_boleto !== "ABERTO") {
    const codigoFipe = boleto.veiculos?.[0]?.codigo_fipe;
    enviarVideoRegularizacaoSeConfigurado(telefone, codigoFipe, cliente, atomos);
    return { message: getResponseRegularizacao(codigoFipe, cliente.configuracoes_respostas), responseKey: "boleto_fora" };
  }

  const situacoesEnvioDireto =
    cliente.configuracoes_boleto.situacoes_envio_direto ?? ["ATIVO"];
  const situacoesComChecagem =
    cliente.configuracoes_boleto.situacoes_com_checagem_vencimento ?? ["INADIMPLENTE"];
  const veiculo = boleto.veiculos?.[0];
  const situacaoVeiculo = String(veiculo?.situacao_veiculo ?? "").trim();
  const codigoFipe = veiculo?.codigo_fipe;

  const envioDireto = situacoesEnvioDireto.some((s) => String(s).trim() === situacaoVeiculo);
  const comChecagem = situacoesComChecagem.some((s) => String(s).trim() === situacaoVeiculo);

  if (comChecagem) {
    const diasAposVenc = diasAposVencimento(boleto.data_vencimento);
    const limite = cliente.configuracoes_boleto.dias_checagem_vencimento ?? 2;
    if (diasAposVenc > limite) {
      enviarVideoRegularizacaoSeConfigurado(telefone, codigoFipe, cliente, atomos);
      return { message: getResponseRegularizacao(codigoFipe, cliente.configuracoes_respostas), responseKey: "boleto_fora" };
    }
  } else if (!envioDireto) {
    enviarVideoRegularizacaoSeConfigurado(telefone, codigoFipe, cliente, atomos);
    return { message: getResponseRegularizacao(codigoFipe, cliente.configuracoes_respostas), responseKey: "boleto_fora" };
  }

  const pixText =
    boleto.pix?.copia_cola ?? boleto.linha_digitavel ?? "";
  const linkBoleto = boleto.link_boleto ?? boleto.short_link ?? "";

  if (pixText) {
    atomos.sendPix(telefone, pixText).catch(() => {});
  }
  if (linkBoleto) {
    atomos.sendPdf(telefone, linkBoleto).catch(() => {});
  }

  const template = cliente.configuracoes_respostas.response_sucesso;
  return {
    message: replaceTemplate(template, {
      data_vencimento: boleto.data_vencimento,
      valor_boleto: boleto.valor_boleto,
    }),
    responseKey: "boleto_ativo",
  };
}

function processarVeiculoSemBoleto(
  veiculo: SGAVeiculoBuscar,
  telefone: string,
  cliente: ClienteComConfigs,
  atomos: AtomosClient
): BoletoResult {
  const situacoesEnvioDireto =
    cliente.configuracoes_boleto.situacoes_envio_direto ?? ["ATIVO"];
  const situacoesComChecagem =
    cliente.configuracoes_boleto.situacoes_com_checagem_vencimento ?? [];
  const descricaoSituacao = veiculo.descricao_situacao ?? "";
  const codigoFipe = veiculo.codigo_fipe;

  const permitido =
    situacoesEnvioDireto.includes(descricaoSituacao) ||
    situacoesComChecagem.includes(descricaoSituacao);

  if (permitido && cliente.configuracoes_revistoria.enviar_midia) {
    const videoUrl = isMotocicleta(codigoFipe)
      ? cliente.configuracoes_revistoria.video_moto
      : cliente.configuracoes_revistoria.video_carro;
    if (videoUrl) {
      atomos.sendVideo(telefone, videoUrl).catch(() => {});
    }
  }

  return { message: getResponseRegularizacao(codigoFipe, cliente.configuracoes_respostas), responseKey: "boleto_fora" };
}
