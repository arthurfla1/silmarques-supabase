import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, CheckCircle2, Circle, DollarSign, Clock, AlertTriangle, Package, ShoppingCart, Apple, Check, Sparkles, Car, Wrench, Shield, FileText, Award, Users, Phone, Mail, BarChart3, Download, MapPin, Receipt, Link as LinkIcon, CreditCard, PieChart as PieChartIcon } from 'lucide-react';
import { contasApi, cartoesApi, investimentosApi, estoqueApi, comprasApi, limpezaApi, veiculosApi, documentosApi, patrimonioApi, authApi, dashboardApi } from '../api/db';
import { supabase } from '../lib/supabase';
import { processarExtratoCSV } from '../lib/importer';
import { useApiList } from '../hooks/useApiList';
import { useFamilia } from '../context/contexts';
import { useAuth } from '../context/AuthContext';
import { InvestimentosView } from './InvestimentosView';
import { DashboardContasView } from './DashboardContasView';

import { Card, SectionHeader, Btn, Input, Select, SelectWithCustom, Field, Modal, TextArea, Badge, IconBtn, EmptyState, Metric, ProgressBar, Avatar, LoadingScreen, ErrorBanner, FileUploader } from '../components/ui';
import { CONTA_CATEGORIAS, RECEITA_CATEGORIAS, ESTOQUE_CATEGORIAS, ESTOQUE_LOCAIS, LIMPEZA_AMBIENTES, LIMPEZA_FREQ, LIMPEZA_PRIORIDADES, VEICULO_CATEGORIAS, DOC_CATEGORIAS, BEM_CATEGORIAS, COMPRA_UNIDADES, MERCADO_CATEGORIAS, PERMISSOES, FEIRA_ITENS, CAR_BRANDS, CARTOES_BANCOS, VISIBILIDADE_OPCOES, fmtMoney, fmtDate, todayStr, addDays, daysUntil, downloadCSV } from '../lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LineChart, Line } from 'recharts';

const COLORS = ['#D32F2F','#1565C0','#2E7D32','#B8740A','#6A4C93','#00897B'];

// ── helpers ────────────────────────────────────────────────────────────────
function useCRUD(api) {
  const list = useApiList(api.list.bind(api));
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const save = async (payload, id) => {
    setSaving(true); setActionError('');
    try {
      if (id) {
        const updated = await api.update(id, payload);
        list.setData(list.data.map(x => x.id === id ? updated : x));
      } else {
        const created = await api.create(payload);
        list.setData([created, ...list.data]);
      }
      return true;
    } catch (e) { setActionError(e.message); return false; }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await api.remove(id); list.setData(list.data.filter(x => x.id !== id)); }
    catch (e) { setActionError(e.message); }
  };

  return { ...list, saving, actionError, save, remove };
}

// ── CONTAS ─────────────────────────────────────────────────────────────────
const statusOf = (c) => {
  if (c.status === 'paga') return 'paga';
  const d = daysUntil(c.vencimento);
  return d < 0 ? 'vencida' : d <= 3 ? 'proxima' : 'pendente';
};
const STATUS_INFO = { paga:{l:'Paga',t:'green'}, vencida:{l:'Vencida',t:'red'}, proxima:{l:'Próx. vencimento',t:'amber'}, pendente:{l:'Pendente',t:'neutral'} };

