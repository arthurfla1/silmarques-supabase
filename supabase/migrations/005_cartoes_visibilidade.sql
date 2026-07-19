-- ============================================================
-- Migração: Adicionar visibilidade aos cartões de crédito
-- ============================================================

-- 1. Adicionar coluna 'visibilidade' à tabela 'cartoes'
alter table cartoes add column if not exists visibilidade text not null default 'Geral' check (visibilidade in ('Geral','Individual'));

-- 2. Atualizar políticas RLS para permitir visualização de cartões com base na household
-- A política "cartoes por household" já permite que membros vejam os cartões da sua família.
-- O controle de visibilidade (Geral vs Individual) será feito principalmente pelo Frontend,
-- assim como já é feito com as contas, para permitir cálculos globais quando necessário.
