-- ============================================================
-- Migração: Privacidade Real de Dados (RLS baseada no usuário)
-- ============================================================

-- 1. Adicionar user_id (dono) nas tabelas que possuem visibilidade
alter table contas add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table cartoes add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table investimentos add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- 2. Atribuir os itens existentes ao primeiro usuário da família (para não sumirem)
do $$
declare
  first_user uuid;
begin
  select id into first_user from profiles limit 1;
  if first_user is not null then
    update contas set user_id = first_user where user_id is null;
    update cartoes set user_id = first_user where user_id is null;
    update investimentos set user_id = first_user where user_id is null;
  end if;
end $$;

-- 3. Excluir políticas antigas
drop policy if exists "contas por household" on contas;
drop policy if exists "cartoes por household" on cartoes;
drop policy if exists "Membros podem ver investimentos da familia" on investimentos;
drop policy if exists "Membros podem inserir investimentos na familia" on investimentos;
drop policy if exists "Membros podem atualizar investimentos da familia" on investimentos;
drop policy if exists "Membros podem deletar investimentos da familia" on investimentos;

-- 4. Criar novas políticas de privacidade estrita
create policy "acesso restrito contas" on contas for all using (
  household_id = get_my_household_id() and (visibilidade = 'Geral' or user_id = auth.uid())
);

create policy "acesso restrito cartoes" on cartoes for all using (
  household_id = get_my_household_id() and (visibilidade = 'Geral' or user_id = auth.uid())
);

create policy "acesso restrito investimentos" on investimentos for all using (
  household_id = get_my_household_id() and (visibilidade = 'Geral' or user_id = auth.uid())
);
