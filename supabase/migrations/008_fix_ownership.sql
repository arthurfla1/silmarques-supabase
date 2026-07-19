-- ============================================================
-- Migração: Corrigir posse de itens Individuais (008)
-- ============================================================

-- Transfere a posse (user_id) das contas de volta para a pessoa que está marcada como 'responsavel'
update contas c
set user_id = p.id
from profiles p
where c.responsavel = p.nome 
  and c.household_id = p.household_id
  and c.user_id != p.id;

-- Transfere a posse (user_id) dos cartões baseando-se nas contas daquele cartão
update cartoes c
set user_id = (
  select co.user_id 
  from contas co 
  where co.cartao_id = c.id 
    and co.responsavel is not null 
  limit 1
)
where exists (
  select 1 from contas co where co.cartao_id = c.id and co.responsavel is not null
);
