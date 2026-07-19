import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, RefreshCw, Target, DollarSign, Wallet } from 'lucide-react';
import { Card, SectionHeader, Btn, Input, Select, Field, Modal, EmptyState, ProgressBar, ErrorBanner } from '../components/ui';
import { fmtMoney, fmtDate } from '../lib/constants';

const INVESTIMENTO_TIPOS = ['Ação', 'FII', 'CDB / Renda Fixa', 'Criptomoeda', 'Fundo de Investimento', 'Stocks (Exterior)', 'ETF', 'Outros'];
const MOEDAS = ['BRL', 'USD', 'EUR', 'BTC', 'ETH'];

function InvestimentoForm({ item, saving, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : {
    nome: '',
    tipo: 'CDB / Renda Fixa',
    moeda: 'BRL',
    corretora: '',
    valor_investido: '',
    valor_atual: '',
    is_caixinha: false,
    meta_alvo: '',
    data_limite: '',
    visibilidade: 'Geral'
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSave({
        ...form,
        valor_investido: Number(form.valor_investido),
        valor_atual: Number(form.valor_atual),
        meta_alvo: form.is_caixinha ? Number(form.meta_alvo) : null
      });
    }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      
      <div style={{ display: 'flex', gap: 10, background: 'var(--sm-surface)', padding: 10, borderRadius: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
          <input type="radio" name="tipo_reg" checked={!form.is_caixinha} onChange={() => set('is_caixinha', false)} />
          Investimento Padrão
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
          <input type="radio" name="tipo_reg" checked={form.is_caixinha} onChange={() => set('is_caixinha', true)} />
          Caixinha (Meta)
        </label>
      </div>

      <Field label={form.is_caixinha ? "Nome da Caixinha" : "Nome do Ativo"}>
        <Input required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder={form.is_caixinha ? "Ex: Reserva de Emergência" : "Ex: Tesouro Direto"} />
      </Field>

      {!form.is_caixinha && (
        <div className="grid-2">
          <Field label="Tipo">
            <Select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {INVESTIMENTO_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Corretora / Banco">
            <Input value={form.corretora} onChange={e => set('corretora', e.target.value)} placeholder="Ex: XP, Nubank, Binance" />
          </Field>
        </div>
      )}

      <div className="grid-2">
        <Field label="Moeda">
          <Select value={form.moeda} onChange={e => set('moeda', e.target.value)}>
            {MOEDAS.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Visibilidade">
          <Select value={form.visibilidade} onChange={e => set('visibilidade', e.target.value)}>
            <option value="Geral">Geral</option>
            <option value="Individual">Individual</option>
          </Select>
        </Field>
      </div>

      {form.is_caixinha && (
        <div className="grid-2">
          <Field label="Valor Alvo da Meta">
            <Input required type="number" step="0.01" min="0" value={form.meta_alvo} onChange={e => set('meta_alvo', e.target.value)} />
          </Field>
          <Field label="Data Limite (Opcional)">
            <Input type="date" value={form.data_limite || ''} onChange={e => set('data_limite', e.target.value)} />
          </Field>
        </div>
      )}

      <div className="grid-2">
        <Field label={form.is_caixinha ? "Total já guardado" : "Valor Investido (Custo)"}>
          <Input required type="number" step="0.01" min="0" value={form.valor_investido} onChange={e => set('valor_investido', e.target.value)} />
        </Field>
        <Field label="Valor Atual (Mercado)">
          <Input required type="number" step="0.01" min="0" value={form.valor_atual} onChange={e => set('valor_atual', e.target.value)} />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
      </div>
    </form>
  );
}

export function InvestimentosView({ investimentos, saving, save, remove, reload }) {
  const [modal, setModal] = useState(null);
  const [activeTab, setActiveTab] = useState('carteira');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [quotes, setQuotes] = useState(null);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL');
        if (res.ok) {
          const data = await res.json();
          setQuotes({
            USD: parseFloat(data.USDBRL.ask),
            EUR: parseFloat(data.EURBRL.ask),
            BTC: parseFloat(data.BTCBRL.ask),
            ETH: parseFloat(data.ETHBRL.ask)
          });
        }
      } catch (e) {
        console.error('Erro ao buscar cotações iniciais:', e);
      }
    };
    fetchQuotes();
  }, []);

  const handleSave = async (payload) => {
    const ok = await save(payload, modal?.id);
    if (ok) setModal(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL');
      if (!res.ok) throw new Error('Falha ao obter cotações.');
      const data = await res.json();
      
      const rates = {
        'USD': parseFloat(data.USDBRL.ask),
        'EUR': parseFloat(data.EURBRL.ask),
        'BTC': parseFloat(data.BTCBRL.ask),
        'ETH': parseFloat(data.ETHBRL.ask),
      };

      let updatedCount = 0;
      for (const inv of investimentos) {
        if (!inv.is_caixinha && rates[inv.moeda]) {
          // Simplificação: Se a moeda não for BRL, vamos assumir que o 'valor_investido' é a quantidade daquela moeda.
          // O valor atual (em BRL) seria Quantidade * Cotação.
          // Então se o cara inseriu 0.5 em BTC, valor atual = 0.5 * BTCBRL
          const novoValor = (inv.valor_investido * rates[inv.moeda]).toFixed(2);
          await save({ valor_atual: Number(novoValor) }, inv.id);
          updatedCount++;
        }
      }
      if (updatedCount > 0) reload();
      alert(`Cotações atualizadas com sucesso! ${updatedCount} investimentos atualizados.`);
    } catch (e) {
      setSyncError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const caixinhas = investimentos.filter(i => i.is_caixinha);
  const carteira = investimentos.filter(i => !i.is_caixinha);

  const totalInvestido = carteira.reduce((s, c) => s + Number(c.valor_investido), 0);
  const totalAtual = carteira.reduce((s, c) => s + Number(c.valor_atual), 0);
  const lucro = totalAtual - totalInvestido;
  const lucroPct = totalInvestido > 0 ? (lucro / totalInvestido) * 100 : 0;

  return (
    <div>
      {quotes && (
        <div style={{ display: 'flex', gap: 16, padding: '10px 14px', background: 'var(--sm-surface)', border: '1px solid var(--sm-border)', borderRadius: 'var(--radius-lg)', marginBottom: 16, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 13, color: 'var(--sm-text-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--sm-text)' }}>🇺🇸 USD:</span> {fmtMoney(quotes.USD)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--sm-text-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--sm-text)' }}>🇪🇺 EUR:</span> {fmtMoney(quotes.EUR)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--sm-text-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--sm-text)' }}>₿ BTC:</span> {fmtMoney(quotes.BTC)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--sm-text-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--sm-text)' }}>⬨ ETH:</span> {fmtMoney(quotes.ETH)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setActiveTab('carteira')} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: activeTab === 'carteira' ? 'var(--sm-red)' : 'var(--sm-surface)', color: activeTab === 'carteira' ? '#fff' : 'var(--sm-text-soft)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <TrendingUp size={18} /> Minha Carteira
        </button>
        <button onClick={() => setActiveTab('caixinhas')} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: activeTab === 'caixinhas' ? 'var(--sm-red)' : 'var(--sm-surface)', color: activeTab === 'caixinhas' ? '#fff' : 'var(--sm-text-soft)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Target size={18} /> Caixinhas / Metas
        </button>
      </div>

      {syncError && <ErrorBanner message={syncError} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          {activeTab === 'carteira' && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--sm-text-soft)' }}>
                Investido: <strong style={{ color: 'var(--sm-text)' }}>{fmtMoney(totalInvestido)}</strong>
              </div>
              <div style={{ fontSize: 13, color: 'var(--sm-text-soft)' }}>
                Atual: <strong style={{ color: 'var(--sm-text)' }}>{fmtMoney(totalAtual)}</strong>
              </div>
              <div style={{ fontSize: 13, color: lucro >= 0 ? 'var(--sm-green)' : 'var(--sm-red)', fontWeight: 600, background: lucro >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: 4 }}>
                {lucro >= 0 ? '+' : ''}{fmtMoney(lucro)} ({lucroPct.toFixed(2)}%)
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'carteira' && (
            <Btn variant="secondary" icon={RefreshCw} onClick={handleSync} disabled={syncing}>
              {syncing ? 'Sincronizando...' : 'Atualizar Cotações'}
            </Btn>
          )}
          <Btn icon={Plus} onClick={() => setModal({ is_caixinha: activeTab === 'caixinhas' })}>
            {activeTab === 'caixinhas' ? 'Nova Caixinha' : 'Novo Ativo'}
          </Btn>
        </div>
      </div>
      
      {activeTab === 'caixinhas' && (
        caixinhas.length === 0 ? <EmptyState icon={Target} title="Nenhuma caixinha cadastrada" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {caixinhas.map(c => {
              const pct = Math.min(100, (Number(c.valor_atual) / (Number(c.meta_alvo) || 1)) * 100);
              return (
                <Card key={c.id} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--sm-text)' }}>{c.nome}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setModal(c)} style={{ background: 'transparent', border: 'none', color: 'var(--sm-text-soft)', cursor: 'pointer', padding: 4 }}><Edit2 size={16} /></button>
                      <button onClick={() => remove(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--sm-red)', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: 'var(--sm-text-soft)' }}>{fmtMoney(c.valor_atual)}</span>
                    <span style={{ fontWeight: 600, color: 'var(--sm-text)' }}>{fmtMoney(c.meta_alvo)}</span>
                  </div>
                  <ProgressBar pct={pct} />
                  
                  {c.data_limite && (
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--sm-text-soft)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Objetivo até:</span>
                      <strong>{fmtDate(c.data_limite)}</strong>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      )}

      {activeTab === 'carteira' && (
        carteira.length === 0 ? <EmptyState icon={Wallet} title="Nenhum investimento cadastrado" /> : (
          <div style={{ overflowX: 'auto', background: 'var(--sm-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sm-border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--sm-bg)', borderBottom: '1px solid var(--sm-border)' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Ativo</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Corretora</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Investido / Qtd</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Atual (R$)</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Lucro/Prejuízo</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carteira.map(c => {
                  const inv = Number(c.valor_investido);
                  const atu = Number(c.valor_atual);
                  const dif = atu - inv;
                  const pct = inv > 0 ? (dif / inv) * 100 : 0;
                  
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--sm-border)' }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600, color: 'var(--sm-text)' }}>{c.nome}</div>
                        <div style={{ fontSize: 12, color: 'var(--sm-text-soft)', marginTop: 2 }}>
                          {c.tipo} &middot; <span style={{ color: 'var(--sm-text)' }}>{c.moeda}</span>
                        </div>
                      </td>
                      <td style={{ padding: 12, color: 'var(--sm-text-soft)' }}>{c.corretora || '-'}</td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 500 }}>
                        {c.moeda === 'BRL' ? fmtMoney(inv) : `${inv}`}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 500 }}>{fmtMoney(atu)}</td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: dif >= 0 ? 'var(--sm-green)' : 'var(--sm-red)' }}>
                          {dif >= 0 ? '+' : ''}{fmtMoney(dif)}
                        </div>
                        {c.moeda === 'BRL' && (
                          <div style={{ fontSize: 11, color: dif >= 0 ? 'var(--sm-green)' : 'var(--sm-red)' }}>
                            {dif >= 0 ? '+' : ''}{pct.toFixed(2)}%
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button onClick={() => setModal(c)} style={{ background: 'transparent', border: 'none', color: 'var(--sm-text-soft)', cursor: 'pointer', padding: 4, marginRight: 8 }}><Edit2 size={16} /></button>
                        <button onClick={() => remove(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--sm-red)', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
      
      {modal !== null && (
        <Modal title={modal.id ? (modal.is_caixinha ? 'Editar Caixinha' : 'Editar Investimento') : (modal.is_caixinha ? 'Nova Caixinha' : 'Novo Investimento')} onClose={() => setModal(null)}>
          <InvestimentoForm item={modal.id ? modal : null} saving={saving} onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
