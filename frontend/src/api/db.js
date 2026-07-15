/**
 * api/db.js — camada de acesso ao banco via Supabase JS SDK.
 * Substitui completamente o backend FastAPI + Railway.
 *
 * Cada função lança um Error se a query falhar, com a mensagem
 * do Supabase, para facilitar o tratamento de erro no frontend.
 */
import { supabase } from '../lib/supabase';

// ── helper ──────────────────────────────────────────────────
function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ── AUTH ────────────────────────────────────────────────────
export const authApi = {
  async signup({ householdNome, nome, email, password, telefone, funcao, inviteHouseholdId }) {
    // 1. Cria o usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    if (error) throw new Error(error.message);

    const userId = data.user.id;

    let householdId = inviteHouseholdId;

    if (!householdId) {
      // 2. Cria a household
      const household = check(
        await supabase.from('households').insert({ nome: householdNome }).select().single()
      );
      householdId = household.id;
    }

    // 3. Atualiza o perfil gerado pelo trigger com household_id e dados extras
    check(
      await supabase.from('profiles').update({
        household_id: householdId,
        nome,
        telefone: telefone || null,
        funcao: funcao || null,
        permissao: inviteHouseholdId ? 'Morador' : 'Administrador',
      }).eq('id', userId)
    );

    return data.user;
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.user;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const profile = check(
      await supabase.from('profiles').select('*, households(nome)').eq('id', user.id).single()
    );
    return {
      ...profile,
      household_nome: profile.households?.nome || 'Minha Residência'
    };
  },

  async getMembers() {
    const profile = await authApi.getProfile();
    if (!profile?.household_id) return [];
    return check(
      await supabase.from('profiles').select('*').eq('household_id', profile.household_id)
    );
  },

  async createMember({ nome, email, password, telefone, funcao, permissao }) {
    const profile = await authApi.getProfile();
    if (!profile?.household_id) throw new Error('Household não encontrada');

    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { nome } }
    });
    if (error) throw new Error(error.message);

    check(await supabase.from('profiles').update({
      household_id: profile.household_id,
      nome, telefone: telefone || null,
      funcao: funcao || null,
      permissao: permissao || 'Morador',
    }).eq('id', data.user.id));

    return check(await supabase.from('profiles').select('*').eq('id', data.user.id).single());
  },

  async updateMember(id, payload) {
    return check(
      await supabase.from('profiles').update(payload).eq('id', id).select().single()
    );
  },

  async deleteMember(id) {
    check(await supabase.from('profiles').delete().eq('id', id));
  },
};

// ── CRUD GENÉRICO ────────────────────────────────────────────
async function getHouseholdId() {
  const profile = await authApi.getProfile();
  if (!profile?.household_id) throw new Error('Usuário sem household. Faça login novamente.');
  return profile.household_id;
}

function makeTableApi(table, orderBy = 'created_at') {
  return {
    async list(filters = {}) {
      let q = supabase.from(table).select('*');
      Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
      q = q.order(orderBy, { ascending: false });
      return check(await q);
    },
    async create(payload) {
      const household_id = await getHouseholdId();
      return check(
        await supabase.from(table).insert({ ...payload, household_id }).select().single()
      );
    },
    async update(id, payload) {
      return check(
        await supabase.from(table).update(payload).eq('id', id).select().single()
      );
    },
    async remove(id) {
      check(await supabase.from(table).delete().eq('id', id));
    },
  };
}

// ── MÓDULOS ──────────────────────────────────────────────────
export const contasApi = makeTableApi('contas', 'vencimento');
export const estoqueApi = makeTableApi('estoque', 'nome');
export const comprasApi = {
  ...makeTableApi('lista_compras', 'created_at'),
  async clearComprados() {
    const household_id = await getHouseholdId();
    check(await supabase.from('lista_compras').delete().eq('household_id', household_id).eq('comprado', true));
  },
};
export const limpezaApi = {
  ...makeTableApi('limpeza', 'created_at'),
  async concluir(id, tempo_gasto) {
    return check(
      await supabase.from('limpeza').update({
        status: 'concluida',
        tempo_gasto,
        data_conclusao: new Date().toISOString().slice(0, 10),
      }).eq('id', id).select().single()
    );
  },
  async reabrir(id) {
    return check(
      await supabase.from('limpeza').update({
        status: 'pendente', tempo_gasto: null, data_conclusao: null,
      }).eq('id', id).select().single()
    );
  },
};