export function ContasPage() {
  const { data:contas, setData:setContas, loading, error, reload, saving, actionError, save, remove } = useCRUD(contasApi);
  const { familia } = useFamilia();
  const [modal, setModal] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('mes'); // 'mes', 'trimestre', 'ano', 'custom', 'todos'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importModalStep, setImportModalStep] = useState(1);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [visao, setVisao] = useState('Geral');
  const { data:cartoes, setData:setCartoes, loading:loadingCartoes, error:errorCartoes, reload:reloadCartoes, saving:savingCartao, actionError:actionErrorCartao, save:saveCartao, remove:removeCartao } = useCRUD(cartoesApi);
  const { data:investimentos, setData:setInvestimentos, loading:loadingInv, error:errorInv, reload:reloadInv, saving:savingInv, actionError:actionErrorInv, save:saveInv, remove:removeInv } = useCRUD(investimentosApi);

  if (loading || loadingCartoes || loadingInv) return <LoadingScreen label="Carregando dados..."/>;
  if (error || errorInv) return <ErrorBanner message={error || errorInv} onRetry={reload}/>;

  const getPeriodRange = () => {
    const now = new Date();
    let start = null;
    let end = null;
    
    if (periodo === 'mes') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (periodo === 'trimestre') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (periodo === 'ano') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (periodo === 'custom') {
      if (dataInicio) start = new Date(dataInicio + 'T00:00:00');
      if (dataFim) end = new Date(dataFim + 'T23:59:59');
    }
    return { start, end };
  };

  const { start, end } = getPeriodRange();
  
  const contasVisiveis = contas.filter(c => {
    if (visao === 'Geral') return c.visibilidade === 'Geral';
    if (visao === 'Individual') return c.visibilidade === 'Individual';
    return true;
  });

  const contasFiltradasPorPeriodo = contasVisiveis.filter(c => {
    if (periodo === 'todos') return true;
    if (!c.vencimento) return true;
    const date = new Date(c.vencimento + 'T00:00:00');
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });

  const lista = [...contasFiltradasPorPeriodo].filter(c => {
    if (busca && !c.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtro === 'revisao') return c.categoria_confirmada === false;
    return filtro === 'todas' || statusOf(c) === filtro;
  }).sort((a,b) => new Date(a.vencimento)-new Date(b.vencimento));

  const total = contasFiltradasPorPeriodo.reduce((s,c)=>s+Number(c.valor),0);
  const pago = contasFiltradasPorPeriodo.filter(c=>c.status==='paga').reduce((s,c)=>s+Number(c.valor),0);
  const pendente = contasFiltradasPorPeriodo.filter(c=>c.status!=='paga').reduce((s,c)=>s+Number(c.valor),0);
  const vencido = contasFiltradasPorPeriodo.filter(c=>c.status!=='paga'&&daysUntil(c.vencimento)<0).reduce((s,c)=>s+Number(c.valor),0);

  const porCatObj = {};
  contasFiltradasPorPeriodo.forEach(c => {
    porCatObj[c.categoria] = (porCatObj[c.categoria] || 0) + Number(c.valor);
  });
  const porCat = Object.keys(porCatObj).map(cat => ({ categoria: cat, valor: porCatObj[cat] })).filter(c => c.valor > 0).sort((a,b) => b.valor - a.valor);

  const togglePaga = async (c) => {
    const updated = await contasApi.update(c.id, { status: c.status==='paga'?'pendente':'paga' });
    setContas(contas.map(x=>x.id===c.id?updated:x));
  };

  const handleSave = async (payload) => {
    const ok = await save(payload, modal?.id);
    if (ok) setModal(null);
  };

  const labelTotal = periodo === 'mes' ? 'Total do mês' : periodo === 'trimestre' ? 'Total do trimestre' : periodo === 'ano' ? 'Total do ano' : periodo === 'todos' ? 'Total de todas as contas' : 'Total do período';

  return (
    <div className="fadein">
      <SectionHeader title="Contas da casa" subtitle="Vencimentos, pagamentos e gastos por categoria."
        action={
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="secondary" icon={Download} onClick={()=>{setImportModalStep(1);setImportModalOpen(true);}}>Importar Extrato</Btn>
            <Btn icon={Plus} onClick={()=>setModal({})}>Nova conta</Btn>
          </div>
        }/>
      {actionError && <ErrorBanner message={actionError}/>}
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: activeTab === 'dashboard' ? 'var(--sm-red)' : 'var(--sm-surface)', color: activeTab === 'dashboard' ? '#fff' : 'var(--sm-text-soft)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <BarChart3 size={18} /> Dashboard
        </button>
        <button onClick={() => setActiveTab('contas')} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: activeTab === 'contas' ? 'var(--sm-red)' : 'var(--sm-surface)', color: activeTab === 'contas' ? '#fff' : 'var(--sm-text-soft)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Receipt size={18} /> Histórico de Contas
        </button>
        <button onClick={() => setActiveTab('cartoes')} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: activeTab === 'cartoes' ? 'var(--sm-red)' : 'var(--sm-surface)', color: activeTab === 'cartoes' ? '#fff' : 'var(--sm-text-soft)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <CreditCard size={18} /> Meus Cartões
        </button>
        <button onClick={() => setActiveTab('investimentos')} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: activeTab === 'investimentos' ? 'var(--sm-red)' : 'var(--sm-surface)', color: activeTab === 'investimentos' ? '#fff' : 'var(--sm-text-soft)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <PieChartIcon size={18} /> Investimentos e Caixinhas
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16, background: 'var(--sm-surface)', border: '1px solid var(--sm-border)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sm-text)' }}>Visão:</span>
        <div style={{ display: 'flex', gap: 8, marginRight: 16, borderRight: activeTab === 'contas' ? '1px solid var(--sm-border)' : 'none', paddingRight: 16 }}>
          {['Geral', 'Individual'].map(v => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid var(--sm-border)',
                background: visao === v ? 'var(--sm-red)' : 'var(--sm-bg)',
                color: visao === v ? '#fff' : 'var(--sm-text-soft)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {v}
            </button>
          ))}
        </div>
        
        {activeTab === 'contas' && (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sm-text)' }}>Período:</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'mes', label: '1 Mês' },
                { id: 'trimestre', label: 'Trimestral' },
                { id: 'ano', label: 'Anual' },
                { id: 'custom', label: 'Especificar Período' },
                { id: 'todos', label: 'Todos' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriodo(p.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1px solid var(--sm-border)',
                    background: periodo === p.id ? 'var(--sm-red)' : 'var(--sm-bg)',
                    color: periodo === p.id ? '#fff' : 'var(--sm-text-soft)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            
            {periodo === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  style={{ width: 130, padding: '6px 10px', fontSize: 12.5 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--sm-text-soft)' }}>até</span>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  style={{ width: 130, padding: '6px 10px', fontSize: 12.5 }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {activeTab === 'dashboard' && (
        <DashboardContasView 
          contas={contas.filter(c => visao === 'Geral' ? c.visibilidade === 'Geral' : c.visibilidade === 'Individual')} 
          allContas={contas}
          cartoes={cartoes.filter(c => visao === 'Geral' ? c.visibilidade === 'Geral' || !c.visibilidade : c.visibilidade === 'Individual')} 
          investimentos={investimentos.filter(i => visao === 'Geral' ? i.visibilidade === 'Geral' : i.visibilidade === 'Individual')} 
          allInvestimentos={investimentos}
        />
      )}

      {activeTab === 'contas' && (
        <>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
        <Metric icon={DollarSign} label={labelTotal} value={fmtMoney(total)}/>
        <Metric icon={CheckCircle2} label="Pago" value={fmtMoney(pago)} tone="green"/>
        <Metric icon={Clock} label="Pendente" value={fmtMoney(pendente)} tone="amber"/>
        <Metric icon={AlertTriangle} label="Vencido" value={fmtMoney(vencido)} tone="red"/>
      </div>
      {porCat.length>0 && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Gastos por categoria</div>
          {porCat.map(c=>(
            <div key={c.categoria} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span>{c.categoria}</span><span style={{ fontWeight:600 }}>{fmtMoney(c.valor)}</span></div>
              <ProgressBar value={c.valor} max={porCat[0].valor}/>
            </div>
          ))}
        </Card>
      )}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 200px' }}>
          <Search size={16} style={{ position:'absolute', left:12, top:12, color:'var(--sm-text-faint)' }}/>
          <Input placeholder="Buscar conta..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ paddingLeft:36 }}/>
        </div>
        {['todas','revisao','vencida','proxima','pendente','paga'].map(f=>(
          <button key={f} onClick={()=>setFiltro(f)} style={{ padding:'8px 14px', borderRadius:999, fontSize:13, fontWeight:600, border:'1px solid var(--sm-border)', background:filtro===f?'var(--sm-red)':'transparent', color:filtro===f?'#fff':'var(--sm-text-soft)', cursor:'pointer' }}>{f==='todas'?'Todas':f==='revisao'?'⚠️ Revisar':STATUS_INFO[f].l}</button>
        ))}
      </div>
      {lista.length===0 ? <EmptyState icon={Receipt} title="Nenhuma conta encontrada"/> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {lista.map(c=>{
            const st=statusOf(c);
            const isIndividual = c.visibilidade === 'Individual';
            return (
              <Card key={c.id} style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <button onClick={()=>togglePaga(c)} style={{ background:'transparent', border:'none', color:c.status==='paga'?'var(--sm-green)':'var(--sm-text-faint)', display:'flex', cursor:'pointer' }}>
                  {c.status==='paga'?<CheckCircle2 size={24}/>:<Circle size={24}/>}
                </button>
                <div style={{ flex:'1 1 180px', minWidth:0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontWeight:600, fontSize:14.5, textDecoration:c.status==='paga'?'line-through':'none', color:c.status==='paga'?'var(--sm-text-faint)':'var(--sm-text)' }}>{c.descricao}</div>
                    {isIndividual && <Badge tone="neutral" style={{ fontSize: 10 }}>Individual</Badge>}
                    {c.categoria_confirmada === false && <Badge tone="amber" style={{ fontSize: 10 }}>⚠️ IA Sugeriu</Badge>}
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--sm-text-soft)', marginTop:2 }}>{c.categoria} · {c.forma||'—'} · {c.responsavel||'—'}</div>
                </div>
                <Badge tone={STATUS_INFO[st].t}>{STATUS_INFO[st].l}</Badge>
                <div style={{ textAlign:'right', minWidth:90 }}>
                  <div style={{ fontWeight:700, fontFamily:'Outfit', fontSize:15, color: c.tipo_transacao === 'receita' ? 'var(--sm-green)' : c.tipo_transacao === 'transferencia' ? 'var(--sm-text-soft)' : 'var(--sm-text)' }}>
                    {c.tipo_transacao === 'receita' ? '+ ' : c.tipo_transacao === 'despesa' ? '- ' : ''}{fmtMoney(c.valor)}
                  </div>
                  <div style={{ fontSize:12, color:'var(--sm-text-soft)' }}>{fmtDate(c.vencimento)}</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <IconBtn icon={Edit2} onClick={()=>setModal(c)}/>
                  <IconBtn icon={Trash2} tone="red" onClick={()=>remove(c.id)}/>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </>
      )}

      {activeTab === 'cartoes' && (
        <CartoesView 
          cartoes={cartoes.filter(c => visao === 'Geral' ? c.visibilidade === 'Geral' || !c.visibilidade : c.visibilidade === 'Individual')} 
          contas={contas} 
          saving={savingCartao} 
          actionError={actionErrorCartao}
          save={saveCartao} 
          remove={removeCartao} 
          onPagarFatura={async (cartaoId) => {
            if (!confirm('Deseja marcar todas as contas pendentes deste cartão como pagas?')) return;
            const pendentes = contas.filter(c => c.cartao_id === cartaoId && c.status !== 'paga');
            for(const p of pendentes) {
              await contasApi.update(p.id, { status: 'paga' });
            }
            reload();
          }}
        />
      )}

      {activeTab === 'investimentos' && (
        <InvestimentosView
          investimentos={investimentos.filter(i => visao === 'Geral' ? i.visibilidade === 'Geral' : i.visibilidade === 'Individual')}
          saving={savingInv}
          save={saveInv}
          remove={removeInv}
          reload={reloadInv}
        />
      )}

      {modal!==null && (
        <Modal title={modal.id?'Editar conta':'Nova conta'} onClose={()=>setModal(null)}>
          <ContaForm conta={modal.id?modal:null} cartoes={cartoes} familia={familia} saving={saving} onSave={handleSave} onClose={()=>setModal(null)}/>
        </Modal>
      )}
      {importModalOpen && (
        <Modal title="Importar Extrato Bancário" onClose={() => setImportModalOpen(false)} width={importModalStep === 1 ? 780 : importModalStep === 2 ? 1160 : 520}>
          <ImportExtratoForm
            onStepChange={setImportModalStep}
            familia={familia}
            contasExistentes={contas}
            cartoes={cartoes}
            onImport={async (contasParaImportar) => {
              for (const c of contasParaImportar) {
                await contasApi.create({
                  descricao: c.descricao,
                  categoria: c.categoria,
                  valor: c.valor,
                  vencimento: c.vencimento,
                  responsavel: c.responsavel || null,
                  cartao_id: c.cartao_id || null,
                  visibilidade: c.visibilidade || 'Geral',
                  forma: c.forma || 'Boleto',
                  status: 'pendente'
                });
              }
              reload();
              setImportModalOpen(false);
            }}
            onClose={() => setImportModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}

const categorizarTransacao = (descricao) => {
  const desc = (descricao || '').toLowerCase();
  
  if (desc.includes('sabesp') || desc.includes('embasa') || desc.includes('sanepar') || desc.includes('agua') || desc.includes('água')) {
    return { cat: 'Água', just: 'Identificado palavra-chave de saneamento/água.' };
  }
  if (desc.includes('enel') || desc.includes('coelba') || desc.includes('light') || desc.includes('cpfl') || desc.includes('energia') || desc.includes('elektro') || desc.includes('equatorial')) {
    return { cat: 'Energia', just: 'Identificado concessionária de energia elétrica.' };
  }
  if (desc.includes('net') || desc.includes('fibra') || desc.includes('telecom') || desc.includes('link') || desc.includes('wifi') || desc.includes('broadband')) {
    return { cat: 'Internet', just: 'Identificado provedor de internet/banda larga.' };
  }
  if (desc.includes('vivo') || desc.includes('claro') || desc.includes('tim') || desc.includes('oi') || desc.includes('celular') || desc.includes('telefone')) {
    return { cat: 'Telefone', just: 'Identificada operadora de telefonia.' };
  }
  if (desc.includes('condominio') || desc.includes('condomínio') || desc.includes('taxa condominial')) {
    return { cat: 'Condomínio', just: 'Identificado pagamento de taxa de condomínio.' };
  }
  if (desc.includes('gas') || desc.includes('gás') || desc.includes('ultragaz') || desc.includes('liquigas') || desc.includes('supergasbras')) {
    return { cat: 'Gás', just: 'Identificado fornecedor/distribuidor de gás.' };
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('disney') || desc.includes('hbo') || desc.includes('prime video') || desc.includes('streaming') || desc.includes('youtube premium') || desc.includes('deezer') || desc.includes('apple.com/bill')) {
    return { cat: 'Streaming', just: 'Serviço de entretenimento/streaming identificado.' };
  }
  if (desc.includes('escola') || desc.includes('colegio') || desc.includes('colégio') || desc.includes('faculdade') || desc.includes('universidade') || desc.includes('curso') || desc.includes('mensalidade escolar')) {
    return { cat: 'Escola', just: 'Identificada instituição de ensino ou curso.' };
  }
  if (desc.includes('pgto cartao') || desc.includes('nubank') || desc.includes('bradescard') || desc.includes('itaucard') || desc.includes('credicard') || desc.includes('fatura') || desc.includes('cartao') || desc.includes('cartão')) {
    return { cat: 'Cartões', just: 'Fatura de cartão de crédito identificada.' };
  }
  if (desc.includes('financiamento') || desc.includes('leasing') || desc.includes('consórcio') || desc.includes('consorcio') || desc.includes('banco pan') || desc.includes('bv financeira')) {
    return { cat: 'Financiamentos', just: 'Pagamento de financiamento/consórcio.' };
  }
  if (desc.includes('aluguel') || desc.includes('locacao') || desc.includes('locação') || desc.includes('quinto andar') || desc.includes('quintoandar')) {
    return { cat: 'Aluguel', just: 'Pagamento de aluguel residencial.' };
  }
  if (desc.includes('seguro resid') || desc.includes('seguro casa') || desc.includes('seguro residencial')) {
    return { cat: 'Seguro Residencial', just: 'Seguro de proteção residencial.' };
  }
  if (desc.includes('iptu') || desc.includes('ipva') || desc.includes('darf') || desc.includes('imposto') || desc.includes('receita federal') || desc.includes('tributo') || desc.includes('taxa prefeitura')) {
    return { cat: 'Impostos', just: 'Imposto ou tributo governamental identificado.' };
  }
  if (desc.includes('cinema') || desc.includes('cinemark') || desc.includes('cinepolis') || desc.includes('uci') || desc.includes('ingresso.com')) {
    return { cat: 'Cinema', just: 'Identificado gasto com cinema/bilheteria.' };
  }
  if (desc.includes('restaurante') || desc.includes('churrascaria') || desc.includes('pizzaria') || desc.includes('bar') || desc.includes('lanches') || desc.includes('mcdonald') || desc.includes('burger king') || desc.includes('bk') || desc.includes('delivery') || desc.includes('ifood') || desc.includes('ubereats') || desc.includes('rappi') || desc.includes('alimentos') || desc.includes('mercado') || desc.includes('supermercado') || desc.includes('feira')) {
    return { cat: 'Restaurantes', just: 'Classificado como alimentação/restaurantes/delivery/mercado.' };
  }
  if (desc.includes('padaria') || desc.includes('panificadora') || desc.includes('confeitaria') || desc.includes('pao') || desc.includes('pão')) {
    return { cat: 'Padaria', just: 'Nome do estabelecimento indica panificação/padaria.' };
  }
  return { cat: 'Outros', just: 'Sem correspondência lógica com categorias específicas.' };
};

const normalizarValor = (valStr) => {
  if (!valStr) return 0;
  let clean = valStr.replace('R$', '').replace(/\s/g, '').replace(/[^\d\.,\-+]/g, '');
  
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    clean = clean.replace(',', '.');
  } else if (lastDot !== -1) {
    const parts = clean.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 3 && parts.length === 2 && !valStr.includes(',')) {
      clean = clean.replace(/\./g, '');
    }
  }
  
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.abs(parsed);
};

const parseStatementText = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        const desc = item.descricao || item.description || 'Transação sem nome';
        const val = normalizarValor(String(item.valor || item.value || '0'));
        let date = todayStr();
        const dateVal = item.data || item.date;
        if (dateVal) {
          const parts = dateVal.split('/');
          if (parts.length === 3) {
            date = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else if (dateVal.includes('-')) {
            date = dateVal.slice(0, 10);
          }
        }
        const { cat, just } = categorizarTransacao(desc);
        return {
          descricao: desc,
          valor: val,
          vencimento: date,
          categoria: cat,
          justificativa: just,
          selected: true
        };
      });
    }
  } catch (e) {}

  const lines = text.split('\n');
  const results = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const dateRegex = /(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/;
    const dateMatch = trimmed.match(dateRegex);
    let dateStr = todayStr();
    let cleanedLine = trimmed;
    
    if (dateMatch) {
      const matched = dateMatch[0];
      cleanedLine = cleanedLine.replace(matched, '').trim();
      if (matched.includes('/')) {
        const parts = matched.split('/');
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        dateStr = matched;
      }
    }
    const valRegex = /(-?\d+[\.,]\d{1,2}\b)|(-?\d+\b)/g;
    const matches = cleanedLine.match(valRegex);
    let value = 0;
    
    if (matches && matches.length > 0) {
      const matchedVal = matches[matches.length - 1];
      cleanedLine = cleanedLine.replace(matchedVal, '').trim();
      value = normalizarValor(matchedVal);
    }
    
    let desc = cleanedLine.replace(/R\$\s*/g, '').replace(/[\-\+]$/, '').trim();
    if (!desc) desc = 'Transação sem descrição';
    
    const descLower = desc.toLowerCase();
    if (descLower.includes('pagamento recebido') || descLower.includes('pagamento de fatura') || descLower.includes('fatura paga')) {
      continue;
    }

    const { cat, just } = categorizarTransacao(desc);
    
    results.push({
      descricao: desc,
      valor: value,
      vencimento: dateStr,
      categoria: cat,
      justificativa: just,
      selected: true
    });
  }
  
  return results;
};

const DynamicSelect = ({ value, onChange, options, style }) => {
  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || value || '';
  
  return (
    <div style={{ display: 'inline-grid', alignItems: 'center' }}>
      <select 
        value={value} 
        onChange={onChange} 
        style={{ ...style, gridArea: '1/1', width: '100%', maxWidth: 'none', textOverflow: 'clip' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ 
        gridArea: '1/1', 
        visibility: 'hidden', 
        whiteSpace: 'nowrap',
        fontSize: style.fontSize || 13,
        padding: style.padding || '6px 28px 6px 12px',
        paddingRight: 44 // Adds extra right padding so the arrow icon doesn't overlap text
      }}>
        {selectedLabel}
      </span>
    </div>
  );
};

function ImportExtratoForm({ familia, cartoes, contasExistentes, onImport, onClose, onStepChange }) {
  const [file, setFile] = useState(null);
  const [defaultResponsavel, setDefaultResponsavel] = useState('');
  const [defaultCartao, setDefaultCartao] = useState('');
  const [defaultVisibilidade, setDefaultVisibilidade] = useState('Geral');
  const [preview, setPreview] = useState([]);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [errorFile, setErrorFile] = useState('');

  React.useEffect(() => {
    if (onStepChange) onStepChange(step);
  }, [step, onStepChange]);

  const loadPdfjs = () => {
    return new Promise((resolve) => {
      if (window.pdfjsLib) return resolve(window.pdfjsLib);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      document.head.appendChild(script);
    });
  };

  const extractTextFromPdf = async (file) => {
    const pdfjs = await loadPdfjs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      text += strings.join(' ') + '\n';
    }
    return text;
  };

  const parseCsvText = (csvText) => {
    const lines = csvText.split('\n');
    const results = [];
    
    const parseCsvLine = (lineStr, delim) => {
      const lineParts = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < lineStr.length; i++) {
        const char = lineStr[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          lineParts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      lineParts.push(current.trim());
      return lineParts;
    };

    let isFirstLine = true;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (isFirstLine) {
        isFirstLine = false;
        const lower = trimmed.toLowerCase();
        if (lower.includes('date') || lower.includes('title') || lower.includes('amount') || lower.includes('descricao') || lower.includes('valor') || lower.includes('data')) {
          continue;
        }
      }
      
      let delimiter = ';';
      if (trimmed.includes(',')) {
        if (!trimmed.includes(';')) {
          delimiter = ',';
        }
      } else if (trimmed.includes('\t')) {
        delimiter = '\t';
      }
      
      const parts = parseCsvLine(trimmed, delimiter);
      if (parts.length < 2) continue;
      
      let dateStr = todayStr();
      let value = 0;
      let desc = '';
      
      const dateRegex = /^(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})$/;
      const isNumericColumn = (str) => {
        const clean = str.replace('R$', '').replace(/\s/g, '').replace(/[^\d\.,\-+]/g, '');
        return clean.length > 0 && /^-?[\d\.,]+$/.test(clean) && /\d/.test(clean);
      };
      
      for (const part of parts) {
        if (dateRegex.test(part)) {
          if (part.includes('/')) {
            const dp = part.split('/');
            dateStr = `${dp[2]}-${dp[1]}-${dp[0]}`;
          } else {
            dateStr = part;
          }
        } else if (isNumericColumn(part)) {
          value = normalizarValor(part);
        } else {
          if (part && part.length > desc.length) {
            desc = part;
          }
        }
      }
      
      if (!desc) {
        desc = parts.find(p => !dateRegex.test(p) && isNaN(parseFloat(p))) || 'Transação';
      }
      
      const descLower = desc.toLowerCase();
      if (descLower.includes('pagamento recebido') || descLower.includes('pagamento de fatura') || descLower.includes('fatura paga')) {
        continue;
      }

      // Check duplicidade
      const isDuplicated = contasExistentes?.some(c => 
        c.descricao.toLowerCase() === descLower &&
        Number(c.valor) === value &&
        c.vencimento === dateStr
      );
      
      results.push({
        descricao: desc,
        valor: value,
        vencimento: dateStr,
        categoria: 'Cartões',
        forma: 'Cartão',
        justificativa: isDuplicated ? '⚠️ Já existe no sistema!' : 'Fatura de cartão de crédito (CSV).',
        selected: !isDuplicated
      });
    }
    
    return results;
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setErrorFile('');
  };

  const handleImportarTudo = async () => {
    setSaving(true);
    setErrorFile('');
    try {
      const transacoesSelecionadas = preview.transacoes.filter(t => t.selected !== false);
      if (transacoesSelecionadas.length === 0) {
        throw new Error('Nenhuma transação selecionada para importação.');
      }
      
      const { error } = await supabase.from('contas').insert(transacoesSelecionadas);
      if (error) throw error;
      
      if (preview.importacao_id) {
        await supabase.from('importacoes').update({
          status: 'concluido',
          total_lancamentos: transacoesSelecionadas.length
        }).eq('id', preview.importacao_id);
      }
      
      setStep(3);
    } catch (e) {
      setErrorFile(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAnalisar = async () => {
    if (!file) {
      setErrorFile('Por favor, selecione um arquivo primeiro.');
      return;
    }
    setLoadingFile(true);
    setErrorFile('');
    try {
      const json = await processarExtratoCSV(file, familia[0]?.household_id, defaultResponsavel, defaultVisibilidade, defaultCartao);

      setPreview({
        transacoes: json.transacoes,
        duplicados: json.duplicados,
        importacao_id: json.importacao_id
      });
      setStep(json.transacoes.length > 0 ? 2 : 3);
    } catch (err) {
      setErrorFile(err.message || 'Erro ao processar arquivo.');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleConfirm = async () => {
    // Agora o "Confirmar" apenas recarrega e fecha, a inserção já foi feita
    onImport([]); // Pass empty to trigger reload
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {step === 1 ? (
        <>
          <div style={{ fontSize: 13.5, color: 'var(--sm-text-soft)', marginBottom: 4 }}>
            Envie o arquivo do seu extrato bancário nos formatos **PDF** ou **CSV**. Nosso sistema irá ler e analisar o arquivo, extraindo as transações e sugerindo a melhor categoria e responsável automaticamente.
          </div>
          {errorFile && <ErrorBanner message={errorFile} />}
          
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Responsável Padrão (Opcional)">
                <Select value={defaultResponsavel} onChange={e => setDefaultResponsavel(e.target.value)}>
                  <option value="">Não definido</option>
                  {familia.filter(m => m.status !== 'pendente').map(m => (
                    <option key={m.id} value={m.nome}>{m.nome}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Visibilidade Padrão">
                <Select value={defaultVisibilidade} onChange={e => setDefaultVisibilidade(e.target.value)}>
                  <option value="Geral">Geral (Todos veem)</option>
                  <option value="Individual">Individual</option>
                </Select>
              </Field>
            </div>
            {cartoes && cartoes.length > 0 && (
              <div style={{ flex: '1 1 200px' }}>
                <Field label="Vincular Cartão (Opcional)">
                  <Select value={defaultCartao} onChange={e => setDefaultCartao(e.target.value)}>
                    <option value="">Nenhum cartão</option>
                    {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </Select>
                </Field>
              </div>
            )}
          </div>
          
          <Field label="Selecionar Arquivo de Extrato (PDF ou CSV)">
            <div style={{
              border: '2px dashed var(--sm-border)',
              borderRadius: 'var(--radius-md)',
              padding: '24px 16px',
              textAlign: 'center',
              background: 'var(--sm-bg)',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                accept=".pdf,.csv"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Download size={28} style={{ color: 'var(--sm-text-soft)' }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--sm-text)' }}>
                  {file ? file.name : 'Clique para buscar ou arraste o arquivo aqui'}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--sm-text-faint)' }}>
                  Apenas arquivos nos formatos .pdf ou .csv
                </span>
              </div>
            </div>
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <Btn variant="secondary" onClick={onClose} disabled={loadingFile}>Cancelar</Btn>
            <Btn onClick={handleAnalisar} disabled={!file || loadingFile}>
              {loadingFile ? 'Analisando...' : 'Analisar Arquivo'}
            </Btn>
          </div>
        </>
      ) : step === 2 ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, color: 'var(--sm-text)' }}>Revisar Transações Identificadas</h3>
            <p style={{ color: 'var(--sm-text-soft)', fontSize: 14 }}>
              A Inteligência Artificial classificou as transações. Você pode ajustar as categorias ou remover as duplicadas que não deseja importar.
            </p>
          </div>
          
          <div style={{ maxHeight: 600, overflowY: 'auto', border: '1px solid var(--sm-border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--sm-surface)', borderBottom: '1px solid var(--sm-border)' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'center', width: 40 }}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                      checked={preview.transacoes?.length > 0 && preview.transacoes.every(t => t.selected !== false)} 
                      onChange={e => { 
                        const checked = e.target.checked; 
                        setPreview({ ...preview, transacoes: preview.transacoes.map(t => ({ ...t, selected: checked })) }); 
                      }} 
                    />
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--sm-text-soft)', fontSize: 13, fontWeight: 600, width: 90, whiteSpace: 'nowrap' }}>Data</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--sm-text-soft)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Descrição</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--sm-text-soft)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Tipo</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--sm-text-soft)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Natureza</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--sm-text-soft)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Categoria (IA)</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--sm-text-soft)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Cartão</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--sm-text-soft)', fontSize: 13, fontWeight: 600, width: 110, whiteSpace: 'nowrap' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {preview.transacoes?.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--sm-border)', opacity: t.selected === false ? 0.5 : 1 }} className="table-row-hover">
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                        checked={t.selected !== false} 
                        onChange={e => { 
                          const novas = [...preview.transacoes]; 
                          novas[idx].selected = e.target.checked; 
                          setPreview({ ...preview, transacoes: novas }); 
                        }} 
                      />
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: 'var(--sm-text)', whiteSpace: 'nowrap' }}>{fmtDate(t.vencimento)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: 'var(--sm-text)' }}>{t.descricao}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <DynamicSelect
                        value={t.tipo_transacao || 'despesa'}
                        onChange={e => {
                          const novas = [...preview.transacoes];
                          novas[idx].tipo_transacao = e.target.value;
                          if (e.target.value !== 'despesa') novas[idx].natureza_custo = null;
                          setPreview({ ...preview, transacoes: novas });
                        }}
                        style={{ padding: '6px 28px 6px 12px', borderRadius: 8, border: '1px solid var(--sm-border)', background: 'var(--sm-bg)', color: 'var(--sm-text)', fontSize: 13, transition: 'all 0.2s', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="%23888" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 2px center' }}
                        options={[
                          { value: 'despesa', label: 'Despesa' },
                          { value: 'receita', label: 'Receita' },
                          { value: 'transferencia', label: 'Transferência' }
                        ]}
                      />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {t.tipo_transacao === 'despesa' ? (
                        <DynamicSelect
                          value={t.natureza_custo || 'variavel'}
                          onChange={e => {
                            const novas = [...preview.transacoes];
                            novas[idx].natureza_custo = e.target.value;
                            setPreview({ ...preview, transacoes: novas });
                          }}
                          style={{ padding: '6px 28px 6px 12px', borderRadius: 8, border: '1px solid var(--sm-border)', background: 'var(--sm-bg)', color: 'var(--sm-text)', fontSize: 13, transition: 'all 0.2s', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="%23888" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 2px center' }}
                          options={[
                            { value: 'fixo', label: 'Fixo' },
                            { value: 'variavel', label: 'Variável' }
                          ]}
                        />
                      ) : <span style={{color:'var(--sm-text-faint)', padding: '0 12px'}}>-</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <DynamicSelect
                        value={t.categoria}
                        onChange={e => {
                          const novas = [...preview.transacoes];
                          novas[idx].categoria = e.target.value;
                          setPreview({ ...preview, transacoes: novas });
                        }}
                        style={{ padding: '6px 28px 6px 12px', borderRadius: 8, border: '1px solid var(--sm-border)', background: 'var(--sm-bg)', color: 'var(--sm-text)', fontSize: 13, transition: 'all 0.2s', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="%23888" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 2px center' }}
                        options={[...new Set([...CONTA_CATEGORIAS, ...RECEITA_CATEGORIAS])].map(c => ({ value: c, label: c }))}
                      />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {cartoes && cartoes.length > 0 ? (
                        <DynamicSelect
                          value={t.cartao_id || ''}
                          onChange={e => {
                            const novas = [...preview.transacoes];
                            novas[idx].cartao_id = e.target.value || null;
                            setPreview({ ...preview, transacoes: novas });
                          }}
                          style={{ padding: '6px 28px 6px 12px', borderRadius: 8, border: '1px solid var(--sm-border)', background: 'var(--sm-bg)', color: 'var(--sm-text)', fontSize: 13, transition: 'all 0.2s', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="%23888" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 2px center' }}
                          options={[
                            { value: '', label: 'Nenhum' },
                            ...cartoes.map(c => ({ value: c.id, label: c.nome }))
                          ]}
                        />
                      ) : <span style={{color:'var(--sm-text-faint)', padding: '0 12px'}}>Nenhum</span>}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 14, color: 'var(--sm-text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <span style={{ color: t.tipo_transacao === 'receita' ? 'var(--sm-green)' : 'var(--sm-text)' }}>
                        {t.tipo_transacao === 'receita' ? '+' : ''}{fmtMoney(t.valor)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setStep(1)}>Voltar</Btn>
            <Btn onClick={handleImportarTudo} disabled={saving}>
              {saving ? 'Salvando...' : 'Confirmar e Salvar Transações'}
            </Btn>
          </div>
        </>
      ) : step === 3 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h3 style={{ fontSize: 20, marginBottom: 8, color: 'var(--sm-text)' }}>Importação Concluída!</h3>
          <p style={{ color: 'var(--sm-text-soft)', marginBottom: 24, fontSize: 14 }}>
            Sincronizamos seu extrato com sucesso.<br/>
            <strong>{preview.transacoes?.length || 0}</strong> novas transações foram adicionadas.
          </p>
          <Btn onClick={handleConfirm}>Voltar para Contas</Btn>
        </div>
      ) : null}
    </div>
  );
}

function CartaoForm({ cartao, saving, actionError, onSave, onClose }) {
  const [form, setForm] = useState(cartao ? { ...cartao } : { nome: '', banco: CARTOES_BANCOS[0].nome, limite: '', dia_vencimento: 10, dia_fechamento: 1, visibilidade: 'Geral' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, limite: Number(form.limite) }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {actionError && <ErrorBanner error={actionError} />}
      <Field label="Nome ou Apelido do Cartão"><Input required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Nubank Principal" /></Field>
      <div className="grid-2">
        <Field label="Banco Emissor">
          <Select value={form.banco} onChange={e => set('banco', e.target.value)}>
            {CARTOES_BANCOS.map(b => <option key={b.nome} value={b.nome}>{b.nome}</option>)}
          </Select>
        </Field>
        <Field label="Limite (R$)"><Input required type="number" step="0.01" min="0" value={form.limite} onChange={e => set('limite', e.target.value)} /></Field>
      </div>
      <div className="grid-2">
        <Field label="Dia do Vencimento"><Input required type="number" min="1" max="31" value={form.dia_vencimento} onChange={e => set('dia_vencimento', Number(e.target.value))} /></Field>
        <Field label="Dia do Fechamento"><Input required type="number" min="1" max="31" value={form.dia_fechamento} onChange={e => set('dia_fechamento', Number(e.target.value))} /></Field>
      </div>
      <Field label="Visibilidade"><Select value={form.visibilidade || 'Geral'} onChange={e => set('visibilidade', e.target.value)}>{VISIBILIDADE_OPCOES.map(v => <option key={v}>{v}</option>)}</Select></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Cartão'}</Btn>
      </div>
    </form>
  );
}

function CartoesView({ cartoes, contas, saving, actionError, save, remove, onPagarFatura }) {
  const [modal, setModal] = useState(null);

  const handleSave = async (payload) => {
    const ok = await save(payload, modal?.id);
    if (ok) setModal(null);
  };

  const getFaturaAtual = (cartaoId) => {
    return contas.filter(c => c.cartao_id === cartaoId && c.status !== 'paga').reduce((sum, c) => sum + Number(c.valor), 0);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn icon={Plus} onClick={() => setModal({})}>Novo Cartão</Btn>
      </div>
      
      {cartoes.length === 0 ? <EmptyState icon={CreditCard} title="Nenhum cartão cadastrado" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {cartoes.map(c => {
            const bancoInfo = CARTOES_BANCOS.find(b => b.nome === c.banco) || CARTOES_BANCOS[CARTOES_BANCOS.length - 1];
            const faturaAtual = getFaturaAtual(c.id);
            const limiteDisponivel = Math.max(0, Number(c.limite) - faturaAtual);
            const pct = Math.min(100, (faturaAtual / (Number(c.limite) || 1)) * 100);
            
            return (
              <Card key={c.id} style={{ position: 'relative', overflow: 'hidden', padding: 0, border: 'none', background: `linear-gradient(135deg, ${bancoInfo.cor} 0%, ${bancoInfo.cor}dd 100%)`, color: bancoInfo.textoDark ? '#000' : '#fff', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0.5, flex: 1, paddingRight: 8 }}>{c.nome}</div>
                    <div style={{ display: 'flex', gap: 4, opacity: 0.8 }}>
                      <button onClick={() => setModal(c)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4 }}><Edit2 size={16} /></button>
                      <button onClick={() => remove(c.id)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 2 }}>Fatura Atual</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{fmtMoney(faturaAtual)}</div>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.9, marginBottom: 6 }}>
                      <span>Limite Disp. {fmtMoney(limiteDisponivel)}</span>
                      <span>Total {fmtMoney(c.limite)}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: bancoInfo.textoDark ? '#000' : '#fff', width: `${pct}%`, borderRadius: 3 }}></div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
                    <div style={{ fontSize: 12, opacity: 0.8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>Vencimento dia {c.dia_vencimento}</span>
                      <span>Fechamento dia {c.dia_fechamento}</span>
                    </div>
                    <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 700, letterSpacing: 0.5, fontStyle: 'italic' }}>
                      {bancoInfo.bandeira}
                    </div>
                  </div>
                  
                  {faturaAtual > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <Btn variant="primary" style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'inherit' }} onClick={() => onPagarFatura && onPagarFatura(c.id)}>
                        Pagar Fatura Atual
                      </Btn>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {modal !== null && (
        <Modal title={modal.id ? 'Editar Cartão' : 'Novo Cartão'} onClose={() => setModal(null)}>
          <CartaoForm cartao={modal.id ? modal : null} saving={saving} actionError={actionError} onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}

function ContaForm({ conta, cartoes, familia, saving, onSave, onClose }) {
  const [form, setForm] = useState(conta ? { 
    descricao: conta.descricao, categoria: conta.categoria, valor: conta.valor, 
    vencimento: conta.vencimento, responsavel: conta.responsavel || '', 
    forma: (conta.forma === 'Cartão de Crédito' ? 'Cartão' : conta.forma) || 'Boleto', status: conta.status, 
    cartao_id: conta.cartao_id || '', visibilidade: conta.visibilidade || 'Geral',
    tipo_transacao: conta.tipo_transacao || 'despesa',
    natureza_custo: conta.natureza_custo || 'variavel'
  } : { 
    descricao: '', categoria: CONTA_CATEGORIAS[0], valor: '', vencimento: addDays(7), 
    responsavel: familia[0]?.nome || '', forma: 'Boleto', status: 'pendente', 
    cartao_id: '', visibilidade: 'Geral',
    tipo_transacao: 'despesa', natureza_custo: 'variavel'
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, valor: Number(form.valor), cartao_id: form.cartao_id || null, natureza_custo: form.tipo_transacao === 'receita' ? null : form.natureza_custo }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={() => setForm(f => ({ ...f, tipo_transacao: 'receita', categoria: RECEITA_CATEGORIAS[0] }))} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid var(--sm-border)', background: form.tipo_transacao === 'receita' ? 'var(--sm-green)' : 'var(--sm-surface)', color: form.tipo_transacao === 'receita' ? '#fff' : 'var(--sm-text)', fontWeight: 600, cursor: 'pointer' }}>📈 Receita</button>
        <button type="button" onClick={() => setForm(f => ({ ...f, tipo_transacao: 'despesa', categoria: CONTA_CATEGORIAS[0] }))} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid var(--sm-border)', background: form.tipo_transacao === 'despesa' ? 'var(--sm-red)' : 'var(--sm-surface)', color: form.tipo_transacao === 'despesa' ? '#fff' : 'var(--sm-text)', fontWeight: 600, cursor: 'pointer' }}>📉 Despesa</button>
      </div>
      
      {form.tipo_transacao === 'despesa' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
          <button type="button" onClick={() => set('natureza_custo', 'fixo')} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--sm-border)', background: form.natureza_custo === 'fixo' ? 'var(--sm-text)' : 'transparent', color: form.natureza_custo === 'fixo' ? 'var(--sm-bg)' : 'var(--sm-text-soft)', fontSize: 13, cursor: 'pointer' }}>Custo Fixo</button>
          <button type="button" onClick={() => set('natureza_custo', 'variavel')} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--sm-border)', background: form.natureza_custo === 'variavel' ? 'var(--sm-text)' : 'transparent', color: form.natureza_custo === 'variavel' ? 'var(--sm-bg)' : 'var(--sm-text-soft)', fontSize: 13, cursor: 'pointer' }}>Custo Variável</button>
        </div>
      )}

      <Field label="Descrição"><Input required value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder={form.tipo_transacao === 'receita' ? 'Ex: Salário do mês' : 'Ex: Conta de luz'} /></Field>
      <div className="grid-2">
        <Field label="Categoria"><SelectWithCustom options={form.tipo_transacao === 'receita' ? RECEITA_CATEGORIAS : CONTA_CATEGORIAS} value={form.categoria} onChange={val => set('categoria', val)} /></Field>
        <Field label="Valor (R$)"><Input required type="number" step="0.01" min="0" value={form.valor} onChange={e => set('valor', e.target.value)} /></Field>
      </div>
      <div className="grid-2">
        <Field label={form.tipo_transacao === 'receita' ? 'Data de Recebimento' : 'Vencimento'}><Input required type="date" value={form.vencimento} onChange={e => set('vencimento', e.target.value)} /></Field>
        <Field label={form.tipo_transacao === 'receita' ? 'Forma de Recebimento' : 'Forma de Pagamento'}>
          <Select value={form.forma} onChange={e => { set('forma', e.target.value); if (e.target.value !== 'Cartão') set('cartao_id', ''); }}>
            {['Boleto', 'Débito automático', 'Cartão', 'Pix', 'Dinheiro', 'Transferência Bancária'].map(f => <option key={f}>{f}</option>)}
          </Select>
        </Field>
      </div>
      
      {form.forma === 'Cartão' && cartoes && cartoes.length > 0 && (
        <Field label="Cartão de Crédito">
          <Select value={form.cartao_id} onChange={e => set('cartao_id', e.target.value)}>
            <option value="">Não especificado</option>
            {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Field>
      )}
      
      <div className="grid-2">
        <Field label="Responsável"><Select value={form.responsavel} onChange={e => set('responsavel', e.target.value)}><option value="">—</option>{familia.filter(m => m.status !== 'pendente').map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}</Select></Field>
        <Field label="Visibilidade"><Select value={form.visibilidade} onChange={e => set('visibilidade', e.target.value)}>{VISIBILIDADE_OPCOES.map(v => <option key={v}>{v}</option>)}</Select></Field>
      </div>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><input type="checkbox" checked={form.status === 'paga'} onChange={e => set('status', e.target.checked ? 'paga' : 'pendente')} /> {form.tipo_transacao === 'receita' ? 'Marcar como recebida' : 'Marcar como paga'}</label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
      </div>
    </form>
  );
}

// ── ESTOQUE ────────────────────────────────────────────────────────────────
export function EstoquePage() {
  const { data:estoque, setData, loading, error, reload, saving, actionError, save, remove } = useCRUD(estoqueApi);
  const [modal, setModal] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroCat, setFiltroCat] = useState('todas');
  const [filtroLocal, setFiltroLocal] = useState('todos');
  const [alertaOnly, setAlertaOnly] = useState(false);

  if (loading) return <LoadingScreen label="Carregando estoque..."/>;
  if (error) return <ErrorBanner message={error} onRetry={reload}/>;

  const itensFalta = estoque.filter(i=>Number(i.quantidade)<=Number(i.minimo));
  const itensVencendo = estoque.filter(i=>{const d=daysUntil(i.validade);return d!==null&&d>=0&&d<=5;});
  const itensVencidos = estoque.filter(i=>daysUntil(i.validade)<0);
  const valorTotal = estoque.reduce((s,i)=>s+Number(i.valor)*Number(i.quantidade),0);

  const lista = estoque.filter(i=>{
    if (busca&&!i.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroCat!=='todas'&&i.categoria!==filtroCat) return false;
    if (filtroLocal!=='todos'&&i.local!==filtroLocal) return false;
    if (alertaOnly) return Number(i.quantidade)<=Number(i.minimo)||(i.validade&&daysUntil(i.validade)<=5);
    return true;
  });

  const adjustQty = async (item, delta) => {
    const qty = Math.max(0,+(Number(item.quantidade)+delta).toFixed(2));
    const updated = await estoqueApi.update(item.id,{quantidade:qty});
    setData(estoque.map(x=>x.id===item.id?updated:x));
  };

  const addToList = async (item) => {
    await comprasApi.create({ produto:item.nome, categoria:item.categoria, quantidade:Math.max(Number(item.minimo)-Number(item.quantidade),1), unidade:item.unidade, tipo:'mercado', comprado:false, observacoes:'Reposição automática' });
  };

  const handleSave = async (payload) => { if (await save(payload, modal?.id)) setModal(null); };

  return (
    <div className="fadein">
      <SectionHeader title="Estoque doméstico" subtitle="Controle produtos, validade e reposição automática." action={<Btn icon={Plus} onClick={()=>setModal({})}>Novo item</Btn>}/>
      {actionError && <ErrorBanner message={actionError}/>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
        <Metric icon={Package} label="Itens" value={estoque.length}/>
        <Metric icon={DollarSign} label="Valor em estoque" value={fmtMoney(valorTotal)}/>
        <Metric icon={AlertTriangle} label="Em falta" value={itensFalta.length} tone={itensFalta.length?'amber':'green'}/>
        <Metric icon={Clock} label="Vencendo/vencido" value={itensVencendo.length+itensVencidos.length} tone={(itensVencendo.length+itensVencidos.length)?'red':'green'}/>
      </div>
      {(itensFalta.length>0||itensVencendo.length>0||itensVencidos.length>0) && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:10 }}>Sugestões de reposição</div>
          {itensVencidos.map(i=><div key={i.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'1px solid var(--sm-border)' }}><span><Badge tone="red">vencido</Badge> {i.nome}</span></div>)}
          {itensVencendo.map(i=><div key={i.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'1px solid var(--sm-border)' }}><span><Badge tone="amber">vence em {daysUntil(i.validade)}d</Badge> {i.nome}</span></div>)}
          {itensFalta.map(i=><div key={i.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, fontSize:13, padding:'6px 0', borderBottom:'1px solid var(--sm-border)' }}>
            <span><Badge tone="amber">em falta</Badge> {i.nome} ({i.quantidade}/{i.minimo} {i.unidade})</span>
            <Btn variant="secondary" style={{ padding:'5px 10px', fontSize:12 }} icon={ShoppingCart} onClick={()=>addToList(i)}>Add à lista</Btn>
          </div>)}
        </Card>
      )}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 180px' }}><Search size={16} style={{ position:'absolute', left:12, top:12, color:'var(--sm-text-faint)' }}/><Input placeholder="Buscar..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ paddingLeft:36 }}/></div>
        <Select value={filtroCat} onChange={e=>setFiltroCat(e.target.value)} style={{ width:'auto' }}><option value="todas">Todas categorias</option>{ESTOQUE_CATEGORIAS.map(c=><option key={c}>{c}</option>)}</Select>
        <Select value={filtroLocal} onChange={e=>setFiltroLocal(e.target.value)} style={{ width:'auto' }}><option value="todos">Todos locais</option>{ESTOQUE_LOCAIS.map(l=><option key={l}>{l}</option>)}</Select>
        <button onClick={()=>setAlertaOnly(!alertaOnly)} style={{ padding:'8px 14px', borderRadius:999, fontSize:13, fontWeight:600, border:'1px solid var(--sm-border)', background:alertaOnly?'var(--sm-red)':'transparent', color:alertaOnly?'#fff':'var(--sm-text-soft)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}><AlertTriangle size={14}/> Alertas</button>
      </div>
      {lista.length===0 ? <EmptyState icon={Package} title="Nenhum item encontrado"/> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
          {lista.map(i=>{
            const baixo=Number(i.quantidade)<=Number(i.minimo);
            const dVal=i.validade?daysUntil(i.validade):null;
            return (
              <Card key={i.id}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div><div style={{ fontWeight:600, fontSize:14.5 }}>{i.nome}</div><div style={{ fontSize:12.5, color:'var(--sm-text-soft)' }}>{i.marca||'—'} · {i.categoria}</div></div>
                  <div style={{ display:'flex', gap:4 }}><IconBtn icon={Edit2} onClick={()=>setModal(i)}/><IconBtn icon={Trash2} tone="red" onClick={()=>remove(i.id)}/></div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <button onClick={()=>adjustQty(i,-1)} style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--sm-border)', background:'var(--sm-bg)', fontSize:16, fontWeight:700, cursor:'pointer' }}>−</button>
                  <span style={{ fontWeight:700, fontFamily:'Outfit', fontSize:16, minWidth:50, textAlign:'center' }}>{Number(i.quantidade)} {i.unidade}</span>
                  <button onClick={()=>adjustQty(i,1)} style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--sm-border)', background:'var(--sm-bg)', fontSize:16, fontWeight:700, cursor:'pointer' }}>+</button>
                  {baixo && <Badge tone="amber">mín. {Number(i.minimo)}</Badge>}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, color:'var(--sm-text-soft)' }}>
                  <span><MapPin size={12} style={{ verticalAlign:-2, marginRight:3 }}/>{i.local}</span>
                  {i.validade ? <Badge tone={dVal<0?'red':dVal<=5?'amber':'neutral'}>{dVal<0?'vencido':`val. ${fmtDate(i.validade)}`}</Badge> : <span>sem validade</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {modal!==null && (
        <Modal title={modal.id?'Editar item':'Novo item'} onClose={()=>setModal(null)}>
          <EstoqueForm item={modal.id?modal:null} saving={saving} onSave={handleSave} onClose={()=>setModal(null)}/>
        </Modal>
      )}
    </div>
  );
}

function EstoqueForm({ item, saving, onSave, onClose }) {
  const [form, setForm] = useState(item?{ nome:item.nome, marca:item.marca||'', categoria:item.categoria, quantidade:item.quantidade, unidade:item.unidade, minimo:item.minimo, local:item.local, validade:item.validade||'', valor:item.valor }:{ nome:'', marca:'', categoria:ESTOQUE_CATEGORIAS[0], quantidade:1, unidade:'Unidade', minimo:1, local:ESTOQUE_LOCAIS[0], validade:'', valor:'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <form onSubmit={e=>{e.preventDefault();onSave({...form,quantidade:Number(form.quantidade),minimo:Number(form.minimo),valor:Number(form.valor)||0,validade:form.validade||null});}} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="grid-2-1">
        <Field label="Nome"><Input required value={form.nome} onChange={e=>set('nome',e.target.value)}/></Field>
        <Field label="Marca"><Input value={form.marca} onChange={e=>set('marca',e.target.value)}/></Field>
      </div>
      <div className="grid-2">
        <Field label="Categoria"><SelectWithCustom options={ESTOQUE_CATEGORIAS} value={form.categoria} onChange={val => set('categoria', val)} /></Field>
        <Field label="Local"><Select value={form.local} onChange={e=>set('local',e.target.value)}>{ESTOQUE_LOCAIS.map(l=><option key={l}>{l}</option>)}</Select></Field>
      </div>
      <div className="grid-3">
        <Field label="Quantidade"><Input required type="number" step="0.01" min="0" value={form.quantidade} onChange={e=>set('quantidade',e.target.value)}/></Field>
        <Field label="Unidade"><Select value={form.unidade} onChange={e=>set('unidade',e.target.value)}>{COMPRA_UNIDADES.map(u=><option key={u}>{u}</option>)}</Select></Field>
        <Field label="Mínimo"><Input required type="number" step="0.01" min="0" value={form.minimo} onChange={e=>set('minimo',e.target.value)}/></Field>
      </div>
      <div className="grid-2">
        <Field label="Validade (opcional)"><Input type="date" value={form.validade||''} onChange={e=>set('validade',e.target.value)}/></Field>
        <Field label="Valor (R$)"><Input type="number" step="0.01" min="0" value={form.valor} onChange={e=>set('valor',e.target.value)}/></Field>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn type="submit" disabled={saving}>{saving?'Salvando...':'Salvar'}</Btn>
      </div>
    </form>
  );
}

// ── COMPRAS ────────────────────────────────────────────────────────────────
export function ComprasPage() {
  const { data:lista, setData:setLista, loading, error, reload } = useApiList(comprasApi.list.bind(comprasApi));
  const [tab, setTab] = useState('todos');
  const [quickAdd, setQuickAdd] = useState('');
  const [dataPlanejada, setDataPlanejada] = useState('');
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState('');

  if (loading) return <LoadingScreen label="Carregando lista..."/>;
  if (error) return <ErrorBanner message={error} onRetry={reload}/>;

  const unarchived = lista.filter(c => !c.arquivado);
  const archived = lista.filter(c => c.arquivado);

  const filtered = unarchived.filter(c=>tab==='todos'||c.tipo===tab);
  const pendentes = filtered.filter(c=>!c.comprado);
  const comprados = filtered.filter(c=>c.comprado);

  const pendentesPorCat = pendentes.reduce((acc, item) => {
    const cat = item.categoria || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const historicoPorData = archived.reduce((acc, item) => {
    const d = item.data_compra || 'Sem data';
    if (!acc[d]) acc[d] = [];
    acc[d].push(item);
    return acc;
  }, {});

  const archiveComprados = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(comprados.map(c => comprasApi.update(c.id, { arquivado: true, data_compra: today })));
      reload();
    } catch(e) { setActionError(e.message); }
  };

  const savePlanejada = async () => {
    if (!dataPlanejada) return;
    try {
      await Promise.all(pendentes.map(c => comprasApi.update(c.id, { data_planejada: dataPlanejada })));
      alert('Data planejada salva!');
    } catch(e) { setActionError(e.message); }
  };

  const toggle = async (item) => {
    try { const u=await comprasApi.update(item.id,{comprado:!item.comprado}); setLista(lista.map(c=>c.id===item.id?u:c)); } catch(e){setActionError(e.message);}
  };
  const remove = async (id) => { try { await comprasApi.remove(id); setLista(lista.filter(c=>c.id!==id)); } catch(e){setActionError(e.message);} };
  const clearComprados = async () => { try { await comprasApi.clearComprados(); setLista(lista.filter(c=>!c.comprado)); } catch(e){setActionError(e.message);} };
  const addItem = async (produto,categoria,tipo,unidade='Unidade') => {
    if (lista.some(c=>c.produto===produto&&!c.comprado)) return;
    try { const c=await comprasApi.create({produto,categoria,quantidade:1,unidade,tipo,comprado:false,observacoes:''}); setLista([...lista,c]); } catch(e){setActionError(e.message);}
  };
  const handleQuick = async (e) => { e.preventDefault(); if(!quickAdd.trim())return; await addItem(quickAdd.trim(),'Outros','mercado'); setQuickAdd(''); };
  const handleSave = async (payload) => { 
    try { 
      if (modal && modal.id) {
        const u = await comprasApi.update(modal.id, payload);
        setLista(lista.map(c => c.id === modal.id ? u : c));
      } else {
        const c = await comprasApi.create(payload); 
        setLista([...lista,c]); 
      }
      setModal(null); 
    } catch(e){
      setActionError(e.message);
    } 
  };

  return (
    <div className="fadein">
      <div className="no-print">
        <SectionHeader title="Lista de compras" subtitle="Feira e supermercado em uma só lista." action={<Btn icon={Plus} onClick={()=>setModal({})}>Item personalizado</Btn>}/>
        {actionError && <ErrorBanner message={actionError}/>}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[{k:'todos',l:'Todos',I:ShoppingCart},{k:'feira',l:'Feira',I:Apple},{k:'mercado',l:'Mercado',I:Package},{k:'historico',l:'Histórico',I:Clock}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{ padding:'8px 16px', borderRadius:999, fontSize:13, fontWeight:600, border:'1px solid var(--sm-border)', background:tab===t.k?'var(--sm-red)':'transparent', color:tab===t.k?'#fff':'var(--sm-text-soft)', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}><t.I size={14}/> {t.l}</button>
        ))}
      </div>
      
      {tab === 'historico' ? (
        <Card>
          <div style={{ fontWeight:600, fontSize:15, marginBottom:12 }}>Histórico de Compras</div>
          {Object.keys(historicoPorData).length === 0 ? <EmptyState icon={Clock} title="Sem histórico" subtitle="Suas compras arquivadas aparecerão aqui."/> : (
            Object.entries(historicoPorData).sort((a,b)=>b[0].localeCompare(a[0])).map(([data, itens]) => (
              <div key={data} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sm-text-soft)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--sm-border)' }}>
                  {data === 'Sem data' ? data : new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {itens.map(c => <CompraItem key={c.id} item={c} onToggle={()=>{}} onRemove={remove} hideToggle/>)}
                </div>
              </div>
            ))
          )}
        </Card>
      ) : (
        <>
          <form onSubmit={handleQuick} style={{ display:'flex', gap:8, marginBottom:16 }}>
            <Input placeholder="Adicionar item rápido..." value={quickAdd} onChange={e=>setQuickAdd(e.target.value)}/>
            <Btn type="submit" icon={Plus}>Adicionar</Btn>
          </form>

          <Card style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>Pendentes ({pendentes.length})</div>
                <button onClick={() => window.print()} style={{ background:'var(--sm-bg)', border:'1px solid var(--sm-border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', display: 'flex', gap: 4, alignItems: 'center' }}><FileText size={14}/> Imprimir / PDF</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--sm-text-soft)', fontWeight: 600 }}>Data p/ ir:</span>
                <Input type="date" value={dataPlanejada} onChange={e=>setDataPlanejada(e.target.value)} style={{ width: 130, padding: '4px 8px', fontSize: 12 }} />
                <button onClick={savePlanejada} style={{ background:'var(--sm-red)', color: '#fff', border:'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Definir</button>
              </div>
            </div>
        {pendentes.length===0 ? <EmptyState icon={ShoppingCart} title="Lista vazia" subtitle="Tudo comprado!"/> : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{pendentes.map(c=><CompraItem key={c.id} item={c} onToggle={toggle} onRemove={remove} onEdit={setModal}/>)}</div>}
      </Card>
      {comprados.length>0 && (
        <Card style={{ marginBottom:16, border: '1px solid var(--sm-border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:600, fontSize:15 }}>Comprados ({comprados.length})</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={clearComprados} style={{ background:'transparent', border:'none', color:'var(--sm-text-soft)', fontSize:12.5, fontWeight:600, cursor:'pointer' }}>Excluir</button>
              <button onClick={archiveComprados} style={{ background:'var(--sm-green)', color: '#fff', border:'none', borderRadius: 6, padding: '4px 12px', fontSize:12.5, fontWeight:600, cursor:'pointer' }}>Arquivar Histórico</button>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{comprados.map(c=><CompraItem key={c.id} item={c} onToggle={toggle} onRemove={remove} onEdit={setModal}/>)}</div>
        </Card>
      )}
      {(tab==='todos'||tab==='feira') && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:12, display:'flex', alignItems:'center', gap:8 }}><Apple size={16}/> Feira — toque para adicionar</div>
          {Object.entries(FEIRA_ITENS).map(([cat,items])=>(
            <div key={cat} style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--sm-text-soft)', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>{cat}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {items.map(item=>{ const a=lista.some(c=>c.produto===item&&!c.comprado); return <button key={item} disabled={a} onClick={()=>setModal({ produto: item, categoria: cat, tipo: 'feira', unidade: 'Kg', quantidade: 1 })} style={{ padding:'6px 12px', borderRadius:999, fontSize:12.5, border:'1px solid var(--sm-border)', background:a?'var(--sm-green-light)':'var(--sm-bg)', color:a?'var(--sm-green)':'var(--sm-text)', display:'flex', alignItems:'center', gap:4, cursor:a?'default':'pointer' }}>{a&&<Check size={12}/>}{item}</button>; })}
              </div>
            </div>
          ))}
        </Card>
      )}
      {(tab==='todos'||tab==='mercado') && (
        <Card>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Mercado — adicionar por categoria</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{MERCADO_CATEGORIAS.map(cat=><button key={cat} onClick={()=>setModal({ produto: '', categoria: cat, tipo: 'mercado', unidade: 'Unidade', quantidade: 1 })} style={{ padding:'8px 14px', borderRadius:999, fontSize:12.5, border:'1px solid var(--sm-border)', background:'var(--sm-bg)', color:'var(--sm-text)', cursor:'pointer' }}>+ {cat}</button>)}</div>
        </Card>
      )}
        </>
      )}
      </div>

      {/* Print Layout */}
      <div className="print-only" style={{ padding: '20px 40px', color: '#111', fontFamily: '"Inter", sans-serif' }}>
        <div style={{ borderBottom: '3px solid #e11d48', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Lista de Compras</h2>
            <div style={{ fontSize: 14, color: '#555', marginTop: 4 }}>Família SilMarques</div>
          </div>
          {dataPlanejada && (
            <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#e11d48', background: '#ffe4e6', padding: '6px 12px', borderRadius: 8, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              Para o dia {new Date(dataPlanejada + 'T00:00:00').toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
        
        {Object.keys(pendentesPorCat).length === 0 ? <p style={{ fontSize: 16, fontStyle: 'italic', color: '#666' }}>Sua lista está vazia.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 40px' }}>
            {Object.entries(pendentesPorCat).map(([cat, items]) => (
              <div key={cat} style={{ breakInside: 'avoid', marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#e11d48', borderBottom: '1px solid #ffe4e6', paddingBottom: 6, marginBottom: 12 }}>
                  {cat}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 6, borderBottom: '1px dashed #eee' }}>
                      <div style={{ width: 16, height: 16, minWidth: 16, border: '2px solid #ccc', borderRadius: 4, marginTop: 2 }}></div>
                      <div style={{ flex: 1, lineHeight: 1.3 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{item.produto}</div>
                        {(item.quantidade !== 1 || item.unidade !== 'Unidade' || item.observacoes) && (
                          <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
                            {Number(item.quantidade)} {item.unidade} {item.observacoes && <span style={{ fontStyle: 'italic' }}>— {item.observacoes}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="no-print">
        {modal && <Modal title={modal.id ? "Editar item" : "Novo item"} onClose={()=>setModal(null)}><CompraForm initialData={modal} onSave={handleSave} onClose={()=>setModal(null)}/></Modal>}
      </div>
    </div>
  );
}

function CompraItem({ item, onToggle, onRemove, onEdit, hideToggle }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 4px', borderBottom:'1px solid var(--sm-border)' }}>
      {!hideToggle && (
        <button onClick={()=>onToggle(item)} style={{ background:'transparent', border:'none', color:item.comprado?'var(--sm-green)':'var(--sm-text-faint)', display:'flex', cursor:'pointer' }}>
          {item.comprado?<CheckCircle2 size={22}/>:<Circle size={22}/>}
        </button>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:500, textDecoration:item.comprado?'line-through':'none', color:item.comprado?'var(--sm-text-faint)':'var(--sm-text)' }}>{item.produto}</div>
        {item.observacoes&&<div style={{ fontSize:12, color:'var(--sm-text-soft)' }}>{item.observacoes}</div>}
      </div>
      <span style={{ fontSize:13, color:'var(--sm-text-soft)', whiteSpace:'nowrap' }}>{Number(item.quantidade)} {item.unidade}</span>
      <Badge tone={item.tipo==='feira'?'green':'blue'}>{item.tipo}</Badge>
      {onEdit && <IconBtn icon={Edit2} onClick={()=>onEdit(item)}/>}
      <IconBtn icon={Trash2} tone="red" onClick={()=>onRemove(item.id)}/>
    </div>
  );
}

function CompraForm({ initialData, onSave, onClose }) {
  const [form, setForm] = useState(initialData && Object.keys(initialData).length > 0 ? {
    produto: initialData.produto || '',
    categoria: initialData.categoria || MERCADO_CATEGORIAS[0],
    quantidade: initialData.quantidade || 1,
    unidade: initialData.unidade || 'Unidade',
    tipo: initialData.tipo || 'mercado',
    observacoes: initialData.observacoes || ''
  } : { produto:'', categoria:MERCADO_CATEGORIAS[0], quantidade:1, unidade:'Unidade', tipo:'mercado', observacoes:'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <form onSubmit={e=>{e.preventDefault();onSave({...form,quantidade:Number(form.quantidade),comprado:false});}} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Field label="Produto"><Input required value={form.produto} onChange={e=>set('produto',e.target.value)}/></Field>
      <div className="grid-2">
        <Field label="Tipo"><Select value={form.tipo} onChange={e=>set('tipo',e.target.value)}><option value="feira">Feira</option><option value="mercado">Mercado</option></Select></Field>
        <Field label="Categoria"><SelectWithCustom options={form.tipo==='feira'?Object.keys(FEIRA_ITENS):MERCADO_CATEGORIAS} value={form.categoria} onChange={val => set('categoria', val)} /></Field>
      </div>
      <div className="grid-2">
        <Field label="Qtd"><Input required type="number" step="0.01" min="0" value={form.quantidade} onChange={e=>set('quantidade',e.target.value)}/></Field>
        <Field label="Unidade"><Select value={form.unidade} onChange={e=>set('unidade',e.target.value)}>{COMPRA_UNIDADES.map(u=><option key={u}>{u}</option>)}</Select></Field>
      </div>
      <Field label="Observações"><Input value={form.observacoes} onChange={e=>set('observacoes',e.target.value)}/></Field>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn type="submit">Adicionar</Btn>
      </div>
    </form>
  );
}

// ── LIMPEZA ────────────────────────────────────────────────────────────────
const PRIO_TONE = { Baixa:'neutral', Média:'blue', Alta:'amber', Urgente:'red' };
const PRIO_ORDER = { Urgente:0, Alta:1, Média:2, Baixa:3 };

export function LimpezaPage() {
  const { data:limpeza, setData, loading, error, reload, saving, actionError, save, remove } = useCRUD(limpezaApi);
  const { familia } = useFamilia();
  const [modal, setModal] = useState(null);
  const [filtroAmbiente, setFiltroAmbiente] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('pendente');

  if (loading) return <LoadingScreen label="Carregando tarefas..."/>;
  if (error) return <ErrorBanner message={error} onRetry={reload}/>;

  const lista = [...limpeza].filter(t=>{
    if (filtroAmbiente!=='todos'&&t.ambiente!==filtroAmbiente) return false;
    return filtroStatus==='todas'||t.status===filtroStatus;
  }).sort((a,b)=>(PRIO_ORDER[a.prioridade]??9)-(PRIO_ORDER[b.prioridade]??9));

  const pendentes = limpeza.filter(t=>t.status==='pendente');
  const concluidasHoje = limpeza.filter(t=>t.status==='concluida'&&t.data_conclusao===todayStr()).length;
  const tempoEst = pendentes.reduce((s,t)=>s+t.tempo_estimado,0);
  const tempoPorAmb = LIMPEZA_AMBIENTES.map(amb=>({ ambiente:amb, tempo:limpeza.filter(t=>t.ambiente===amb&&t.status==='concluida').reduce((s,t)=>s+(t.tempo_gasto||0),0) })).filter(a=>a.tempo>0).sort((a,b)=>b.tempo-a.tempo);

  const conclude = async (tarefa) => {
    const tempo = window.prompt(`Quantos minutos levou "${tarefa.nome}"?`, tarefa.tempo_estimado);
    if (tempo===null) return;
    try { const u=await limpezaApi.concluir(tarefa.id,Number(tempo)||tarefa.tempo_estimado); setData(limpeza.map(t=>t.id===tarefa.id?u:t)); } catch(e){}
  };
  const reopen = async (tarefa) => {
    try { const u=await limpezaApi.reabrir(tarefa.id); setData(limpeza.map(t=>t.id===tarefa.id?u:t)); } catch(e){}
  };
  const handleSave = async (payload) => { if (await save(payload, modal?.id)) setModal(null); };

  return (
    <div className="fadein">
      <SectionHeader title="Limpeza da casa" subtitle="Tarefas, responsáveis, tempos e prioridades." action={<Btn icon={Plus} onClick={()=>setModal({})}>Nova tarefa</Btn>}/>
      {actionError && <ErrorBanner message={actionError}/>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
        <Metric icon={AlertTriangle} label="Pendentes" value={pendentes.length} tone={pendentes.length?'amber':'green'}/>
        <Metric icon={CheckCircle2} label="Concluídas hoje" value={concluidasHoje} tone="green"/>
        <Metric icon={Clock} label="Tempo estimado" value={`${tempoEst} min`} tone="blue"/>
        <Metric icon={AlertTriangle} label="Urgentes" value={pendentes.filter(t=>t.prioridade==='Urgente').length} tone="red"/>
      </div>
      {tempoPorAmb.length>0 && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Tempo gasto por ambiente</div>
          {tempoPorAmb.map(a=>(
            <div key={a.ambiente} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span>{a.ambiente}</span><span style={{ fontWeight:600 }}>{a.tempo} min</span></div>
              <ProgressBar value={a.tempo} max={tempoPorAmb[0].tempo} tone="blue"/>
            </div>
          ))}
        </Card>
      )}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <Select value={filtroAmbiente} onChange={e=>setFiltroAmbiente(e.target.value)} style={{ width:'auto' }}><option value="todos">Todos ambientes</option>{LIMPEZA_AMBIENTES.map(a=><option key={a}>{a}</option>)}</Select>
        {[{k:'pendente',l:'Pendentes'},{k:'concluida',l:'Concluídas'},{k:'todas',l:'Todas'}].map(f=>(
          <button key={f.k} onClick={()=>setFiltroStatus(f.k)} style={{ padding:'8px 14px', borderRadius:999, fontSize:13, fontWeight:600, border:'1px solid var(--sm-border)', background:filtroStatus===f.k?'var(--sm-red)':'transparent', color:filtroStatus===f.k?'#fff':'var(--sm-text-soft)', cursor:'pointer' }}>{f.l}</button>
        ))}
      </div>
      {lista.length===0 ? <EmptyState icon={CheckCircle2} title="Nenhuma tarefa encontrada"/> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {lista.map(t=>(
            <Card key={t.id} style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <button onClick={()=>t.status==='concluida'?reopen(t):conclude(t)} style={{ background:'transparent', border:'none', color:t.status==='concluida'?'var(--sm-green)':'var(--sm-text-faint)', display:'flex', cursor:'pointer' }}>
                {t.status==='concluida'?<CheckCircle2 size={24}/>:<Circle size={24}/>}
              </button>
              <div style={{ flex:'1 1 200px', minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14.5, textDecoration:t.status==='concluida'?'line-through':'none', color:t.status==='concluida'?'var(--sm-text-faint)':'var(--sm-text)' }}>{t.nome}</div>
                <div style={{ fontSize:12.5, color:'var(--sm-text-soft)', marginTop:2 }}>{t.ambiente} · {t.descricao||'—'}</div>
              </div>
              <Badge tone={PRIO_TONE[t.prioridade]}>{t.prioridade}</Badge>
              <Badge tone="neutral">{t.frequencia}</Badge>
              {t.responsavel && (() => {
                const respMember = familia.find(m => m.nome === t.responsavel);
                return (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Avatar name={t.responsavel} url={respMember?.avatar_url} size={28}/>
                    <div style={{ fontSize:12.5, color:'var(--sm-text-soft)' }}>
                      <div>{t.responsavel}</div>
                      <div><Clock size={11} style={{ verticalAlign:-1 }}/> {t.status==='concluida'?`${t.tempo_gasto} min`:`${t.tempo_estimado} min est.`}</div>
                    </div>
                  </div>
                );
              })()}
              <div style={{ display:'flex', gap:6 }}><IconBtn icon={Edit2} onClick={()=>setModal(t)}/><IconBtn icon={Trash2} tone="red" onClick={()=>remove(t.id)}/></div>
            </Card>
          ))}
        </div>
      )}
      {modal!==null && <Modal title={modal.id?'Editar tarefa':'Nova tarefa'} onClose={()=>setModal(null)}><LimpezaForm tarefa={modal.id?modal:null} familia={familia} saving={saving} onSave={handleSave} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );
}

function LimpezaForm({ tarefa, familia, saving, onSave, onClose }) {
  const [form, setForm] = useState(tarefa?{ nome:tarefa.nome, ambiente:tarefa.ambiente, descricao:tarefa.descricao||'', tempo_estimado:tarefa.tempo_estimado, frequencia:tarefa.frequencia, prioridade:tarefa.prioridade, responsavel:tarefa.responsavel||'' }:{ nome:'', ambiente:LIMPEZA_AMBIENTES[0], descricao:'', tempo_estimado:20, frequencia:'Semanal', prioridade:'Média', responsavel:familia[0]?.nome||'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <form onSubmit={e=>{e.preventDefault();onSave({...form,tempo_estimado:Number(form.tempo_estimado)});}} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Field label="Nome"><Input required value={form.nome} onChange={e=>set('nome',e.target.value)}/></Field>
      <Field label="Descrição"><TextArea value={form.descricao} onChange={e=>set('descricao',e.target.value)}/></Field>
      <div className="grid-2">
        <Field label="Ambiente"><Select value={form.ambiente} onChange={e=>set('ambiente',e.target.value)}>{LIMPEZA_AMBIENTES.map(a=><option key={a}>{a}</option>)}</Select></Field>
        <Field label="Frequência"><Select value={form.frequencia} onChange={e=>set('frequencia',e.target.value)}>{LIMPEZA_FREQ.map(f=><option key={f}>{f}</option>)}</Select></Field>
      </div>
      <div className="grid-3">
        <Field label="Prioridade"><Select value={form.prioridade} onChange={e=>set('prioridade',e.target.value)}>{LIMPEZA_PRIORIDADES.map(p=><option key={p}>{p}</option>)}</Select></Field>
        <Field label="Tempo (min)"><Input required type="number" min="1" value={form.tempo_estimado} onChange={e=>set('tempo_estimado',e.target.value)}/></Field>
        <Field label="Responsável"><Select value={form.responsavel} onChange={e=>set('responsavel',e.target.value)}><option value="">—</option>{familia.filter(m=>m.status!=='pendente').map(m=><option key={m.id} value={m.nome}>{m.nome}</option>)}</Select></Field>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={saving}>{saving?'Salvando...':'Salvar'}</Btn></div>
    </form>
  );
}

// ── VEÍCULOS ───────────────────────────────────────────────────────────────
export function VeiculosPage() {
  const { data:veiculos, setData, loading, error, reload } = useApiList(veiculosApi.list.bind(veiculosApi));
  const [selectedId, setSelectedId] = useState(null);
  const [modalVeiculo, setModalVeiculo] = useState(null);
  const [modalManut, setModalManut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  if (loading) return <LoadingScreen label="Carregando veículos..."/>;
  if (error) return <ErrorBanner message={error} onRetry={reload}/>;

  const veiculo = veiculos.find(v=>v.id===selectedId)||veiculos[0]||null;

  const saveVeiculo = async (payload) => {
    setSaving(true); setActionError('');
    try {
      if (modalVeiculo?.id) { const u=await veiculosApi.update(modalVeiculo.id,payload); setData(veiculos.map(v=>v.id===modalVeiculo.id?{...u,manutencoes:v.manutencoes}:v)); }
      else { const c=await veiculosApi.create(payload); setData([...veiculos,c]); setSelectedId(c.id); }
      setModalVeiculo(null);
    } catch(e){setActionError(e.message);} finally{setSaving(false);}
  };

  const removeVeiculo = async (id) => {
    try { await veiculosApi.remove(id); const rest=veiculos.filter(v=>v.id!==id); setData(rest); if(selectedId===id)setSelectedId(rest[0]?.id||null); } catch(e){setActionError(e.message);}
  };

  const addManutencao = async (payload) => {
    setSaving(true);
    try {
      const m = await veiculosApi.addManutencao(veiculo.id, payload);
      setData(veiculos.map(v=>v.id===veiculo.id?{...v,manutencoes:[m,...(v.manutencoes||[])],km:Math.max(v.km,payload.km)}:v));
      setModalManut(false);
    } catch(e){setActionError(e.message);} finally{setSaving(false);}
  };

  const removeManut = async (mid) => {
    try { await veiculosApi.removeManutencao(mid); setData(veiculos.map(v=>v.id===veiculo?.id?{...v,manutencoes:v.manutencoes.filter(m=>m.id!==mid)}:v)); } catch(e){setActionError(e.message);}
  };

  if (veiculos.length===0) return (
    <div className="fadein">
      <SectionHeader title="Gestão de veículos" action={<Btn icon={Plus} onClick={()=>setModalVeiculo({})}>Novo veículo</Btn>}/>
      <EmptyState icon={Car} title="Nenhum veículo cadastrado"/>
      {modalVeiculo!==null && <Modal title="Novo veículo" onClose={()=>setModalVeiculo(null)}><VeiculoForm veiculo={null} saving={saving} onSave={saveVeiculo} onClose={()=>setModalVeiculo(null)}/></Modal>}
    </div>
  );

  const totalGasto=(veiculo?.manutencoes||[]).reduce((s,m)=>s+Number(m.valor),0);
  const kmRest=veiculo?.proxima_troca_km?veiculo.proxima_troca_km-veiculo.km:null;
  const diasSeg=daysUntil(veiculo?.seguro_vencimento);
  const diasLic=daysUntil(veiculo?.licenciamento_vencimento);
  const gastosPorCat=VEICULO_CATEGORIAS.map(cat=>({ categoria:cat, valor:(veiculo?.manutencoes||[]).filter(m=>m.categoria===cat).reduce((s,m)=>s+Number(m.valor),0) })).filter(c=>c.valor>0).sort((a,b)=>b.valor-a.valor);

  const AlertRow=({icon:Icon,label,value,tone})=>{
    const c={red:'var(--sm-red)',amber:'var(--sm-amber)',green:'var(--sm-green)'}[tone];
    return <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, background:'var(--sm-bg)' }}><div style={{ color:c }}><Icon size={17}/></div><div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600 }}>{label}</div><div style={{ fontSize:12.5, color:'var(--sm-text-soft)' }}>{value}</div></div></div>;
  };

  return (
    <div className="fadein">
      <SectionHeader title="Gestão de veículos" action={<Btn icon={Plus} onClick={()=>setModalVeiculo({})}>Novo veículo</Btn>}/>
      {actionError && <ErrorBanner message={actionError}/>}
      <div className="scroll-x" style={{ display:'flex', gap:8, marginBottom:16, paddingBottom:4 }}>
        {veiculos.map(v=>(
          <button key={v.id} onClick={()=>setSelectedId(v.id)} style={{ padding:'10px 16px', borderRadius:12, fontSize:13.5, fontWeight:600, border:'1px solid var(--sm-border)', whiteSpace:'nowrap', background:(selectedId||veiculos[0]?.id)===v.id?'var(--sm-red)':'var(--sm-surface)', color:(selectedId||veiculos[0]?.id)===v.id?'#fff':'var(--sm-text)', display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
            <Car size={16}/> {v.marca} {v.modelo} <span style={{ opacity:.7 }}>· {v.placa}</span>
          </button>
        ))}
      </div>
      {veiculo && <>
        <Card style={{ marginBottom:16 }}>
          {veiculo.foto_path && (
            <img src={veiculo.foto_path.startsWith('http') ? veiculo.foto_path : `https://zzpzvjueortfmcyfygef.supabase.co/storage/v1/object/public/arquivos/${veiculo.foto_path}`} alt={`${veiculo.marca} ${veiculo.modelo}`} style={{ width:'100%', height:220, objectFit:'cover', borderRadius:8, marginBottom:16, border:'1px solid var(--sm-border)' }} />
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div><div style={{ fontSize:19, fontWeight:700, fontFamily:'Outfit' }}>{veiculo.marca} {veiculo.modelo} ({veiculo.ano})</div><div style={{ fontSize:13, color:'var(--sm-text-soft)', marginTop:4 }}>Placa {veiculo.placa} · {veiculo.cor||'—'} · {veiculo.km?.toLocaleString('pt-BR')} km</div></div>
            <div style={{ display:'flex', gap:6 }}><IconBtn icon={Edit2} onClick={()=>setModalVeiculo(veiculo)}/><IconBtn icon={Trash2} tone="red" onClick={()=>removeVeiculo(veiculo.id)}/></div>
          </div>
        </Card>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
          <Metric icon={Wrench} label="Gasto total" value={fmtMoney(totalGasto)}/>
          <Metric icon={Wrench} label="Próx. troca óleo" value={kmRest!==null?(kmRest>0?`${kmRest.toLocaleString('pt-BR')} km`:'Vencida'):'—'} tone={kmRest!==null&&kmRest<=1000?'amber':'neutral'}/>
          <Metric icon={Shield} label="Seguro" value={diasSeg!==null?(diasSeg<0?'Vencido':`${diasSeg}d`):'—'} tone={diasSeg!==null&&diasSeg<0?'red':diasSeg!==null&&diasSeg<=30?'amber':'green'}/>
          <Metric icon={FileText} label="Licenciamento" value={diasLic!==null?(diasLic<0?'Vencido':`${diasLic}d`):'—'} tone={diasLic!==null&&diasLic<0?'red':diasLic!==null&&diasLic<=30?'amber':'green'}/>
        </div>
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:10 }}>Alertas automáticos</div>
          {kmRest!==null && <AlertRow icon={Wrench} label="Troca de óleo" value={kmRest<=0?'Atrasada — agendar agora':`Faltam ${kmRest.toLocaleString('pt-BR')} km · ${fmtDate(veiculo.proxima_troca_data)}`} tone={kmRest<=1000?'amber':'green'}/>}
          {diasSeg!==null && <AlertRow icon={Shield} label={`Seguro (${veiculo.seguradora||'—'})`} value={diasSeg<0?`Vencido há ${Math.abs(diasSeg)} dias`:`Vence em ${diasSeg} dias (${fmtDate(veiculo.seguro_vencimento)})`} tone={diasSeg<0?'red':diasSeg<=30?'amber':'green'}/>}
          {diasLic!==null && <AlertRow icon={FileText} label="Licenciamento" value={diasLic<0?`Vencido há ${Math.abs(diasLic)} dias`:`Vence em ${diasLic} dias (${fmtDate(veiculo.licenciamento_vencimento)})`} tone={diasLic<0?'red':diasLic<=30?'amber':'green'}/>}
        </Card>
        {gastosPorCat.length>0 && (
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Gastos por categoria</div>
            {gastosPorCat.map(c=>(
              <div key={c.categoria} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span>{c.categoria}</span><span style={{ fontWeight:600 }}>{fmtMoney(c.valor)}</span></div>
                <ProgressBar value={c.valor} max={gastosPorCat[0].valor}/>
              </div>
            ))}
          </Card>
        )}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:600, fontSize:15 }}>Histórico de manutenções</div>
            <Btn icon={Plus} onClick={()=>setModalManut(true)}>Registrar</Btn>
          </div>
          {(veiculo.manutencoes||[]).length===0 ? <EmptyState icon={Wrench} title="Nenhuma manutenção registrada"/> : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {(veiculo.manutencoes||[]).map(m=>{
                const nfUrl = m.nota_fiscal_path ? (m.nota_fiscal_path.startsWith('http') ? m.nota_fiscal_path : `https://zzpzvjueortfmcyfygef.supabase.co/storage/v1/object/public/arquivos/${m.nota_fiscal_path}`) : '';
                return (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--sm-border)', flexWrap:'wrap' }}>
                    <div style={{ flex:'1 1 160px', minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{m.descricao}</div>
                      <div style={{ fontSize:12.5, color:'var(--sm-text-soft)' }}>{m.categoria} · {m.local||'—'} · {fmtDate(m.data)}</div>
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--sm-text-soft)' }}>{m.km?.toLocaleString('pt-BR')} km</div>
                    {m.nota_fiscal_path ? (
                      <a href={nfUrl} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', textDecoration:'none' }}>
                        <Badge tone="blue">NF Anexo</Badge>
                      </a>
                    ) : (
                      m.nota_fiscal && <Badge tone="neutral">NF</Badge>
                    )}
                    <div style={{ fontWeight:700, fontFamily:'Outfit' }}>{Number(m.valor)>0?fmtMoney(m.valor):'Grátis'}</div>
                    <IconBtn icon={Trash2} tone="red" onClick={()=>removeManut(m.id)}/>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </>}
      {modalVeiculo!==null && <Modal title={modalVeiculo.id?'Editar veículo':'Novo veículo'} onClose={()=>setModalVeiculo(null)}><VeiculoForm veiculo={modalVeiculo.id?modalVeiculo:null} saving={saving} onSave={saveVeiculo} onClose={()=>setModalVeiculo(null)}/></Modal>}
      {modalManut && veiculo && <Modal title="Registrar manutenção" onClose={()=>setModalManut(false)}><ManutForm veiculo={veiculo} saving={saving} onSave={addManutencao} onClose={()=>setModalManut(false)}/></Modal>}
    </div>
  );
}

function VeiculoForm({ veiculo, saving, onSave, onClose }) {
  const marcas=Object.keys(CAR_BRANDS);
  const [form,setForm]=useState(veiculo?{ marca:veiculo.marca,modelo:veiculo.modelo,ano:veiculo.ano,placa:veiculo.placa,cor:veiculo.cor||'',km:veiculo.km,proxima_troca_km:veiculo.proxima_troca_km||'',proxima_troca_data:veiculo.proxima_troca_data||'',seguro_vencimento:veiculo.seguro_vencimento||'',seguradora:veiculo.seguradora||'',licenciamento_vencimento:veiculo.licenciamento_vencimento||'',foto_path:veiculo.foto_path||'' }:{ marca:marcas[0],modelo:CAR_BRANDS[marcas[0]][0],ano:new Date().getFullYear(),placa:'',cor:'',km:0,proxima_troca_km:'',proxima_troca_data:'',seguro_vencimento:'',seguradora:'',licenciamento_vencimento:'',foto_path:'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const modelos=CAR_BRANDS[form.marca]||['Outro modelo'];
  return (
    <form onSubmit={e=>{e.preventDefault();onSave({...form,ano:Number(form.ano),km:Number(form.km),proxima_troca_km:form.proxima_troca_km?Number(form.proxima_troca_km):null,proxima_troca_data:form.proxima_troca_data||null,seguro_vencimento:form.seguro_vencimento||null,licenciamento_vencimento:form.licenciamento_vencimento||null});}} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="grid-2">
        <Field label="Marca"><SelectWithCustom placeholder="Digite a marca..." options={marcas} value={form.marca} onChange={val=>{ setForm(f => ({ ...f, marca: val, modelo: CAR_BRANDS[val] ? CAR_BRANDS[val][0] : '' })); }} /></Field>
        <Field label="Modelo"><SelectWithCustom placeholder="Digite o modelo..." options={modelos} value={form.modelo} onChange={val=>set('modelo',val)} /></Field>
      </div>
      <div className="grid-3">
        <Field label="Ano"><Input required type="number" value={form.ano} onChange={e=>set('ano',e.target.value)}/></Field>
        <Field label="Placa"><Input required value={form.placa} onChange={e=>set('placa',e.target.value.toUpperCase())}/></Field>
        <Field label="Cor"><Input value={form.cor} onChange={e=>set('cor',e.target.value)}/></Field>
      </div>
      <Field label="Quilometragem atual"><Input required type="number" min="0" value={form.km} onChange={e=>set('km',e.target.value)}/></Field>
      <div className="grid-2">
        <Field label="Próx. troca (km)"><Input type="number" min="0" value={form.proxima_troca_km} onChange={e=>set('proxima_troca_km',e.target.value)}/></Field>
        <Field label="Próx. troca (data)"><Input type="date" value={form.proxima_troca_data} onChange={e=>set('proxima_troca_data',e.target.value)}/></Field>
      </div>
      <div className="grid-2">
        <Field label="Seguradora"><Input value={form.seguradora} onChange={e=>set('seguradora',e.target.value)}/></Field>
        <Field label="Venc. seguro"><Input type="date" value={form.seguro_vencimento} onChange={e=>set('seguro_vencimento',e.target.value)}/></Field>
      </div>
      <Field label="Venc. licenciamento"><Input type="date" value={form.licenciamento_vencimento} onChange={e=>set('licenciamento_vencimento',e.target.value)}/></Field>
      <FileUploader folder="veiculos" value={form.foto_path} onUploadComplete={({ path }) => set('foto_path', path)} onRemove={() => set('foto_path', '')} label="Foto do veículo (imagem)" accept="image/*" />
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={saving}>{saving?'Salvando...':'Salvar'}</Btn></div>
    </form>
  );
}

function ManutForm({ veiculo, saving, onSave, onClose }) {
  const [form,setForm]=useState({ data:todayStr(),categoria:VEICULO_CATEGORIAS[0],descricao:'',local:'',valor:'',km:veiculo.km,nota_fiscal:false,nota_fiscal_path:'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <form onSubmit={e=>{e.preventDefault();onSave({...form,valor:Number(form.valor)||0,km:Number(form.km)});}} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="grid-2">
        <Field label="Data"><Input required type="date" value={form.data} onChange={e=>set('data',e.target.value)}/></Field>
        <Field label="Categoria"><SelectWithCustom options={VEICULO_CATEGORIAS} value={form.categoria} onChange={val => set('categoria', val)} /></Field>
      </div>
      <Field label="Descrição"><Input required value={form.descricao} onChange={e=>set('descricao',e.target.value)} placeholder="Ex: Troca de óleo"/></Field>
      <div className="grid-2">
        <Field label="Oficina / local"><Input value={form.local} onChange={e=>set('local',e.target.value)}/></Field>
        <Field label="Valor (R$)"><Input type="number" step="0.01" min="0" value={form.valor} onChange={e=>set('valor',e.target.value)}/></Field>
      </div>
      <Field label="Quilometragem"><Input required type="number" min="0" value={form.km} onChange={e=>set('km',e.target.value)}/></Field>
      <FileUploader folder="manutencoes" value={form.nota_fiscal_path} onUploadComplete={({ path }) => setForm(f => ({ ...f, nota_fiscal_path: path, nota_fiscal: true }))} onRemove={() => setForm(f => ({ ...f, nota_fiscal_path: '', nota_fiscal: false }))} label="Nota fiscal (anexo de recibo)" />
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={saving}>{saving?'Salvando...':'Registrar'}</Btn></div>
    </form>
  );
}

// ── DOCUMENTOS ─────────────────────────────────────────────────────────────
export function DocumentosPage() {
  const { data:documentos, loading, error, reload, saving, actionError, save, remove } = useCRUD(documentosApi);
  const { familia } = useFamilia();
  const [modal, setModal] = useState(null);
  const [filtroCat, setFiltroCat] = useState('todas');
  const [busca, setBusca] = useState('');

  if (loading) return <LoadingScreen label="Carregando documentos..."/>;
  if (error) return <ErrorBanner message={error} onRetry={reload}/>;

  const lista = [...documentos].filter(d=>{
    if (busca){ const q=busca.toLowerCase(); if(!d.nome.toLowerCase().includes(q)&&!(d.descricao||'').toLowerCase().includes(q)&&!(d.tags||[]).some(t=>t.toLowerCase().includes(q))) return false; }
    return filtroCat==='todas'||d.categoria===filtroCat;
  }).sort((a,b)=>{ const da=daysUntil(a.vencimento),db=daysUntil(b.vencimento); if(da===null&&db===null)return 0; if(da===null)return 1; if(db===null)return -1; return da-db; });

  const vencendo=documentos.filter(d=>{const dd=daysUntil(d.vencimento);return dd!==null&&dd<=30;});
  const handleSave = async (payload) => { if (await save(payload, modal?.id)) setModal(null); };

  return (
    <div className="fadein">
      <SectionHeader title="Documentos da casa" subtitle="Escrituras, contratos, garantias e comprovantes." action={<Btn icon={Plus} onClick={()=>setModal({})}>Novo documento</Btn>}/>
      {actionError && <ErrorBanner message={actionError}/>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
        <Metric icon={FileText} label="Documentos" value={documentos.length}/>
        <Metric icon={AlertTriangle} label="Vencendo em 30 dias" value={vencendo.length} tone={vencendo.length?'amber':'green'}/>
        <Metric icon={AlertTriangle} label="Vencidos" value={vencendo.filter(d=>daysUntil(d.vencimento)<0).length} tone={vencendo.filter(d=>daysUntil(d.vencimento)<0).length?'red':'green'}/>
        <Metric icon={Shield} label="Segurança RLS" value="Ativa" tone="green"/>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 200px' }}><Search size={16} style={{ position:'absolute', left:12, top:12, color:'var(--sm-text-faint)' }}/><Input placeholder="Buscar por nome, descrição ou tag..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ paddingLeft:36 }}/></div>
        <Select value={filtroCat} onChange={e=>setFiltroCat(e.target.value)} style={{ width:'auto' }}><option value="todas">Todas categorias</option>{DOC_CATEGORIAS.map(c=><option key={c}>{c}</option>)}</Select>
      </div>
      {lista.length===0 ? <EmptyState icon={FileText} title="Nenhum documento encontrado"/> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {lista.map(d=>{
            const dd=daysUntil(d.vencimento);
            const fileUrl = d.arquivo_path ? (d.arquivo_path.startsWith('http') ? d.arquivo_path : `https://zzpzvjueortfmcyfygef.supabase.co/storage/v1/object/public/arquivos/${d.arquivo_path}`) : '';
            return (
              <Card key={d.id} style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'var(--sm-red-light)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--sm-red)', flexShrink:0 }}><FileText size={19}/></div>
                <div style={{ flex:'1 1 200px', minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14.5 }}>{d.nome}</div>
                  <div style={{ fontSize:12.5, color:'var(--sm-text-soft)', marginTop:2 }}>{d.descricao||'—'} · {d.responsavel||'—'}</div>
                  {(d.tags||[]).length>0 && <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>{(d.tags||[]).map(t=><span key={t} style={{ fontSize:11, padding:'2px 8px', borderRadius:999, background:'var(--sm-bg)', color:'var(--sm-text-soft)', border:'1px solid var(--sm-border)' }}>#{t}</span>)}</div>}
                </div>
                <Badge tone="neutral">{d.categoria}</Badge>
                <div style={{ textAlign:'right', minWidth:100 }}>
                  <div style={{ fontSize:12, color:'var(--sm-text-soft)' }}>emitido {fmtDate(d.emissao)}</div>
                  {d.vencimento && <Badge tone={dd<0?'red':dd<=30?'amber':'neutral'}>{dd<0?'vencido':`vence ${fmtDate(d.vencimento)}`}</Badge>}
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  {d.arquivo_path && (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'1px solid var(--sm-border)', background:'var(--sm-bg)', color:'var(--sm-text)', fontSize:12.5, fontWeight:600, textDecoration:'none', marginRight:8 }}>
                      <Download size={14}/> Anexo
                    </a>
                  )}
                  <IconBtn icon={Edit2} onClick={()=>setModal(d)}/>
                  <IconBtn icon={Trash2} tone="red" onClick={()=>remove(d.id)}/>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {modal!==null && <Modal title={modal.id?'Editar documento':'Novo documento'} onClose={()=>setModal(null)}><DocForm doc={modal.id?modal:null} familia={familia} saving={saving} onSave={handleSave} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );
}

function DocForm({ doc, familia, saving, onSave, onClose }) {
  const [form,setForm]=useState(doc?{ nome:doc.nome,categoria:doc.categoria,descricao:doc.descricao||'',emissao:doc.emissao||'',vencimento:doc.vencimento||'',responsavel:doc.responsavel||'',tagsStr:(doc.tags||[]).join(', '),arquivo_path:doc.arquivo_path||'' }:{ nome:'',categoria:DOC_CATEGORIAS[0],descricao:'',emissao:todayStr(),vencimento:'',responsavel:familia[0]?.nome||'',tagsStr:'',arquivo_path:'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <form onSubmit={e=>{e.preventDefault();const{tagsStr,...rest}=form;onSave({...rest,vencimento:form.vencimento||null,emissao:form.emissao||null,tags:tagsStr.split(',').map(t=>t.trim()).filter(Boolean)});}} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Field label="Nome"><Input required value={form.nome} onChange={e=>set('nome',e.target.value)}/></Field>
      <Field label="Categoria"><SelectWithCustom options={DOC_CATEGORIAS} value={form.categoria} onChange={val => set('categoria', val)} /></Field>
      <Field label="Descrição"><TextArea value={form.descricao} onChange={e=>set('descricao',e.target.value)}/></Field>
      <div className="grid-2">
        <Field label="Data de emissão"><Input type="date" value={form.emissao} onChange={e=>set('emissao',e.target.value)}/></Field>
        <Field label="Vencimento (opcional)"><Input type="date" value={form.vencimento} onChange={e=>set('vencimento',e.target.value)}/></Field>
      </div>
      <Field label="Responsável"><Select value={form.responsavel} onChange={e=>set('responsavel',e.target.value)}><option value="">—</option>{familia.filter(m=>m.status!=='pendente').map(m=><option key={m.id} value={m.nome}>{m.nome}</option>)}</Select></Field>
      <Field label="Tags (separadas por vírgula)"><Input value={form.tagsStr} onChange={e=>set('tagsStr',e.target.value)} placeholder="Ex: imóvel, importante"/></Field>
      <FileUploader folder="documentos" value={form.arquivo_path} onUploadComplete={({ path }) => set('arquivo_path', path)} onRemove={() => set('arquivo_path', '')} label="Documento (PDF, Imagem, etc.)" />
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={saving}>{saving?'Salvando...':'Salvar'}</Btn></div>
    </form>
  );
}

// ── PATRIMÔNIO ─────────────────────────────────────────────────────────────
export function PatrimonioPage() {
  const { data:patrimonio, loading, error, reload, saving, actionError, save, remove } = useCRUD(patrimonioApi);
  const [modal, setModal] = useState(null);
  const [filtroCat, setFiltroCat] = useState('todas');
  const [busca, setBusca] = useState('');

  if (loading) return <LoadingScreen label="Carregando patrimônio..."/>;
  if (error) return <ErrorBanner message={error} onRetry={reload}/>;

  const lista = patrimonio.filter(b=>{
    if (busca&&!b.nome.toLowerCase().includes(busca.toLowerCase())&&!(b.marca||'').toLowerCase().includes(busca.toLowerCase())) return false;
    return filtroCat==='todas'||b.categoria===filtroCat;
  });

  const valorTotal=patrimonio.reduce((s,b)=>s+Number(b.valor),0);
  const garantiasAtivas=patrimonio.filter(b=>daysUntil(b.garantia_fim)>=0);
  const garantiasVencendo=garantiasAtivas.filter(b=>daysUntil(b.garantia_fim)<=30);
  const porCat=BEM_CATEGORIAS.map(cat=>({ categoria:cat, valor:patrimonio.filter(b=>b.categoria===cat).reduce((s,b)=>s+Number(b.valor),0) })).filter(c=>c.valor>0).sort((a,b)=>b.valor-a.valor);

  const handleSave = async (payload) => { if (await save(payload, modal?.id)) setModal(null); };

  const exportar = () => downloadCSV(patrimonio.map(b=>({ Nome:b.nome,Marca:b.marca||'',Modelo:b.modelo||'',Categoria:b.categoria,'Data Compra':b.data_compra||'',Valor:b.valor,Loja:b.loja||'','Garantia Fim':b.garantia_fim||'' })), 'inventario_patrimonio.csv');

  return (
    <div className="fadein">
      <SectionHeader title="Garantias e patrimônio" subtitle="Inventário familiar com garantias e valores."
        action={<div style={{ display:'flex', gap:8 }}><Btn variant="secondary" icon={Download} onClick={exportar}>Exportar CSV</Btn><Btn icon={Plus} onClick={()=>setModal({})}>Novo bem</Btn></div>}/>
      {actionError && <ErrorBanner message={actionError}/>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:16 }}>
        <Metric icon={Award} label="Valor total" value={fmtMoney(valorTotal)}/>
        <Metric icon={Shield} label="Garantias ativas" value={garantiasAtivas.length} tone="green"/>
        <Metric icon={AlertTriangle} label="Vencendo em 30 dias" value={garantiasVencendo.length} tone={garantiasVencendo.length?'amber':'green'}/>
        <Metric icon={Clock} label="Total de bens" value={patrimonio.length}/>
      </div>
      {porCat.length>0 && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Valor por categoria</div>
          {porCat.map(c=>(
            <div key={c.categoria} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span>{c.categoria}</span><span style={{ fontWeight:600 }}>{fmtMoney(c.valor)}</span></div>
              <ProgressBar value={c.valor} max={porCat[0].valor}/>
            </div>
          ))}
        </Card>
      )}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 200px' }}><Search size={16} style={{ position:'absolute', left:12, top:12, color:'var(--sm-text-faint)' }}/><Input placeholder="Buscar bem..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ paddingLeft:36 }}/></div>
        <Select value={filtroCat} onChange={e=>setFiltroCat(e.target.value)} style={{ width:'auto' }}><option value="todas">Todas categorias</option>{BEM_CATEGORIAS.map(c=><option key={c}>{c}</option>)}</Select>
      </div>
      {lista.length===0 ? <EmptyState icon={Award} title="Nenhum bem cadastrado"/> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
          {lista.map(b=>{
            const dG=daysUntil(b.garantia_fim);
            return (
              <Card key={b.id}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div><div style={{ fontWeight:600, fontSize:14.5 }}>{b.nome}</div><div style={{ fontSize:12.5, color:'var(--sm-text-soft)' }}>{b.marca||''} {b.modelo||''} · {b.categoria}</div></div>
                  <div style={{ display:'flex', gap:4 }}><IconBtn icon={Edit2} onClick={()=>setModal(b)}/><IconBtn icon={Trash2} tone="red" onClick={()=>remove(b.id)}/></div>
                </div>
                {b.foto_path && (
                  <img src={b.foto_path.startsWith('http') ? b.foto_path : `https://zzpzvjueortfmcyfygef.supabase.co/storage/v1/object/public/arquivos/${b.foto_path}`} alt={b.nome} style={{ width:'100%', height:140, objectFit:'cover', borderRadius:8, marginBottom:10, border:'1px solid var(--sm-border)' }} />
                )}
                <div style={{ fontSize:12.5, color:'var(--sm-text-soft)', marginBottom:8 }}>{b.data_compra?`Comprado em ${fmtDate(b.data_compra)}`:''}{b.loja?` · ${b.loja}`:''}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:700, fontFamily:'Outfit', fontSize:16 }}>{fmtMoney(b.valor)}</span>
                  {b.garantia_fim && <Badge tone={dG<0?'red':dG<=30?'amber':'green'}>{dG<0?'garantia expirada':`garantia até ${fmtDate(b.garantia_fim)}`}</Badge>}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, flexWrap:'wrap', gap:8 }}>
                  {b.garantia_empresa && <div style={{ fontSize:12, color:'var(--sm-text-soft)' }}><Phone size={12} style={{ verticalAlign:-1, marginRight:4 }}/>{b.garantia_empresa} · {b.garantia_contato||'—'}</div>}
                  {b.nota_fiscal_path && (
                    <a href={b.nota_fiscal_path.startsWith('http') ? b.nota_fiscal_path : `https://zzpzvjueortfmcyfygef.supabase.co/storage/v1/object/public/arquivos/${b.nota_fiscal_path}`} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12.5, color:'var(--sm-red)', textDecoration:'none', fontWeight:600 }}>
                      <FileText size={13}/> Nota Fiscal
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {modal!==null && <Modal title={modal.id?'Editar bem':'Novo bem'} onClose={()=>setModal(null)} width={560}><BemForm bem={modal.id?modal:null} saving={saving} onSave={handleSave} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );
}

function BemForm({ bem, saving, onSave, onClose }) {
  const [form,setForm]=useState(bem?{ nome:bem.nome,marca:bem.marca||'',modelo:bem.modelo||'',numero_serie:bem.numero_serie||'',data_compra:bem.data_compra||'',valor:bem.valor,loja:bem.loja||'',categoria:bem.categoria,garantia_inicio:bem.garantia_inicio||'',garantia_fim:bem.garantia_fim||'',garantia_empresa:bem.garantia_empresa||'',garantia_contato:bem.garantia_contato||'',foto_path:bem.foto_path||'',nota_fiscal_path:bem.nota_fiscal_path||'' }:{ nome:'',marca:'',modelo:'',numero_serie:'',data_compra:todayStr(),valor:'',loja:'',categoria:BEM_CATEGORIAS[0],garantia_inicio:todayStr(),garantia_fim:addDays(365),garantia_empresa:'',garantia_contato:'',foto_path:'',nota_fiscal_path:'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <form onSubmit={e=>{e.preventDefault();onSave({...form,valor:Number(form.valor)||0,data_compra:form.data_compra||null,garantia_inicio:form.garantia_inicio||null,garantia_fim:form.garantia_fim||null});}} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="grid-2-1">
        <Field label="Nome"><Input required value={form.nome} onChange={e=>set('nome',e.target.value)}/></Field>
        <Field label="Categoria"><SelectWithCustom options={BEM_CATEGORIAS} value={form.categoria} onChange={val => set('categoria', val)} /></Field>
      </div>
      <div className="grid-3">
        <Field label="Marca"><Input value={form.marca} onChange={e=>set('marca',e.target.value)}/></Field>
        <Field label="Modelo"><Input value={form.modelo} onChange={e=>set('modelo',e.target.value)}/></Field>
        <Field label="Nº série"><Input value={form.numero_serie} onChange={e=>set('numero_serie',e.target.value)}/></Field>
      </div>
      <div className="grid-3">
        <Field label="Data da compra"><Input type="date" value={form.data_compra} onChange={e=>set('data_compra',e.target.value)}/></Field>
        <Field label="Valor (R$)"><Input required type="number" step="0.01" min="0" value={form.valor} onChange={e=>set('valor',e.target.value)}/></Field>
        <Field label="Loja"><Input value={form.loja} onChange={e=>set('loja',e.target.value)}/></Field>
      </div>
      <div style={{ borderTop:'1px solid var(--sm-border)', paddingTop:12 }}><div style={{ fontWeight:600, fontSize:13.5, marginBottom:10 }}>Garantia</div>
        <div className="grid-2" style={{ marginBottom:12 }}>
          <Field label="Início"><Input type="date" value={form.garantia_inicio} onChange={e=>set('garantia_inicio',e.target.value)}/></Field>
          <Field label="Fim"><Input type="date" value={form.garantia_fim} onChange={e=>set('garantia_fim',e.target.value)}/></Field>
        </div>
        <div className="grid-2">
          <Field label="Empresa"><Input value={form.garantia_empresa} onChange={e=>set('garantia_empresa',e.target.value)}/></Field>
          <Field label="Contato"><Input value={form.garantia_contato} onChange={e=>set('garantia_contato',e.target.value)} placeholder="0800..."/></Field>
        </div>
      </div>
      <div className="grid-2" style={{ borderTop:'1px solid var(--sm-border)', paddingTop:12 }}>
        <FileUploader folder="patrimonio" value={form.foto_path} onUploadComplete={({ path }) => set('foto_path', path)} onRemove={() => set('foto_path', '')} label="Foto do bem (imagem)" accept="image/*" />
        <FileUploader folder="patrimonio" value={form.nota_fiscal_path} onUploadComplete={({ path }) => set('nota_fiscal_path', path)} onRemove={() => set('nota_fiscal_path', '')} label="Nota fiscal (imagem, PDF, etc.)" />
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={saving}>{saving?'Salvando...':'Salvar'}</Btn></div>
    </form>
  );
}

// ── FAMÍLIA ────────────────────────────────────────────────────────────────
export function FamiliaPage() {
  const { familia, setFamilia } = useFamilia();
  const { profile } = useAuth();
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);
  const PERM_TONE = { Administrador:'red', Morador:'blue', Colaborador:'neutral' };

  const inviteLink = profile?.household_id 
    ? `${window.location.origin}/cadastro?convite=${profile.household_id}` 
    : '';

  const handleCopyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const save = async (payload) => {
    setSaving(true); setActionError('');
    try {
      if (modal?.id) {
        const { email, password, ...rest } = payload;
        const u=await authApi.updateMember(modal.id, rest);
        setFamilia(familia.map(m=>m.id===modal.id?u:m));
      } else {
        const c=await authApi.createMember(payload);
        setFamilia([...familia,c]);
      }
      setModal(null);
    } catch(e){setActionError(e.message);} finally{setSaving(false);}
  };
  const remove = async (id) => {
    try { await authApi.deleteMember(id); setFamilia(familia.filter(m=>m.id!==id)); } catch(e){setActionError(e.message);}
  };

  const approve = async (id) => {
    setActionError('');
    try {
      const u = await authApi.updateMember(id, { status: 'aprovado' });
      setFamilia(familia.map(m => m.id === id ? u : m));
    } catch(e) {
      setActionError(e.message);
    }
  };

  const reject = async (id) => {
    setActionError('');
    try {
      await authApi.deleteMember(id);
      setFamilia(familia.filter(m => m.id !== id));
    } catch(e) {
      setActionError(e.message);
    }
  };

  const ativos = familia.filter(m => m.status !== 'pendente');
  const pendentes = familia.filter(m => m.status === 'pendente');

  return (
    <div className="fadein">
      <SectionHeader 
        title="Central da família" 
        subtitle="Moradores, colaboradores e permissões de acesso." 
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {inviteLink && (
              <Btn variant="secondary" icon={LinkIcon} onClick={handleCopyInvite}>
                {copied ? 'Copiado!' : 'Copiar Convite'}
              </Btn>
            )}
            <Btn icon={Plus} onClick={()=>setModal({})}>Novo membro</Btn>
          </div>
        }
      />
      {actionError && <ErrorBanner message={actionError}/>}

      {pendentes.length > 0 && (
        <div style={{ marginBottom: 28, background: 'var(--sm-red-light)', border: '1px solid var(--sm-border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
          <h3 style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--sm-red)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px' }}>
            <Clock size={18} /> Solicitações de entrada pendentes ({pendentes.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {pendentes.map(m => (
              <Card key={m.id} style={{ background: 'var(--sm-surface)', border: '1px solid var(--sm-border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 12 }}><Avatar name={m.nome} url={m.avatar_url} size={44}/><div><div style={{ fontWeight:600, fontSize:15 }}>{m.nome}</div><div style={{ fontSize:12.5, color:'var(--sm-text-soft)' }}>{m.funcao||'—'}</div></div></div>
                </div>
                <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6, fontSize:13 }}>
                  {m.telefone && <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--sm-text-soft)' }}><Phone size={14}/>{m.telefone}</div>}
                  {m.id && <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--sm-text-soft)' }}><Mail size={14}/>{m.id}</div>}
                </div>
                <div style={{ marginTop:14, display:'flex', gap:10 }}>
                  <Btn style={{ flex: 1 }} onClick={() => approve(m.id)}>Aprovar</Btn>
                  <Btn style={{ flex: 1 }} variant="secondary" onClick={() => reject(m.id)}>Recusar</Btn>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
        <Metric icon={Users} label="Total" value={ativos.length}/>
        <Metric icon={Shield} label="Administradores" value={ativos.filter(m=>m.permissao==='Administrador').length} tone="red"/>
        <Metric icon={Users} label="Moradores" value={ativos.filter(m=>m.permissao==='Morador').length} tone="blue"/>
        <Metric icon={Users} label="Colaboradores" value={ativos.filter(m=>m.permissao==='Colaborador').length}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
        {ativos.map(m=>(
          <Card key={m.id}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
              <div style={{ display:'flex', gap:12 }}><Avatar name={m.nome} url={m.avatar_url} size={44}/><div><div style={{ fontWeight:600, fontSize:15 }}>{m.nome}</div><div style={{ fontSize:12.5, color:'var(--sm-text-soft)' }}>{m.funcao||'—'}</div></div></div>
              <div style={{ display:'flex', gap:4 }}><IconBtn icon={Edit2} onClick={()=>setModal(m)}/><IconBtn icon={Trash2} tone="red" onClick={()=>remove(m.id)}/></div>
            </div>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6, fontSize:13 }}>
              {m.telefone && <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--sm-text-soft)' }}><Phone size={14}/>{m.telefone}</div>}
              {m.id && <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--sm-text-soft)' }}><Mail size={14}/>{m.id}</div>}
            </div>
            <div style={{ marginTop:10 }}><Badge tone={PERM_TONE[m.permissao]}>{m.permissao}</Badge></div>
          </Card>
        ))}
      </div>
      {modal!==null && <Modal title={modal.id?'Editar membro':'Convidar membro'} onClose={()=>setModal(null)}><MembroForm membro={modal.id?modal:null} saving={saving} onSave={save} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );
}
const ALL_MODULES = [
  { id: 'contas', label: 'Contas' },
  { id: 'compras', label: 'Compras' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'limpeza', label: 'Limpeza' },
  { id: 'veiculos', label: 'Veículos' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'patrimonio', label: 'Patrimônio' },
  { id: 'familia', label: 'Família' },
  { id: 'relatorios', label: 'Relatórios' }
];

const getDefaultModulesForRole = (role) => {
  if (role === 'Administrador') {
    return 'contas,compras,estoque,limpeza,veiculos,documentos,patrimonio,familia,relatorios';
  }
  if (role === 'Morador') {
    return 'contas,compras,estoque,limpeza,veiculos,documentos,patrimonio';
  }
  if (role === 'Colaborador') {
    return 'compras,estoque,limpeza';
  }
  return '';
};

function MembroForm({ membro, saving, onSave, onClose }) {
  const [form, setForm] = useState(membro ? {
    nome: membro.nome,
    telefone: membro.telefone || '',
    email: '',
    funcao: membro.funcao || '',
    permissao: membro.permissao,
    avatar_url: membro.avatar_url || '',
    modulos: membro.modulos !== undefined && membro.modulos !== null ? membro.modulos : getDefaultModulesForRole(membro.permissao)
  } : {
    nome: '',
    telefone: '',
    email: '',
    funcao: '',
    permissao: 'Morador',
    password: '',
    avatar_url: '',
    modulos: getDefaultModulesForRole('Morador')
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleRoleChange = (newRole) => {
    setForm(f => ({
      ...f,
      permissao: newRole,
      modulos: getDefaultModulesForRole(newRole)
    }));
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Nome completo"><Input required value={form.nome} onChange={e => set('nome', e.target.value)} /></Field>
      <div className="grid-2">
        <Field label="Telefone"><Input value={form.telefone} onChange={e => set('telefone', e.target.value)} /></Field>
        {!membro && <Field label="E-mail"><Input type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></Field>}
      </div>
      {!membro && <Field label="Senha"><Input type="password" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" /></Field>}
      <Field label="Função na casa"><Input value={form.funcao} onChange={e => set('funcao', e.target.value)} placeholder="Ex: Mãe / Gestão da casa" /></Field>
      <Field label="Permissão"><Select value={form.permissao} onChange={e => handleRoleChange(e.target.value)}>{PERMISSOES.map(p => <option key={p}>{p}</option>)}</Select></Field>
      
      <Field label="Módulos autorizados (Acesso personalizado)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, background: 'var(--sm-bg)', border: '1px solid var(--sm-border)', borderRadius: 'var(--radius-md)', padding: 12, marginTop: 4 }}>
          {ALL_MODULES.map(m => {
            const isChecked = (form.modulos || '').split(',').includes(m.id);
            return (
              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 550, color: 'var(--sm-text)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={e => {
                    const currentList = (form.modulos || '').split(',').filter(x => x);
                    let newList;
                    if (e.target.checked) {
                      newList = [...currentList, m.id];
                    } else {
                      newList = currentList.filter(x => x !== m.id);
                    }
                    set('modulos', newList.join(','));
                  }}
                  style={{
                    width: 15,
                    height: 15,
                    accentColor: 'var(--sm-red)',
                    cursor: 'pointer'
                  }}
                />
                {m.label}
              </label>
            );
          })}
        </div>
      </Field>

      <FileUploader folder="avatars" value={form.avatar_url} onUploadComplete={({ path }) => set('avatar_url', path)} onRemove={() => set('avatar_url', '')} label="Foto de perfil (imagem)" accept="image/*" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn></div>
    </form>
  );
}
// ── RELATÓRIOS ─────────────────────────────────────────────────────────────
export function RelatoriosPage() {
  const [rel, setRel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => { setLoading(true); setError(''); try { setRel(await dashboardApi.relatorios()); } catch(e){setError(e.message);} finally{setLoading(false);} };
  React.useEffect(()=>{load();},[]);

  if (loading) return <LoadingScreen label="Carregando relatórios..."/>;
  if (error) return <ErrorBanner message={error} onRetry={load}/>;
  if (!rel) return null;

  const fmtV = v => `R$${Number(v).toFixed(0)}`;

  return (
    <div className="fadein">
      <SectionHeader title="Relatórios e indicadores" subtitle="Visão consolidada de gastos, consumo e patrimônio."/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:16 }}>
        <Metric icon={DollarSign} label="Gastos com contas" value={fmtMoney(rel.totais.contas)}/>
        <Metric icon={Wrench} label="Gastos com veículos" value={fmtMoney(rel.totais.veiculos)} tone="blue"/>
        <Metric icon={Award} label="Patrimônio total" value={fmtMoney(rel.totais.patrimonio)} tone="green"/>
        <Metric icon={Package} label="Valor em estoque" value={fmtMoney(rel.totais.estoque)} tone="amber"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
        <Metric icon={CheckCircle2} label="Contas pagas" value={rel.contas_pagas} tone="green"/>
        <Metric icon={Clock} label="Contas pendentes" value={rel.contas_pendentes} tone="amber"/>
        <Metric icon={CheckCircle2} label="Tarefas concluídas" value={rel.tarefas_concluidas} tone="green"/>
        <Metric icon={AlertTriangle} label="Tarefas pendentes" value={rel.tarefas_pendentes} tone="amber"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:16 }}>
        {rel.gastos_por_categoria_contas.length>0 && (
          <Card>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Gastos por categoria — Contas</div>
            <div style={{ width:'100%', height:240 }}>
              <ResponsiveContainer><BarChart data={rel.gastos_por_categoria_contas} layout="vertical" margin={{ left:10, right:10 }}>
                <XAxis type="number" tick={{ fontSize:11 }} tickFormatter={fmtV}/><YAxis type="category" dataKey="name" width={90} tick={{ fontSize:11 }}/>
                <Tooltip formatter={v=>fmtMoney(v)} contentStyle={{ fontSize:12, borderRadius:8 }}/><Bar dataKey="valor" fill="#D32F2F" radius={[0,4,4,0]}/>
              </BarChart></ResponsiveContainer>
            </div>
          </Card>
        )}
        {rel.valor_patrimonio_por_categoria.length>0 && (
          <Card>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Patrimônio por categoria</div>
            <div style={{ width:'100%', height:240 }}>
              <ResponsiveContainer><PieChart>
                <Pie data={rel.valor_patrimonio_por_categoria} dataKey="valor" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({name})=>name}>
                  {rel.valor_patrimonio_por_categoria.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie><Tooltip formatter={v=>fmtMoney(v)} contentStyle={{ fontSize:12, borderRadius:8 }}/>
              </PieChart></ResponsiveContainer>
            </div>
          </Card>
        )}
        {rel.gastos_por_veiculo.length>0 && (
          <Card>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Gastos por veículo</div>
            <div style={{ width:'100%', height:240 }}>
              <ResponsiveContainer><BarChart data={rel.gastos_por_veiculo}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sm-border)"/><XAxis dataKey="name" tick={{ fontSize:11 }}/><YAxis tick={{ fontSize:11 }} tickFormatter={fmtV}/>
                <Tooltip formatter={v=>fmtMoney(v)} contentStyle={{ fontSize:12, borderRadius:8 }}/><Bar dataKey="valor" fill="#1565C0" radius={[4,4,0,0]}/>
              </BarChart></ResponsiveContainer>
            </div>
          </Card>
        )}
        {rel.tempo_por_ambiente.length>0 && (
          <Card>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Tempo gasto por ambiente (limpeza)</div>
            <div style={{ width:'100%', height:240 }}>
              <ResponsiveContainer><BarChart data={rel.tempo_por_ambiente}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sm-border)"/><XAxis dataKey="name" tick={{ fontSize:11 }}/><YAxis tick={{ fontSize:11 }} tickFormatter={v=>`${v}min`}/>
                <Tooltip formatter={v=>`${v} min`} contentStyle={{ fontSize:12, borderRadius:8 }}/><Bar dataKey="valor" fill="#2E7D32" radius={[4,4,0,0]}/>
              </BarChart></ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
