import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/db';
import { Receipt, ShoppingCart, Package, Sparkles, Car, FileText, Award, Bell, CheckCircle2, AlertCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, SectionHeader, Metric, EmptyState, Badge, Row, HealthRing, LoadingScreen, ErrorBanner } from '../components/ui';
import { fmtMoney } from '../lib/constants';

export function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen label="Carregando Família SilMarques..."/>;
  if (!user) return <Navigate to="/login" replace/>;
  if (profile && profile.status === 'pendente') return <Navigate to="/aguardando-aprovacao" replace/>;
  return children;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setResumo(await dashboardApi.resumo()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <LoadingScreen label="Carregando painel..."/>;
  if (error) return <ErrorBanner message={error} onRetry={load}/>;
  if (!resumo) return null;

  const { health_pct, financeiro, tarefas_concluidas_hoje, contas_vencidas, contas_proximas,
    itens_falta, itens_vencendo, itens_vencidos, tarefas_pendentes, tarefas_urgentes,
    manutencoes_proximas, garantias_proximas, documentos_vencendo, lista_compras_pendentes } = resumo;

  const toneColor = { red:'var(--sm-red)', amber:'var(--sm-amber)', blue:'var(--sm-blue)' };
  const alertas = [
    ...contas_vencidas.map(c=>({ tone:'red', icon:Receipt, text:`Conta "${c.descricao}" venceu há ${Math.abs(c.dias)} dia(s)`, route:'/contas' })),
    ...itens_vencidos.map(i=>({ tone:'red', icon:Package, text:`${i.nome} está vencido no estoque`, route:'/estoque' })),
    ...itens_falta.map(i=>({ tone:'amber', icon:Package, text:`${i.nome} está em falta (mín. ${i.minimo} ${i.unidade})`, route:'/estoque' })),
    ...itens_vencendo.map(i=>({ tone:'amber', icon:Package, text:`${i.nome} vence em ${i.dias} dia(s)`, route:'/estoque' })),
    ...tarefas_urgentes.map(t=>({ tone:'amber', icon:Sparkles, text:`Tarefa urgente: ${t.nome} (${t.ambiente})`, route:'/limpeza' })),
    ...manutencoes_proximas.map(m=>({ tone:'blue', icon:Car, text:`${m.veiculo}: ${m.tipo} — ${m.detalhe}`, route:'/veiculos' })),
    ...garantias_proximas.map(g=>({ tone:'blue', icon:Award, text:`Garantia de "${g.nome}" vence em ${g.dias} dias`, route:'/patrimonio' })),
    ...documentos_vencendo.map(d=>({ tone:'blue', icon:FileText, text:`Documento "${d.nome}" vence em ${d.dias} dias`, route:'/documentos' })),
  ];

  return (
    <div className="fadein">
      <SectionHeader 
        title={`Olá, ${profile?.nome?.split(' ')[0] || 'família'} 👋`} 
        subtitle={`Hoje é ${new Date().toLocaleDateString('pt-BR')} — aqui está o resumo da casa.`}
        action={
          <div style={{ background:'var(--sm-surface)', border:'1px solid var(--sm-border)', borderRadius:12, padding:'8px 16px', display:'flex', alignItems:'center', gap:8, fontWeight:600, fontSize:13.5, color:'var(--sm-text)' }}>
            <span style={{ color:'var(--sm-text-soft)' }}>Residência:</span>
            <span style={{ color:'var(--sm-red)', fontWeight:700 }}>{profile?.household_nome || 'Família SilMarques'}</span>
          </div>
        }
      />

      <div style={{ display:'grid', gridTemplateColumns:'minmax(200px,280px) 1fr', gap:16, marginBottom:16 }} className="dash-top">
        <Card style={{ display:'flex', alignItems:'center', justifyContent:'center' }}><HealthRing pct={health_pct}/></Card>
        <Card>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--sm-text-soft)', marginBottom:12 }}>Resumo financeiro do mês</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12 }}>
            <Metric icon={DollarSign} label="Gastos previstos" value={fmtMoney(financeiro.gastos_mes)}/>
            <Metric icon={CheckCircle2} label="Já pago" value={fmtMoney(financeiro.gastos_pagos)} tone="green"/>
            <Metric icon={AlertCircle} label="A pagar" value={fmtMoney(financeiro.gastos_pendentes)} tone="amber"/>
            <Metric icon={Sparkles} label="Tarefas concluídas hoje" value={tarefas_concluidas_hoje} tone="blue"/>
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <Bell size={18}/><span style={{ fontWeight:600, fontSize:15 }}>Alertas importantes</span>
          {alertas.length>0 && <Badge tone="red">{alertas.length}</Badge>}
        </div>
        {alertas.length===0
          ? <EmptyState icon={CheckCircle2} title="Tudo em ordem!" subtitle="Nenhum alerta pendente."/>
          : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {alertas.slice(0,8).map((a,i) => {
                const Icon=a.icon;
                return (
                  <div key={i} onClick={()=>navigate(a.route)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'var(--sm-bg)', cursor:'pointer', border:'1px solid var(--sm-border)' }}>
                    <div style={{ color:toneColor[a.tone], display:'flex' }}><Icon size={17}/></div>
                    <span style={{ fontSize:13.5, flex:1 }}>{a.text}</span>
                  </div>
                );
              })}
            </div>}
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
        {[
          { icon:Receipt, title:'Contas a vencer', route:'/contas', items: contas_proximas.slice(0,4).map(c=>({ left:c.descricao, right:fmtMoney(c.valor), badge:<Badge tone={c.dias<=2?'amber':'neutral'}>{c.dias}d</Badge> })), empty:'Nenhuma conta próxima' },
          { icon:ShoppingCart, title:'Lista de compras', route:'/compras', items: lista_compras_pendentes.slice(0,4).map(c=>({ left:c.produto, right:`${c.quantidade} ${c.unidade}`, badge:<Badge tone={c.tipo==='feira'?'green':'blue'}>{c.tipo}</Badge> })), empty:'Lista vazia' },
          { icon:Package, title:'Estoque em alerta', route:'/estoque', items: [...itens_vencidos.slice(0,2).map(i=>({ left:i.nome, right:'vencido', badge:<Badge tone="red">venceu</Badge> })), ...itens_falta.slice(0,2).map(i=>({ left:i.nome, right:`${i.quantidade}/${i.minimo}`, badge:<Badge tone="amber">em falta</Badge> }))], empty:'Estoque saudável' },
          { icon:Sparkles, title:'Tarefas domésticas', route:'/limpeza', items: tarefas_pendentes.slice(0,4).map(t=>({ left:t.nome, right:t.responsavel||'—', badge:<Badge tone={t.prioridade==='Urgente'?'red':t.prioridade==='Alta'?'amber':'neutral'}>{t.prioridade}</Badge> })), empty:'Tudo limpo!' },
          { icon:Car, title:'Veículos', route:'/veiculos', items: manutencoes_proximas.slice(0,4).map((m,i)=>({ left:`${m.veiculo} — ${m.tipo}`, right:m.detalhe, badge:<Badge tone="blue">atenção</Badge> })), empty:'Nenhuma manutenção próxima' },
          { icon:Award, title:'Garantias e docs', route:'/patrimonio', items: [...garantias_proximas.slice(0,2).map(g=>({ left:g.nome, right:`${g.dias}d`, badge:<Badge tone="blue">garantia</Badge> })), ...documentos_vencendo.slice(0,2).map(d=>({ left:d.nome, right:`${d.dias}d`, badge:<Badge tone="blue">doc</Badge> }))], empty:'Nada vencendo' },
        ].map(s => (
          <Card key={s.route}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, fontSize:15 }}><s.icon size={18}/>{s.title}</div>
              <button onClick={()=>navigate(s.route)} style={{ background:'transparent', border:'none', color:'var(--sm-text-soft)', fontSize:12, fontWeight:600, cursor:'pointer' }}>ver tudo</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {s.items.length===0 ? <EmptyState icon={CheckCircle2} title={s.empty}/> : s.items.map((r,i)=><Row key={i} {...r}/>)}
            </div>
          </Card>
        ))}
      </div>
      <style>{`@media(max-width:760px){.dash-top{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}
