-- ============================================================
-- Migração: Adicionar Tabelas para Backend de Importação (010)
-- ============================================================

-- Tabela para rastrear o histórico e status de arquivos enviados
create table if not exists importacoes (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  nome_arquivo text not null,
  tipo_arquivo text not null default 'desconhecido',
  status text not null default 'processando' check (status in ('processando', 'concluido', 'erro')),
  erro_mensagem text,
  total_lancamentos integer default 0,
  total_duplicados integer default 0,
  created_at timestamptz default now()
);

-- Tabela para o "Aprendizado Contínuo" do sistema (substitui custos pesados de IA)
create table if not exists regras_classificacao (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  palavra_chave text not null,
  categoria text not null,
  created_at timestamptz default now(),
  unique (household_id, palavra_chave)
);

-- Adicionar colunas na tabela 'contas' para suportar importação inteligente
alter table contas
  add column if not exists hash_dedup text,
  add column if not exists importacao_id uuid references importacoes(id) on delete set null,
  add column if not exists categoria_confirmada boolean default true,
  add column if not exists origem_importacao text;

-- RLS (Row Level Security)
alter table importacoes enable row level security;
alter table regras_classificacao enable row level security;

create policy "importacoes por household" on importacoes
  for all using (household_id = get_my_household_id());

create policy "regras_classificacao por household" on regras_classificacao
  for all using (household_id = get_my_household_id());
