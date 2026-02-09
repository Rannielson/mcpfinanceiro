-- Tabela clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  token_erp TEXT NOT NULL,
  token_chat TEXT NOT NULL,
  token_canal TEXT NOT NULL,
  perfil_sistema TEXT NOT NULL DEFAULT 'SGA',
  base_url TEXT NOT NULL DEFAULT 'https://api.hinova.com.br/api/sga/v2',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela configuracoes_boleto (1:1 com cliente)
CREATE TABLE IF NOT EXISTS configuracoes_boleto (
  cliente_id UUID PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
  dias_antes_vencimento INTEGER NOT NULL DEFAULT 15,
  dias_depois_vencimento INTEGER NOT NULL DEFAULT 5,
  situacoes_permitidas_envio JSONB NOT NULL DEFAULT '["ATIVO"]',
  dias_inadimplente_permitido INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT intervalo_max_30 CHECK (
    dias_antes_vencimento + dias_depois_vencimento <= 30
  )
);

-- Tabela configuracoes_respostas (1:1 com cliente)
CREATE TABLE IF NOT EXISTS configuracoes_respostas (
  cliente_id UUID PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
  response_sucesso TEXT NOT NULL,
  response_regularizacao_moto TEXT NOT NULL,
  response_regularizacao_veiculo TEXT NOT NULL,
  response_boleto_baixado TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela configuracoes_revistoria (1:1 com cliente)
CREATE TABLE IF NOT EXISTS configuracoes_revistoria (
  cliente_id UUID PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
  enviar_midia BOOLEAN NOT NULL DEFAULT false,
  video_moto TEXT,
  video_carro TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(ativo);
CREATE INDEX IF NOT EXISTS idx_configuracoes_boleto_cliente ON configuracoes_boleto(cliente_id);