export const veiculosApi = {
  async list() {
    const veiculos = check(
      await supabase.from('veiculos').select('*, manutencoes(*)').order('created_at', { ascending: false })
    );
    return veiculos.map(v => ({
      ...v,
      manutencoes: (v.manutencoes || []).sort((a, b) => new Date(b.data) - new Date(a.data)),
    }));
  },
  async create(payload) {
    const household_id = await getHouseholdId();
    const v = check(
      await supabase.from('veiculos').insert({ ...payload, household_id }).select().single()
    );
    return { ...v, manutencoes: [] };
  },
  async update(id, payload) {
    return check(await supabase.from('veiculos').update(payload).eq('id', id).select().single());
  },
  async remove(id) {
    check(await supabase.from('veiculos').delete().eq('id', id));
  },
  async addManutencao(veiculoId, payload) {
    return check(
      await supabase.from('manutencoes').insert({ ...payload, veiculo_id: veiculoId }).select().single()
    );
  },
  async removeManutencao(manutencaoId) {
    check(await supabase.from('manutencoes').delete().eq('id', manutencaoId));
  },
};

export const documentosApi = makeTableApi('documentos', 'created_at');
export const patrimonioApi = makeTableApi('patrimonio', 'created_at');

// ── DASHBOARD ────────────────────────────────────────────────
export const dashboardApi = {
  async resumo() {
    const household_id = await getHouseholdId();
    const today = new Date().toISOString().slice(0, 10);

    const [
      { data: contas }, { data: estoque }, { data: limpeza },
      { data: veiculos }, { data: documentos }, { data: patrimonio },
      { data: compras },
    ] = await Promise.all([
      supabase.from('contas').select('*').eq('household_id', household_id),
      supabase.from('estoque').select('*').eq('household_id', household_id),
      supabase.from('limpeza').select('*').eq('household_id', household_id),
      supabase.from('veiculos').select('*, manutencoes(valor)').eq('household_id', household_id),
      supabase.from('documentos').select('*').eq('household_id', household_id),
      supabase.from('patrimonio').select('*').eq('household_id', household_id),
      supabase.from('lista_compras').select('*').eq('household_id', household_id).eq('comprado', false),
    ]);

    const daysDiff = (d) => {
      if (!d) return null;
      return Math.round((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    };

    const contasPendentes = (contas || []).filter(c => c.status !== 'paga');
    const contasVencidas = contasPendentes.filter(c => daysDiff(c.vencimento) < 0).map(c => ({ ...c, dias: daysDiff(c.vencimento) }));
    const contasProximas = contasPendentes.filter(c => { const d = daysDiff(c.vencimento); return d !== null && d >= 0 && d <= 7; }).map(c => ({ ...c, dias: daysDiff(c.vencimento) })).sort((a, b) => a.dias - b.dias);
    const gastosMes = (contas || []).reduce((s, c) => { const d = new Date(c.vencimento); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() ? s + Number(c.valor) : s; }, 0);
    const gastosPagos = (contas || []).filter(c => c.status === 'paga').reduce((s, c) => s + Number(c.valor), 0);
    const gastosPendentes = contasPendentes.reduce((s, c) => s + Number(c.valor), 0);

    const itensFalta = (estoque || []).filter(i => Number(i.quantidade) <= Number(i.minimo)).map(i => ({ ...i }));
    const itensVencendo = (estoque || []).filter(i => { const d = daysDiff(i.validade); return d !== null && d >= 0 && d <= 5; }).map(i => ({ ...i, dias: daysDiff(i.validade) }));
    const itensVencidos = (estoque || []).filter(i => { const d = daysDiff(i.validade); return d !== null && d < 0; }).map(i => ({ ...i, dias: daysDiff(i.validade) }));

    const tarefasPendentes = (limpeza || []).filter(t => t.status === 'pendente');
    const tarefasUrgentes = tarefasPendentes.filter(t => t.prioridade === 'Urgente' || t.prioridade === 'Alta');
    const tarefasConcluidasHoje = (limpeza || []).filter(t => t.status === 'concluida' && t.data_conclusao === today).length;

    const manutencoes_proximas = (veiculos || []).flatMap(v => {
      const out = [];
      if (v.proxima_troca_km) {
        const kmR = v.proxima_troca_km - v.km;
        if (kmR <= 1000) out.push({ veiculo: `${v.marca} ${v.modelo}`, tipo: 'Troca de óleo', detalhe: `${Math.max(kmR, 0)} km restantes` });
      }
      const ds = daysDiff(v.seguro_vencimento);
      if (ds !== null && ds <= 30) out.push({ veiculo: `${v.marca} ${v.modelo}`, tipo: 'Seguro', detalhe: ds < 0 ? 'vencido' : `vence em ${ds} dias` });
      const dl = daysDiff(v.licenciamento_vencimento);
      if (dl !== null && dl <= 30) out.push({ veiculo: `${v.marca} ${v.modelo}`, tipo: 'Licenciamento', detalhe: dl < 0 ? 'vencido' : `vence em ${dl} dias` });
      return out;
    });

    const garantias_proximas = (patrimonio || []).filter(b => { const d = daysDiff(b.garantia_fim); return d !== null && d >= 0 && d <= 30; }).map(b => ({ ...b, dias: daysDiff(b.garantia_fim) }));
    const documentos_vencendo = (documentos || []).filter(d => { const dd = daysDiff(d.vencimento); return dd !== null && dd <= 30; }).map(d => ({ ...d, dias: daysDiff(d.vencimento) }));

    // health score
    let ok = 0;
    if (contasVencidas.length === 0) ok++;
    if (itensFalta.length === 0) ok++;
    if (itensVencidos.length === 0) ok++;
    if (tarefasUrgentes.length === 0) ok++;
    if (manutencoes_proximas.length === 0) ok++;
    if (garantias_proximas.length === 0 && documentos_vencendo.length === 0) ok++;

    return {
      health_pct: Math.round((ok / 6) * 100),
      financeiro: { gastos_mes: gastosMes, gastos_pagos: gastosPagos, gastos_pendentes: gastosPendentes },
      tarefas_concluidas_hoje: tarefasConcluidasHoje,
      contas_vencidas: contasVencidas,
      contas_proximas: contasProximas,
      itens_falta: itensFalta,
      itens_vencendo: itensVencendo,
      itens_vencidos: itensVencidos,
      tarefas_pendentes: tarefasPendentes,
      tarefas_urgentes: tarefasUrgentes,
      manutencoes_proximas,
      garantias_proximas,
      documentos_vencendo,
      lista_compras_pendentes: compras || [],
    };
  },

  async relatorios() {
    const household_id = await getHouseholdId();
    const [
      { data: contas }, { data: estoque }, { data: limpeza },
      { data: veiculos }, { data: patrimonio },
    ] = await Promise.all([
      supabase.from('contas').select('*').eq('household_id', household_id),
      supabase.from('estoque').select('*').eq('household_id', household_id),
      supabase.from('limpeza').select('*').eq('household_id', household_id),
      supabase.from('veiculos').select('*, manutencoes(valor)').eq('household_id', household_id),
      supabase.from('patrimonio').select('*').eq('household_id', household_id),
    ]);

    const totalContas = (contas || []).reduce((s, c) => s + Number(c.valor), 0);
    const totalVeiculos = (veiculos || []).reduce((s, v) => s + (v.manutencoes || []).reduce((ss, m) => ss + Number(m.valor), 0), 0);
    const totalPatrimonio = (patrimonio || []).reduce((s, b) => s + Number(b.valor), 0);
    const totalEstoque = (estoque || []).reduce((s, i) => s + Number(i.valor) * Number(i.quantidade), 0);

    const CONTA_CATS = ['Água','Energia','Internet','Telefone','Condomínio','Gás','Streaming','Escola','Cartões','Financiamentos','Outros'];
    const BEM_CATS = ['Eletrodomésticos','Eletrônicos','Móveis','Ferramentas','Equipamentos de Cozinha','Ar-condicionado','Informática','Veículos','Outros'];
    const AMBIENTES = ['Sala','Cozinha','Quartos','Banheiros','Área de Serviço','Quintal','Garagem'];

    return {
      totais: { contas: totalContas, veiculos: totalVeiculos, patrimonio: totalPatrimonio, estoque: totalEstoque },
      contas_pagas: (contas || []).filter(c => c.status === 'paga').length,
      contas_pendentes: (contas || []).filter(c => c.status !== 'paga').length,
      tarefas_concluidas: (limpeza || []).filter(t => t.status === 'concluida').length,
      tarefas_pendentes: (limpeza || []).filter(t => t.status === 'pendente').length,
      gastos_por_categoria_contas: CONTA_CATS.map(name => ({
        name, valor: (contas || []).filter(c => c.categoria === name).reduce((s, c) => s + Number(c.valor), 0)
      })).filter(c => c.valor > 0).sort((a, b) => b.valor - a.valor),
      valor_patrimonio_por_categoria: BEM_CATS.map(name => ({
        name, valor: (patrimonio || []).filter(b => b.categoria === name).reduce((s, b) => s + Number(b.valor), 0)
      })).filter(c => c.valor > 0),
      gastos_por_veiculo: (veiculos || []).map(v => ({
        name: `${v.marca} ${v.modelo}`, valor: (v.manutencoes || []).reduce((s, m) => s + Number(m.valor), 0)
      })).filter(v => v.valor > 0),
      tempo_por_ambiente: AMBIENTES.map(name => ({
        name, valor: (limpeza || []).filter(t => t.ambiente === name && t.status === 'concluida').reduce((s, t) => s + (t.tempo_gasto || 0), 0)
      })).filter(a => a.valor > 0),
    };
  },
};
