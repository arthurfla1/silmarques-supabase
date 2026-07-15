import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Btn, Input, Field } from '../components/ui';
import { supabase } from '../lib/supabase';

function AuthLayout({ children }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div className="fadein" style={{ width:'100%', maxWidth:420, background:'var(--sm-surface)', border:'1px solid var(--sm-border)', borderRadius:'var(--radius-lg)', padding:32 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'var(--sm-red)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'Outfit', fontWeight:800, fontSize:16 }}>SM</div>
          <div style={{ fontFamily:'Outfit', fontWeight:700, fontSize:16 }}>Família SilMarques</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorMsg({ msg }) {
  if (!msg) return null;
  return <div style={{ color:'var(--sm-red)', fontSize:13, background:'var(--sm-red-light)', borderRadius:8, padding:'8px 12px' }}>{msg}</div>;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (e) { setError(e.message || 'E-mail ou senha incorretos.'); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 4px' }}>Bem-vindo de volta</h1>
      <p style={{ color:'var(--sm-text-soft)', fontSize:14, margin:'0 0 24px' }}>Entre para acessar a gestão da sua residência.</p>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Field label="E-mail"><Input type="email" required autoFocus value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></Field>
        <Field label="Senha"><Input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></Field>
        <ErrorMsg msg={error}/>
        <Btn type="submit" disabled={loading} style={{ width:'100%', marginTop:6 }}>{loading?'Entrando...':'Entrar'}</Btn>
      </form>
      <p style={{ textAlign:'center', fontSize:13.5, color:'var(--sm-text-soft)', marginTop:20 }}>
        Ainda não tem conta? <Link to="/cadastro" style={{ color:'var(--sm-red)', fontWeight:600, textDecoration:'none' }}>Criar residência</Link>
      </p>
    </AuthLayout>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get('convite');

  const [form, setForm] = useState({ householdNome:'Família SilMarques', nome:'', email:'', password:'', telefone:'', funcao:'' });
  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (inviteId) {
      supabase.from('households').select('nome').eq('id', inviteId).single().then(({ data }) => {
        if (data?.nome) {
          setHouseholdName(data.nome);
        } else {
          setHouseholdName('Residência Convidada');
        }
      }).catch(() => {
        setHouseholdName('Residência Convidada');
      });
    }
  }, [inviteId]);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await signup({ ...form, inviteHouseholdId: inviteId || undefined });
      navigate('/');
    }
    catch (e) { setError(e.message || 'Não foi possível criar a conta.'); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 4px' }}>
        {inviteId ? 'Entrar na residência' : 'Criar residência'}
      </h1>
      <p style={{ color:'var(--sm-text-soft)', fontSize:14, margin:'0 0 24px' }}>
        {inviteId 
          ? 'Crie sua conta para entrar na residência da família e começar a colaborar.' 
          : 'Você será o administrador e poderá convidar outros membros depois.'}
      </p>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {inviteId ? (
          <div style={{ background:'var(--sm-border)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--sm-border)' }}>
            <div style={{ fontSize:11.5, color:'var(--sm-text-soft)', fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>Residência Convidada</div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--sm-red)' }}>{householdName || 'Carregando detalhes...'}</div>
          </div>
        ) : (
          <Field label="Nome da residência"><Input required value={form.householdNome} onChange={e=>set('householdNome',e.target.value)}/></Field>
        )}
        <Field label="Seu nome completo"><Input required autoFocus value={form.nome} onChange={e=>set('nome',e.target.value)}/></Field>
        <Field label="E-mail"><Input type="email" required value={form.email} onChange={e=>set('email',e.target.value)}/></Field>
        <Field label="Senha"><Input type="password" required minLength={6} value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Mínimo 6 caracteres"/></Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Telefone (opcional)"><Input value={form.telefone} onChange={e=>set('telefone',e.target.value)} placeholder="(79) 99999-9999"/></Field>
          <Field label="Função na casa (opcional)"><Input value={form.funcao} onChange={e=>set('funcao',e.target.value)} placeholder="Ex: Pai"/></Field>
        </div>
        <ErrorMsg msg={error}/>
        <Btn type="submit" disabled={loading} style={{ width:'100%', marginTop:6 }}>
          {loading ? 'Entrando...' : (inviteId ? 'Criar conta e entrar' : 'Criar residência e entrar')}
        </Btn>
      </form>
      <p style={{ textAlign:'center', fontSize:13.5, color:'var(--sm-text-soft)', marginTop:20 }}>
        Já tem conta? <Link to="/login" style={{ color:'var(--sm-red)', fontWeight:600, textDecoration:'none' }}>Entrar</Link>
      </p>
    </AuthLayout>
  );
}
