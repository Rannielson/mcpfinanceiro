-- 005_south_fields.sql
-- Adds South system integration fields to clientes table

ALTER TABLE clientes ADD COLUMN token_erp_south TEXT;
ALTER TABLE clientes ADD COLUMN base_url_south TEXT;
