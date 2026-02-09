-- Adicionar novas colunas
ALTER TABLE configuracoes_boleto
  ADD COLUMN IF NOT EXISTS situacoes_envio_direto JSONB DEFAULT '["ATIVO"]',
  ADD COLUMN IF NOT EXISTS situacoes_com_checagem_vencimento JSONB DEFAULT '["INADIMPLENTE"]',
  ADD COLUMN IF NOT EXISTS dias_checagem_vencimento INTEGER DEFAULT 2;

-- Migrar dados existentes (antes de dropar colunas)
UPDATE configuracoes_boleto
SET
  situacoes_envio_direto = CASE
    WHEN situacoes_permitidas_envio ? 'INADIMPLENTE' THEN '["ATIVO"]'::jsonb
    ELSE COALESCE(situacoes_permitidas_envio, '["ATIVO"]'::jsonb)
  END,
  situacoes_com_checagem_vencimento = CASE
    WHEN situacoes_permitidas_envio ? 'INADIMPLENTE' THEN '["INADIMPLENTE"]'::jsonb
    ELSE '[]'::jsonb
  END,
  dias_checagem_vencimento = COALESCE(dias_inadimplente_permitido, 2);

-- Remover colunas antigas
ALTER TABLE configuracoes_boleto
  DROP COLUMN IF EXISTS situacoes_permitidas_envio,
  DROP COLUMN IF EXISTS dias_inadimplente_permitido;
