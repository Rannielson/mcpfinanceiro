export interface AtomosClientConfig {
  tokenChat: string;
  tokenCanal: string;
}

const ATOMOS_BASE_URL = "https://api.chat.atomos.tech/chat/v1";

export class AtomosClient {
  constructor(private config: AtomosClientConfig) {}

  private headers(): HeadersInit {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.tokenChat}`,
    };
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  async sendMessage(params: {
    text: string;
    to: string;
    fileUrl?: string;
  }): Promise<void> {
    const url = `${ATOMOS_BASE_URL}/message/send`;
    const body: Record<string, unknown> = {
      body: params.fileUrl
        ? { text: params.text, fileUrl: params.fileUrl }
        : { text: params.text },
      from: this.config.tokenCanal,
      to: this.normalizePhone(params.to),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Atomos send message failed: ${res.status} ${text}`);
    }
  }

  async sendPix(to: string, pixCopiaCola: string): Promise<void> {
    await this.sendMessage({ text: pixCopiaCola, to });
  }

  async sendPdf(to: string, linkBoleto: string): Promise<void> {
    await this.sendMessage({
      text: "Baixe aqui seu boleto",
      to,
      fileUrl: linkBoleto,
    });
  }

  async sendVideo(to: string, videoUrl: string, caption = "Baixe aqui seu boleto"): Promise<void> {
    await this.sendMessage({
      text: caption,
      to,
      fileUrl: videoUrl,
    });
  }
}
