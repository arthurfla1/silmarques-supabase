import React, { useState, useMemo } from 'react';
import { Card, SectionHeader, Select, Metric, ProgressBar, EmptyState } from '../components/ui';
import { fmtMoney, fmtDate } from '../lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown, CreditCard, DollarSign, PieChart as PieChartIcon, Activity } from 'lucide-react';

const COLORS = ['#D32F2F','#1565C0','#2E7D32','#B8740A','#6A4C93','#00897B', '#E64A19', '#FBC02D', '#8E24AA', '#0097A7'];

export function DashboardContasView({ contas, cartoes, investimentos }) {
  const [periodo, setPeriodo] = useState('mes_atual');

  // Helpers de Data
  const getPeriodDates = (periodType) => {
    const now = new Date();
    let start, end, pastStart, pastEnd;

    if (periodType === 'mes_atual') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      pastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      pastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (periodType === 'mes_anterior') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      pastStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      pastEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    } else if (periodType === 'trimestre_atual') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
      pastStart = new Date(now.getFullYear(), quarterStartMonth - 3, 1);
      pastEnd = new Date(now.getFullYear(), quarterStartMonth, 0);
    } else if (periodType === 'ano_atual') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      pastStart = new Date(now.getFullYear() - 1, 0, 1);
      pastEnd = new Date(now.getFullYear() - 1, 11, 31);
    }

    return { start, end, pastStart, pastEnd };
  };

  const dates = getPeriodDates(periodo);

  // Filtros
  const contasCurrent = contas.filter(c => {
    const d = new Date(c.vencimento + 'T00:00:00');
    return d >= dates.start && d <= dates.end;
  });

  const contasPast = contas.filter(c => {
    const d = new Date(c.vencimento + 'T00:00:00');
    return d >= dates.pastStart && d <= dates.pastEnd;
  });

  // Totais de Gastos
  const totalCurrent = contasCurrent.reduce((acc, c) => acc + Number(c.valor), 0);
  const totalPast = contasPast.reduce((acc, c) => acc + Number(c.valor), 0);
  
  const diffPercent = totalPast > 0 ? ((totalCurrent - totalPast) / totalPast) * 100 : (totalCurrent > 0 ? 100 : 0);
  const isUp = diffPercent > 0;

  // Gastos por Categoria (Current vs Past)
  const categoryCurrent = {};
  contasCurrent.forEach(c => {
    categoryCurrent[c.categoria] = (categoryCurrent[c.categoria] || 0) + Number(c.valor);
  });
  
  const categoryPast = {};
  contasPast.forEach(c => {
    categoryPast[c.categoria] = (categoryPast[c.categoria] || 0) + Number(c.valor);
  });

  const pieData = Object.keys(categoryCurrent).map(k => ({
    name: k,
    value: categoryCurrent[k]
  })).sort((a,b) => b.value - a.value);

  // Cartões e Limites
  const limiteTotal = cartoes.reduce((acc, c) => acc + Number(c.limite || 0), 0);
  const limiteUsado = contas.filter(c => c.cartao_id && c.status === 'pendente').reduce((acc, c) => acc + Number(c.valor), 0);
  const limiteDisponivel = limiteTotal - limiteUsado;

  const barChartCartoes = cartoes.map(cartao => {
    const gastoCartao = contas.filter(c => c.cartao_id === cartao.id && c.status === 'pendente').reduce((acc, c) => acc + Number(c.valor), 0);
    return {
      name: cartao.nome,
      Limite: Number(cartao.limite || 0),
      Usado: gastoCartao
    };
  });

  // Investimentos
  const totalInvestido = investimentos.filter(i => !i.is_caixinha).reduce((acc, i) => acc + Number(i.valor_atual), 0);
  const totalCaixinhas = investimentos.filter(i => i.is_caixinha).reduce((acc, i) => acc + Number(i.valor_atual), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Controles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 18, color: 'var(--sm-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={20} color="var(--sm-red)" /> Visão Geral
        </h3>
        <Select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ width: 220 }}>
          <option value="mes_atual">Mês Atual</option>
          <option value="mes_anterior">Mês Anterior</option>
          <option value="trimestre_atual">Trimestre Atual</option>
          <option value="ano_atual">Ano Atual</option>
        </Select>
      </div>

      {/* Cards de Topo */}
      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <Card style={{ padding: 16, background: 'linear-gradient(135deg, #fce4e4 0%, #ffffff 100%)', border: '1px solid #f7c8c8' }}>
          <div style={{ fontSize: 12, color: 'var(--sm-text-soft)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
            Despesas no Período
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--sm-text)' }}>
            {fmtMoney(totalCurrent)}
          </div>
          <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: isUp ? 'var(--sm-red)' : 'var(--sm-green)', fontWeight: 500 }}>
            {isUp ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
            {Math.abs(diffPercent).toFixed(1)}% vs anterior ({fmtMoney(totalPast)})
          </div>
        </Card>

        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--sm-text-soft)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
            Limites de Cartão (Total)
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--sm-text)' }}>
            {fmtMoney(limiteTotal)}
          </div>
          <div style={{ fontSize: 13, marginTop: 6, color: 'var(--sm-text-soft)' }}>
            Disponível geral: <strong>{fmtMoney(limiteDisponivel)}</strong>
          </div>
        </Card>

        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--sm-text-soft)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
            Patrimônio (Investido)
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--sm-text)' }}>
            {fmtMoney(totalInvestido)}
          </div>
          <div style={{ fontSize: 13, marginTop: 6, color: 'var(--sm-text-soft)' }}>
            Caixinhas: <strong>{fmtMoney(totalCaixinhas)}</strong>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        
        {/* Gráfico de Pizza: Categorias */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--sm-text)' }}>Distribuição de Gastos (Período Atual)</h4>
          {pieData.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" nameKey="name">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => fmtMoney(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={PieChartIcon} title="Sem gastos" desc="Não há despesas no período selecionado."/>
          )}
        </Card>

        {/* Gráfico de Barras: Limites */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--sm-text)' }}>Uso de Limite por Cartão</h4>
          {barChartCartoes.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartCartoes} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => fmtMoney(value)} />
                  <Legend />
                  <Bar dataKey="Limite" fill="#e0e0e0" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="Usado" fill="var(--sm-red)" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <EmptyState icon={CreditCard} title="Sem cartões" desc="Nenhum cartão cadastrado."/>
          )}
        </Card>

      </div>

      {/* Comparativo de Categorias detalhado */}
      <Card style={{ padding: 20 }}>
         <h4 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--sm-text)' }}>Comparativo de Categorias (Atual vs Anterior)</h4>
         <div style={{ display: 'grid', gap: 12 }}>
            {Object.keys(categoryCurrent).length > 0 ? (
              Object.keys(categoryCurrent).sort((a,b)=> categoryCurrent[b] - categoryCurrent[a]).map(cat => {
                const valAtual = categoryCurrent[cat];
                const valAnt = categoryPast[cat] || 0;
                const variacao = valAnt > 0 ? ((valAtual - valAnt) / valAnt) * 100 : 100;
                const isMaior = variacao > 0;
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'var(--sm-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--sm-border)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--sm-text)', width: 140 }}>{cat}</div>
                    <div style={{ flex: 1, display: 'flex', gap: 20, alignItems: 'center' }}>
                      <div style={{ width: 120 }}>
                        <div style={{ fontSize: 11, color: 'var(--sm-text-soft)' }}>Atual</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtMoney(valAtual)}</div>
                      </div>
                      <div style={{ width: 120 }}>
                        <div style={{ fontSize: 11, color: 'var(--sm-text-soft)' }}>Anterior</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sm-text-soft)' }}>{fmtMoney(valAnt)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: isMaior ? 'var(--sm-red)' : 'var(--sm-green)', fontSize: 13, fontWeight: 600 }}>
                        {isMaior ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                        {Math.abs(variacao).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--sm-text-soft)', fontSize: 14 }}>Não há dados para comparar.</div>
            )}
         </div>
      </Card>

    </div>
  );
}
