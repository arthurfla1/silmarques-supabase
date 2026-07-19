-- ============================================================
-- INVESTIMENTOS E CAIXINHAS (METAS)
-- ============================================================
create table if not exists investimentos (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  nome text not null,
  tipo text not null default 'Outros' check (tipo in ('Ação', 'FII', 'CDB / Renda Fixa', 'Criptomoeda', 'Fundo de Investimento', 'Stocks (Exterior)', 'ETF', 'Outros')),
  moeda text not null default 'BRL' check (moeda in ('BRL', 'USD', 'EUR', 'BTC', 'ETH')),
  corretora text,
  valor_investido numeric(12,2) not null default 0,
  valor_atual numeric(12,2) not null default 0,
  
  -- Campos para Caixinhas / Metas
  is_caixinha boolean default false,
  meta_alvo numeric(12,2),
  data_limite date,
  cor text,
  
  -- Visibilidade (Geral ou Individual)
  visibilidade text not null default 'Geral' check (visibilidade in ('Geral', 'Individual')),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilitar RLS (Row Level Security)
alter table investimentos enable row level security;

-- Políticas de segurança
create policy "Membros podem ver investimentos da familia" on investimentos for select using (
  household_id in (
    select household_id from profiles where id = auth.uid()
  )
);

create policy "Membros podem inserir investimentos na familia" on investimentos for insert with check (
  household_id in (
    select household_id from profiles where id = auth.uid()
  )
);

create policy "Membros podem atualizar investimentos da familia" on investimentos for update using (
  household_id in (
    select household_id from profiles where id = auth.uid()
  )
);

create policy "Membros podem deletar investimentos da familia" on investimentos for delete using (
  household_id in (
    select household_id from profiles where id = auth.uid()
  )
);

-- Trigger para updated_at
create trigger handle_updated_at before update on investimentos
  for each row execute function update_updated_at();
