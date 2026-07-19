-- ============================================================
-- Migração: Corrigir user_id incorretos (007)
-- ============================================================

-- A migração 006 atribuiu um user_id aleatório de todo o sistema para itens antigos.
-- Isso causou falhas ao tentar alterar a visibilidade para Individual, pois o dono da linha
-- não correspondia ao usuário logado, violando o RLS.
-- Aqui nós reatribuímos o user_id de qualquer linha cujo dono atual não pertença ao mesmo household.

update contas c
set user_id = (select id from profiles p where p.household_id = c.household_id limit 1)
where not exists (select 1 from profiles p where p.id = c.user_id and p.household_id = c.household_id);

update cartoes c
set user_id = (select id from profiles p where p.household_id = c.household_id limit 1)
where not exists (select 1 from profiles p where p.id = c.user_id and p.household_id = c.household_id);

update investimentos c
set user_id = (select id from profiles p where p.household_id = c.household_id limit 1)
where not exists (select 1 from profiles p where p.id = c.user_id and p.household_id = c.household_id);
