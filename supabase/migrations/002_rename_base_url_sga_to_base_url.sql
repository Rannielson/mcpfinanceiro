-- Para quem já executou 001 antes da alteração: renomear base_url_sga -> base_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'base_url_sga'
  ) THEN
    ALTER TABLE clientes RENAME COLUMN base_url_sga TO base_url;
  END IF;
END $$;
