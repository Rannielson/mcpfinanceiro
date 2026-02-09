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
    const [y, m, d] = trimmed.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const [d, m, y] = trimmed.split("/").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
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
      situacoes_envio_direto: cfgBoleto.situacoes_envio_direto ?? ["ATIVO"],
      situacoes_com_checagem_vencimento: cfgBoleto.situacoes_com_checagem_vencimento ?? ["INADIMPLENTE"],
      dias_checagem_vencimento: cfgBoleto.dias_checagem_vencimento ?? 2,
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

export async function processarBoleto(params: {
  placa: string;
  telefone: string;
  client_id: string;
}): Promise<string> {
  const cliente = await getClienteComConfigs(params.client_id);
  if (!cliente || !cliente.ativo) {
    return "Cliente não encontrado ou inativo.";
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
    return `Erro ao buscar boleto: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (boletos.length > 0) {
    return processarBoletoEncontrado(
      boletos[0],
      params.telefone,
      cliente,
      atomos
    );
  }

  let veiculos: SGAVeiculoBuscar[] = [];
  try {
    veiculos = await sga.buscarVeiculo(params.placa);
  } catch (e) {
    return `Erro ao buscar veículo: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (veiculos.length === 0) {
    return "Veículo não encontrado.";
  }

  return processarVeiculoSemBoleto(
    veiculos[0],
    params.telefone,
    cliente,
    atomos
  );
}

function getResponseRegularizacao(
  codigoFipe: string | null | undefined,
  respostas: ClienteComConfigs["configuracoes_respostas"]
): string {
  return isMotocicleta(codigoFipe)
    ? respostas.response_regularizacao_moto
    : respostas.response_regularizacao_veiculo;
}

function processarBoletoEncontrado(
  boleto: SGABoleto,
  telefone: string,
  cliente: ClienteComConfigs,
  atomos: AtomosClient
): string {
  if (boleto.situacao_boleto === "BAIXADO") {
    return cliente.configuracoes_respostas.response_boleto_baixado;
  }

  if (boleto.situacao_boleto !== "ABERTO") {
    const codigoFipe = boleto.veiculos?.[0]?.codigo_fipe;
    return getResponseRegularizacao(codigoFipe, cliente.configuracoes_respostas);
  }

  const situacoesEnvioDireto =
    cliente.configuracoes_boleto.situacoes_envio_direto ?? ["ATIVO"];
  const situacoesComChecagem =
    cliente.configuracoes_boleto.situacoes_com_checagem_vencimento ?? ["INADIMPLENTE"];
  const veiculo = boleto.veiculos?.[0];
  const situacaoVeiculo = veiculo?.situacao_veiculo ?? "";
  const codigoFipe = veiculo?.codigo_fipe;

  const envioDireto = situacoesEnvioDireto.includes(situacaoVeiculo);
  const comChecagem = situacoesComChecagem.includes(situacaoVeiculo);

  if (comChecagem) {
    const dataVenc = parseDate(boleto.data_vencimento);
    const diasAposVenc = diffDays(new Date(), dataVenc);
    const limite = cliente.configuracoes_boleto.dias_checagem_vencimento ?? 2;
    if (diasAposVenc > limite) {
      return getResponseRegularizacao(codigoFipe, cliente.configuracoes_respostas);
    }
  } else if (!envioDireto) {
    return getResponseRegularizacao(codigoFipe, cliente.configuracoes_respostas);
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
  return replaceTemplate(template, {
    data_vencimento: boleto.data_vencimento,
    valor_boleto: boleto.valor_boleto,
  });
}

function processarVeiculoSemBoleto(
  veiculo: SGAVeiculoBuscar,
  telefone: string,
  cliente: ClienteComConfigs,
  atomos: AtomosClient
): string {
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

  return getResponseRegularizacao(codigoFipe, cliente.configuracoes_respostas);
}
