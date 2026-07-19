-- ============================================================
-- Migração: Cartões de Crédito e Visibilidade de Contas
-- ============================================================

-- 1. Criação da tabela de cartões
create table if not exists cartoes (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  nome text not null,
  banco text not null,
  limite numeric(12,2) not null default 0,
  dia_vencimento integer not null default 10,
  dia_fechamento integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilitar RLS na nova tabela
alter table cartoes enable row level security;

-- Política de RLS: acesso apenas para membros da mesma household
create policy "cartoes por household" on cartoes
  for all using (household_id = get_my_household_id());


-- 2. Alteração na tabela de contas
alter table contas add column if not exists cartao_id uuid references cartoes(id) on delete set null;
alter table contas add column if not exists visibilidade text not null default 'Geral' check (visibilidade in ('Geral','Individual'));

-- ============================================================
-- AVISO: Execute este código no SQL Editor do seu Supabase Dashboard!
-- ============================================================
