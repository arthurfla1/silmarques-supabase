-- ============================================================
-- Migração: Adicionar Histórico e Datas para Lista de Compras (009)
-- ============================================================

-- Adiciona novas colunas à tabela lista_compras
alter table lista_compras 
  add column if not exists data_planejada date,
  add column if not exists arquivado boolean default false,
  add column if not exists data_compra date;
