-- ============================================================
-- Migração: Adicionar status "Em andamento" (013)
-- ============================================================

-- Remove a restrição antiga e cria uma nova permitindo 'em andamento'
alter table public.manutencoes drop constraint if exists manutencoes_status_check;
alter table public.manutencoes add constraint manutencoes_status_check check (status in ('realizada', 'agendada', 'em andamento'));
