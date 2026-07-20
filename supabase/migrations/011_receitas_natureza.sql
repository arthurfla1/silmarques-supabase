-- ============================================================
-- Migração: Adicionar Receitas e Natureza do Custo (011)
-- ============================================================

-- Adicionar colunas para identificar se é entrada ou saída, e se é fixo ou variável
alter table contas
  add column if not exists tipo_transacao text not null default 'despesa' check (tipo_transacao in ('receita', 'despesa', 'transferencia')),
  add column if not exists natureza_custo text default 'variavel' check (natureza_custo in ('fixo', 'variavel') or natureza_custo is null);

-- Nota:
-- 'transferencia' será usado para o pagamento da fatura do cartão de crédito ou
-- transferências entre contas da mesma pessoa, para que não seja contabilizado
-- como uma nova despesa no dashboard (evitando duplicidade se a pessoa já
-- lança os gastos do cartão separadamente).
