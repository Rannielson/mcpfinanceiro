-- 1) Migration: permitir intervalo total de até 50 dias (30 antes + 20 depois)
ALTER TABLE configuracoes_boleto DROP CONSTRAINT IF EXISTS intervalo_max_30;
ALTER TABLE configuracoes_boleto ADD CONSTRAINT intervalo_max_50 CHECK (
  dias_antes_vencimento + dias_depois_vencimento <= 50
);