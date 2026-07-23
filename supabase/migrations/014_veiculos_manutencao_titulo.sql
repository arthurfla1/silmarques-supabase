-- ============================================================
-- Migração: Adicionar Título para Manutenções (014)
-- ============================================================

-- Renomeia a coluna 'descricao' atual para 'titulo' (mantendo a obrigatoriedade e os dados antigos)
alter table public.manutencoes rename column descricao to titulo;

-- Adiciona uma nova coluna 'descricao' para armazenar os detalhes opcionais longos
alter table public.manutencoes add column descricao text;
