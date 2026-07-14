-- ============================================================
-- Família SilMarques — Schema completo para Supabase
-- ============================================================
-- Execute esse SQL no Supabase: Dashboard → SQL Editor → New query → Cole e rode

-- Extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- HOUSEHOLDS (residências)
-- ============================================================
create table if not exists households (
  id uuid primary key default uuid_generate_v4(),
  nome text not null default 'Família SilMarques',
  created_at timestamptz default now()
);

-- ============================================================
-- PROFILES (dados extras do usuário além do auth.users)
-- O Supabase Auth cuida do login. Esta tabela guarda nome,
-- telefone, função e permissão de cada membro.
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete cascade,
  nome text not null,
  telefone text,
  funcao text,
  permissao text not null default 'Morador' check (permissao in ('Administrador','Morador','Colaborador')),
  created_at timestamptz default now()
);

-- ============================================================
-- CONTAS DA CASA
-- ============================================================
create table if not exists contas (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  descricao text not null,
  categoria text not null,
  valor numeric(12,2) not null default 0,
  vencimento date not null,
  responsavel text,
  forma text,
  status text not null default 'pendente' check (status in ('pendente','paga')),
  comprovante boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ESTOQUE DOMÉSTICO
-- ============================================================
create table if not exists estoque (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  nome text not null,
  marca text,
  categoria text not null,
  quantidade numeric(10,2) not null default 0,
  unidade text not null default 'Unidade',
  minimo numeric(10,2) not null default 0,
  local text not null,
  validade date,
  valor numeric(12,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- LISTA DE COMPRAS (Feira + Mercado)
-- ============================================================
create table if not exists lista_compras (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  produto text not null,
  categoria text,
  quantidade numeric(10,2) not null default 1,
  unidade text not null default 'Unidade',
  tipo text not null default 'mercado' check (tipo in ('feira','mercado')),
  comprado boolean default false,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- LIMPEZA DA CASA
-- ============================================================
create table if not exists limpeza (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  nome text not null,
  ambiente text not null,
  descricao text,
  tempo_estimado integer not null default 15,
  frequencia text not null default 'Semanal',
  prioridade text not null default 'Média' check (prioridade in ('Baixa','Média','Alta','Urgente')),
  responsavel text,
  status text not null default 'pendente' check (status in ('pendente','concluida')),
  fotos_antes integer default 0,
  fotos_depois integer default 0,
  tempo_gasto integer,
  data_conclusao date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- VEÍCULOS
-- ============================================================
create table if not exists veiculos (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  marca text not null,
  modelo text not null,
  ano integer not null,
  placa text not null,
  cor text,
  km integer not null default 0,
  proxima_troca_km integer,
  proxima_troca_data date,
  seguro_vencimento date,
  seguradora text,
  licenciamento_vencimento date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MANUTENÇÕES DE VEÍCULOS
-- ============================================================
create table if not exists manutencoes (
  id uuid primary key default uuid_generate_v4(),
  veiculo_id uuid references veiculos(id) on delete cascade not null,
  data date not null,
  categoria text not null,
  descricao text not null,
  local text,
  valor numeric(12,2) not null default 0,
  km integer not null default 0,
  nota_fiscal boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- DOCUMENTOS DA CASA
-- ============================================================
create table if not exists documentos (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  nome text not null,
  categoria text not null,
  descricao text,
  emissao date,
  vencimento date,
  responsavel text,
  tags text[] default '{}',
  arquivo_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PATRIMÔNIO E GARANTIAS
-- ============================================================
create table if not exists patrimonio (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  nome text not null,
  marca text,
  modelo text,
  numero_serie text,
  data_compra date,
  valor numeric(12,2) not null default 0,
  loja text,
  categoria text not null,
  garantia_inicio date,
  garantia_fim date,
  garantia_empresa text,
  garantia_contato text,
  foto_path text,
  nota_fiscal_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Garante que cada família só acessa os próprios dados
-- ============================================================

-- Habilitar RLS em todas as tabelas
alter table households enable row level security;
alter table profiles enable row level security;
alter table contas enable row level security;
alter table estoque enable row level security;
alter table lista_compras enable row level security;
alter table limpeza enable row level security;
alter table veiculos enable row level security;
alter table manutencoes enable row level security;
alter table documentos enable row level security;
alter table patrimonio enable row level security;

-- Função auxiliar: retorna o household_id do usuário logado
create or replace function get_my_household_id()
returns uuid language sql security definer stable as $$
  select household_id from profiles where id = auth.uid()
$$;

-- HOUSEHOLDS: políticas de acesso
create policy "usuarios veem propria household" on households
  for select using (id = get_my_household_id() or get_my_household_id() is null);

create policy "usuarios atualizam propria household" on households
  for update using (id = get_my_household_id());

create policy "usuarios deletam propria household" on households
  for delete using (id = get_my_household_id());

create policy "usuarios criam household" on households
  for insert to authenticated with check (true);

-- PROFILES: políticas de acesso
create policy "usuarios veem perfis da household ou proprio" on profiles
  for select using (household_id = get_my_household_id() or id = auth.uid());

create policy "usuarios atualizam proprio perfil" on profiles
  for update using (id = auth.uid());

create policy "usuarios deletam proprio perfil" on profiles
  for delete using (id = auth.uid());

-- CONTAS
create policy "contas por household" on contas
  for all using (household_id = get_my_household_id());

-- ESTOQUE
create policy "estoque por household" on estoque
  for all using (household_id = get_my_household_id());

-- LISTA DE COMPRAS
create policy "compras por household" on lista_compras
  for all using (household_id = get_my_household_id());

-- LIMPEZA
create policy "limpeza por household" on limpeza
  for all using (household_id = get_my_household_id());

-- VEÍCULOS
create policy "veiculos por household" on veiculos
  for all using (household_id = get_my_household_id());

-- MANUTENÇÕES: acesso via veículo da household
create policy "manutencoes por household" on manutencoes
  for all using (
    veiculo_id in (
      select id from veiculos where household_id = get_my_household_id()
    )
  );

-- DOCUMENTOS
create policy "documentos por household" on documentos
  for all using (household_id = get_my_household_id());

-- PATRIMÔNIO
create policy "patrimonio por household" on patrimonio
  for all using (household_id = get_my_household_id());

-- ============================================================
-- TRIGGER: atualiza updated_at automaticamente
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_contas_updated before update on contas
  for each row execute function update_updated_at();
create trigger trg_estoque_updated before update on estoque
  for each row execute function update_updated_at();
create trigger trg_compras_updated before update on lista_compras
  for each row execute function update_updated_at();
create trigger trg_limpeza_updated before update on limpeza
  for each row execute function update_updated_at();
create trigger trg_veiculos_updated before update on veiculos
  for each row execute function update_updated_at();
create trigger trg_documentos_updated before update on documentos
  for each row execute function update_updated_at();
create trigger trg_patrimonio_updated before update on patrimonio
  for each row execute function update_updated_at();

-- ============================================================
-- TRIGGER: cria perfil automaticamente após signup
-- Quando alguém cria uma conta via Supabase Auth, este trigger
-- insere um registro em profiles automaticamente.
-- O household_id fica null por ora — é preenchido no primeiro login
-- pelo frontend quando o usuário informa o nome da residência.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, household_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    null
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
