-- ============================================================
-- Migração: Adicionar Agendamentos de Veículos (012)
-- ============================================================

-- Adiciona status para saber se a manutenção foi realizada ou está agendada
alter table public.manutencoes
  add column if not exists status text not null default 'realizada' check (status in ('realizada', 'agendada')),
  add column if not exists anexos jsonb default '[]'::jsonb;
