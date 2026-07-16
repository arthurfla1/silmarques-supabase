import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Home, Receipt, ShoppingCart, Package, Sparkles, Car, FileText, Award, Users, BarChart3, Menu, X, Sun, Moon, LogOut, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/contexts';
import { authApi } from '../api/db';
import { Modal, Field, Input, Btn, ErrorBanner, Avatar } from '../components/ui';
const NAV = [
  { to:'/', label:'Início', icon:Home, end:true, roles:['Administrador','Morador','Colaborador'] },
  { to:'/contas', label:'Contas', icon:Receipt, roles:['Administrador','Morador'] },
  { to:'/compras', label:'Compras', icon:ShoppingCart, roles:['Administrador','Morador','Colaborador'] },
  { to:'/estoque', label:'Estoque', icon:Package, roles:['Administrador','Morador','Colaborador'] },
  { to:'/limpeza', label:'Limpeza', icon:Sparkles, roles:['Administrador','Morador','Colaborador'] },
  { to:'/veiculos', label:'Veículos', icon:Car, roles:['Administrador','Morador'] },
  { to:'/documentos', label:'Documentos', icon:FileText, roles:['Administrador','Morador'] },
  { to:'/patrimonio', label:'Patrimônio', icon:Award, roles:['Administrador','Morador'] },
  { to:'/familia', label:'Família', icon:Users, roles:['Administrador'] },
  { to:'/relatorios', label:'Relatórios', icon:BarChart3, roles:['Administrador'] },
];
const BOTTOM = ['/','/contas','/compras','/estoque','/limpeza'];

function NavItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.end} onClick={onClick} style={({ isActive }) => ({
      display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10,
      background: isActive?'var(--sm-red)':'transparent', color: isActive?'#fff':'var(--sm-text-soft)',
      fontSize:13.5, fontWeight:600, textDecoration:'none', transition:'background .15s'
    })}>
      <Icon size={18}/>{item.label}
    </NavLink>
  );
}

const isModuleAllowed = (profile, to) => {
  if (!profile) return false;
  const modId = to === '/' ? 'inicio' : to.replace('/', '');
  if (profile.modulos !== undefined && profile.modulos !== null && profile.modulos.trim() !== '') {
    if (modId === 'inicio') return true;
    return profile.modulos.split(',').includes(modId);
  }
  const role = profile.permissao || 'Morador';
  const navItem = NAV.find(item => item.to === to);
  return navItem ? navItem.roles.includes(role) : false;
};

function Footer({ user, theme, toggleTheme, logout, onChangePassword }) {
  return (
    <div style={{ padding:12, borderTop:'1px solid var(--sm-border)', display:'flex', flexDirection:'column', gap:8 }}>
      {user && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 4px' }}>
          <Avatar name={user.nome} url={user.avatar_url} size={38} />
          <div style={{ fontSize:12.5, color:'var(--sm-text-soft)', minWidth: 0 }}>
            <div style={{ fontWeight:600, color:'var(--sm-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.nome||user.email}</div>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2, flexWrap:'wrap' }}>
              <span>{user.permissao||'Membro'}</span>
              <span style={{ color:'var(--sm-text-faint)' }}>•</span>
              <span style={{ fontWeight:600, color:'var(--sm-red)' }}>{user.household_nome || 'SilMarques'}</span>
            </div>
          </div>
        </div>
      )}
      <button onClick={onChangePassword} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:'1px solid var(--sm-border)', background:'transparent', color:'var(--sm-text)', fontSize:13.5, fontWeight:600 }}>
        <Key size={17}/>Alterar senha
      </button>
      <button onClick={toggleTheme} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:'1px solid var(--sm-border)', background:'transparent', color:'var(--sm-text)', fontSize:13.5, fontWeight:600 }}>
        {theme==='light'?<Moon size={17}/>:<Sun size={17}/>}{theme==='light'?'Modo escuro':'Modo claro'}
      </button>
      <button onClick={logout} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:'1px solid var(--sm-border)', background:'transparent', color:'var(--sm-red)', fontSize:13.5, fontWeight:600 }}>
        <LogOut size={17}/>Sair
      </button>
    </div>
  );
}

