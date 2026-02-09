export interface SGABoletoVeiculo {
  codigo_veiculo: number;
  codigo_tipo_veiculo: string;
  placa: string;
  chassi: string;
  codigo_fipe: string;
  modelo: string;
  situacao_veiculo: string;
  [key: string]: unknown;
}

export interface SGABoletoPix {
  qrcode?: string;
  copia_cola?: string;
}

export interface SGABoleto {
  nosso_numero: number;
  linha_digitavel: string;
  link_boleto: string;
  short_link: string;
  valor_boleto: string;
  data_vencimento: string;
  situacao_boleto: string;
  pix: SGABoletoPix | null;
  veiculos: SGABoletoVeiculo[];
  [key: string]: unknown;
}

export interface SGAVeiculoBuscar {
  codigo_veiculo: string;
  placa: string;
  codigo_fipe: string;
  descricao_situacao: string;
  [key: string]: unknown;
}

export interface SGAClientConfig {
  baseUrl: string;
  tokenErp: string;
}

export class SGAClient {
  constructor(private config: SGAClientConfig) {}

  private headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.tokenErp}`,
    };
  }

  async listarBoletoAssociadoVeiculo(params: {
    placa: string;
    data_vencimento_inicial: string;
    data_vencimento_final: string;
  }): Promise<SGABoleto[]> {
    const url = `${this.config.baseUrl}/listar/boleto-associado-veiculo`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SGA listar boleto failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async buscarVeiculo(placa: string): Promise<SGAVeiculoBuscar[]> {
    const url = `${this.config.baseUrl}/veiculo/buscar/${encodeURIComponent(placa)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: this.headers(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SGA buscar veículo failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }
}
