-- ============================================================
-- Migração 002: Uploads de Arquivos e Novas Colunas de Veículos
-- ============================================================

-- Adicionar novas colunas para caminhos de arquivos
alter table public.veiculos add column if not exists foto_path text;
alter table public.manutencoes add column if not exists nota_fiscal_path text;

-- Criar o bucket de arquivos 'arquivos' se não existir
insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', true)
on conflict (id) do nothing;

-- Remover políticas se existirem para evitar conflitos de recriação
drop policy if exists "Usuarios autenticados sobem arquivos" on storage.objects;
drop policy if exists "Usuarios autenticados deletam arquivos" on storage.objects;
drop policy if exists "Leitura publica de arquivos" on storage.objects;

-- Criar políticas de acesso para o bucket 'arquivos'
create policy "Usuarios autenticados sobem arquivos" on storage.objects
  for insert to authenticated with check (bucket_id = 'arquivos');

create policy "Usuarios autenticados deletam arquivos" on storage.objects
  for delete to authenticated using (bucket_id = 'arquivos');

create policy "Leitura publica de arquivos" on storage.objects
  for select using (bucket_id = 'arquivos');
