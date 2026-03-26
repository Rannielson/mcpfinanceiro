// src/services/south-client.ts

export interface SouthDadosAssociadoResponse {
  statusCode: number;
  data: {
    Existe: boolean;
    Ativo: boolean;
    Dados: {
      ClientesIndividuosDocumento: string;
      VendasCarrosCodigoFipe: string;
      VendasCarrosPlaca: string;
      VendasCarrosMarcasNome: string;
      VendasCarrosModelosNome: string;
      VendasCarrosCategoriasCarrosNome: string;
      VendasSituacao: string;
      [key: string]: unknown;
    } | null;
  };
}

export interface SouthBoletoResponse {
  statusCode: number;
  data: {
    UrlBoleto: string;
    Faturasemv: string | null;
    FaturasValor: string;
    FaturasDataVencimento: string;
    [key: string]: unknown;
  };
}

export interface SouthClientConfig {
  baseUrl: string;
  tokenErp: string;
}

export class SouthClient {
  constructor(private config: SouthClientConfig) {}

  private headers(): HeadersInit {
    return {
      Authorization: this.config.tokenErp,
    };
  }

  async buscarAssociado(placa: string): Promise<SouthDadosAssociadoResponse> {
    const url = `${this.config.baseUrl}/VendasCarros/DadosAssociado/${encodeURIComponent(placa)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: this.headers(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`South buscar associado failed: ${res.status} ${text}`);
    }

    return res.json();
  }

  async buscarBoleto(placa: string, documento: string): Promise<SouthBoletoResponse> {
    const url = `${this.config.baseUrl}/Boletos/SegundaVia`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ Placa: placa, Documento: documento }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`South buscar boleto failed: ${res.status} ${text}`);
    }

    return res.json();
  }
}