function Sidebar({ profile, theme, toggleTheme, logout, onClose, onChangePassword }) {
  const allowedNav = NAV.filter(item => isModuleAllowed(profile, item.to));
  return (
    <aside style={{ width:232, display:'flex', flexDirection:'column', height:'100%', background:'var(--sm-surface)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 20px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'var(--sm-red)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'Outfit', fontWeight:800, fontSize:16, flexShrink:0 }}>SM</div>
          <div><div style={{ fontFamily:'Outfit', fontWeight:700, fontSize:16, lineHeight:1.2 }}>Família SilMarques</div><div style={{ fontSize:11.5, color:'var(--sm-text-soft)' }}>Gestão residencial</div></div>
        </div>
        {onClose && <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--sm-text-soft)' }}><X size={20}/></button>}
      </div>
      <nav style={{ flex:1, padding:'4px 12px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
        {allowedNav.map(item => <NavItem key={item.to} item={item} onClick={onClose}/>)}
      </nav>
      <Footer user={profile} theme={theme} toggleTheme={toggleTheme} logout={logout} onChangePassword={onChangePassword}/>
    </aside>
  );
}

export default function AppLayout() {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const location = useLocation();

  const userRole = profile?.permissao || 'Morador';
  const allowedNav = NAV.filter(item => item.roles.includes(userRole));
  
  // Calculate allowed mobile bottom items
  const allowedBottom = BOTTOM.filter(to => allowedNav.some(n => n.to === to));

  const currentNav = NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)) || NAV[0];

  // Block unauthorized direct URL access
  const isAuthorized = allowedNav.some(item => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to));
  if (profile && !isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Desktop sidebar */}
      <div className="sm-sidebar" style={{ width:232, flexShrink:0, borderRight:'1px solid var(--sm-border)', position:'sticky', top:0, height:'100vh' }}>
        <Sidebar profile={profile} theme={theme} toggleTheme={toggleTheme} logout={logout} onChangePassword={() => setShowChangePassword(true)}/>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div onClick={()=>setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:90 }}>
          <div onClick={e=>e.stopPropagation()} style={{ position:'fixed', left:0, top:0, width:240, height:'100vh', zIndex:91 }}>
            <Sidebar profile={profile} theme={theme} toggleTheme={toggleTheme} logout={logout} onClose={()=>setSidebarOpen(false)} onChangePassword={() => { setSidebarOpen(false); setShowChangePassword(true); }}/>
          </div>
        </div>
      )}

      <main style={{ flex:1, minWidth:0, paddingBottom:76 }}>
        {/* Mobile topbar */}
        <div className="sm-topbar" style={{ display:'none', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--sm-border)', background:'var(--sm-surface)', position:'sticky', top:0, zIndex:50 }}>
          <button onClick={()=>setSidebarOpen(true)} style={{ background:'transparent', border:'none', color:'var(--sm-text)', display:'flex' }}><Menu size={22}/></button>
          <div style={{ fontFamily:'Outfit', fontWeight:700, fontSize:15 }}>{currentNav.label}</div>
          <button onClick={toggleTheme} style={{ background:'transparent', border:'none', color:'var(--sm-text)', display:'flex' }}>{theme==='light'?<Moon size={20}/>:<Sun size={20}/>}</button>
        </div>

        <div style={{ maxWidth:1180, margin:'0 auto', padding:'24px 24px' }} className="sm-content">
          <Outlet/>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm-bottomnav" style={{ display:'none', position:'fixed', bottom:0, left:0, right:0, background:'var(--sm-surface)', borderTop:'1px solid var(--sm-border)', zIndex:80, padding:'6px 4px' }}>
        <div style={{ display:'flex', justifyContent:'space-around' }}>
          {allowedBottom.map(to => {
            const item = NAV.find(n=>n.to===to);
            const Icon = item.icon;
            return (
              <NavLink key={to} to={to} end={item.end} style={({ isActive }) => ({ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color: isActive?'var(--sm-red)':'var(--sm-text-faint)', padding:'6px 10px', flex:1, textDecoration:'none' })}>
                <Icon size={21}/><span style={{ fontSize:10.5, fontWeight:600 }}>{item.label}</span>
              </NavLink>
            );
          })}
          <button onClick={()=>setMoreOpen(true)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'transparent', border:'none', color:!allowedBottom.includes(currentNav.to)?'var(--sm-red)':'var(--sm-text-faint)', padding:'6px 10px', flex:1 }}>
            <Menu size={21}/><span style={{ fontSize:10.5, fontWeight:600 }}>Mais</span>
          </button>
        </div>
      </nav>

      {/* Mobile more sheet */}
      {moreOpen && (
        <div onClick={()=>setMoreOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:95, display:'flex', alignItems:'flex-end' }}>
          <div onClick={e=>e.stopPropagation()} className="fadein" style={{ width:'100%', background:'var(--sm-surface)', borderRadius:'20px 20px 0 0', padding:'16px 12px 24px' }}>
            <div style={{ width:36, height:4, background:'var(--sm-border)', borderRadius:999, margin:'0 auto 16px' }}/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {allowedNav.filter(n=>!allowedBottom.includes(n.to)).map(item => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} onClick={()=>setMoreOpen(false)} style={({ isActive }) => ({ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 8px', borderRadius:14, border:'1px solid var(--sm-border)', background: isActive?'var(--sm-red-light)':'var(--sm-bg)', color: isActive?'var(--sm-red)':'var(--sm-text)', textDecoration:'none' })}>
                    <Icon size={22}/><span style={{ fontSize:12, fontWeight:600 }}>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showChangePassword && (
        <Modal title="Alterar senha" onClose={() => setShowChangePassword(false)}>
          <ChangePasswordForm onClose={() => setShowChangePassword(false)} />
        </Modal>
      )}

      <style>{`
        @media(max-width:880px){
          .sm-sidebar{display:none!important;}
          .sm-topbar{display:flex!important;}
          .sm-bottomnav{display:block!important;}
          .sm-content{padding:16px!important;}
        }
      `}</style>
    </div>
  );
}

function ChangePasswordForm({ onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await authApi.updatePassword(password);
      setSuccess('Senha alterada com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Erro ao alterar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {error && <ErrorBanner message={error} />}
      {success && (
        <div style={{ color:'var(--sm-green)', fontSize:13.5, background:'var(--sm-green-light)', borderRadius:8, padding:'8px 12px', border:'1px solid var(--sm-border)' }}>
          {success}
        </div>
      )}
      
      <Field label="Nova senha">
        <Input 
          type="password" 
          required 
          minLength={6} 
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
          placeholder="Mínimo 6 caracteres"
          autoFocus
        />
      </Field>

      <Field label="Confirmar nova senha">
        <Input 
          type="password" 
          required 
          minLength={6} 
          value={confirmPassword} 
          onChange={e=>setConfirmPassword(e.target.value)} 
          placeholder="Repita a nova senha"
        />
      </Field>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}>
        <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Btn>
        <Btn type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Alterar Senha'}</Btn>
      </div>
    </form>
  );
}
