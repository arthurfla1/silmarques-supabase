import React from 'react';
import { createPortal } from 'react-dom';
import { clamp } from '../lib/constants';
import { uploadFile, deleteFile } from '../lib/supabase';
import { Upload, X, FileText } from 'lucide-react';

export function Card({ children, className='', style={}, onClick }) {
  return <div onClick={onClick} className={`fadein ${className}`} style={{ background:'var(--sm-surface)', border:'1px solid var(--sm-border)', borderRadius:'var(--radius-md)', padding:16, ...style }}>{children}</div>;
}

export function Badge({ children, tone='neutral' }) {
  const t = { neutral:{bg:'var(--sm-border)',fg:'var(--sm-text-soft)'}, red:{bg:'var(--sm-red-light)',fg:'var(--sm-red)'}, green:{bg:'var(--sm-green-light)',fg:'var(--sm-green)'}, amber:{bg:'var(--sm-amber-light)',fg:'var(--sm-amber)'}, blue:{bg:'var(--sm-blue-light)',fg:'var(--sm-blue)'} }[tone] || {bg:'var(--sm-border)',fg:'var(--sm-text-soft)'};
  return <span style={{ display:'inline-flex', alignItems:'center', fontSize:12, fontWeight:600, padding:'3px 9px', borderRadius:999, background:t.bg, color:t.fg, whiteSpace:'nowrap' }}>{children}</span>;
}

export function IconBtn({ icon:Icon, onClick, tone='neutral', size=18, title }) {
  const c = { neutral:'var(--sm-text-soft)', red:'var(--sm-red)', green:'var(--sm-green)' }[tone];
  return <button title={title} onClick={onClick} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:10, border:'1px solid var(--sm-border)', background:'transparent', color:c }}><Icon size={size}/></button>;
}

export function Btn({ children, onClick, variant='primary', icon:Icon, type='button', style={}, disabled }) {
  const base = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, fontWeight:600, fontSize:14, padding:'10px 18px', borderRadius:12, border:'1px solid transparent', opacity:disabled?0.5:1, ...style };
  const v = { primary:{ background:'var(--sm-red)', color:'#fff' }, secondary:{ background:'var(--sm-surface)', color:'var(--sm-text)', border:'1px solid var(--sm-border)' }, ghost:{ background:'transparent', color:'var(--sm-text-soft)' }, success:{ background:'var(--sm-green)', color:'#fff' } }[variant];
  return <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...v }}>{Icon && <Icon size={16}/>}{children}</button>;
}

export function Field({ label, children, style={}, className='' }) {
  return <label className={className} style={{ display:'flex', flexDirection:'column', gap:6, fontSize:13, fontWeight:600, color:'var(--sm-text-soft)', ...style }}>{label}{children}</label>;
}

const iS = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid var(--sm-border)', background:'var(--sm-bg)', color:'var(--sm-text)', fontSize:14, outline:'none' };
export function Input(p) { return <input {...p} style={{ ...iS, ...(p.style||{}) }}/>; }
export function Select({ children, ...p }) {
  const selectStyle = {
    ...iS,
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236F6A65' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    paddingRight: '36px',
    ...(p.style||{})
  };
  return <select {...p} style={selectStyle}>{children}</select>;
}
export function TextArea(p) { return <textarea {...p} style={{ ...iS, resize:'vertical', minHeight:70, ...(p.style||{}) }}/>; }

export function Modal({ title, onClose, children, width=520 }) {
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return createPortal(
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1000, padding:16, overflowY:'auto' }} onClick={onClose}>
      <div className="fadein" onClick={e=>e.stopPropagation()} style={{ background:'var(--sm-surface)', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:width, maxHeight:'90vh', overflowY:'auto', border:'1px solid var(--sm-border)', margin:'auto 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid var(--sm-border)', position:'sticky', top:0, background:'var(--sm-surface)', zIndex:1, borderTopLeftRadius:'var(--radius-lg)', borderTopRightRadius:'var(--radius-lg)' }}>
          <h3 style={{ margin:0, fontSize:18, fontWeight:600 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--sm-text-soft)', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function EmptyState({ icon:Icon, title, subtitle }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 16px', color:'var(--sm-text-faint)' }}>
      <div style={{ display:'inline-flex', width:56, height:56, borderRadius:16, background:'var(--sm-border)', alignItems:'center', justifyContent:'center', marginBottom:14 }}>{Icon&&<Icon size={26}/>}</div>
      <div style={{ fontSize:15, fontWeight:600, color:'var(--sm-text-soft)' }}>{title}</div>
      {subtitle&&<div style={{ fontSize:13, marginTop:4 }}>{subtitle}</div>}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18, gap:12, flexWrap:'wrap' }}>
      <div><h2 style={{ margin:0, fontSize:22, fontWeight:600 }}>{title}</h2>{subtitle&&<p style={{ margin:'4px 0 0', fontSize:13, color:'var(--sm-text-soft)' }}>{subtitle}</p>}</div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, max, tone='red' }) {
  const pct = clamp((value/(max||1))*100, 0, 100);
  const c = { red:'var(--sm-red)', green:'var(--sm-green)', amber:'var(--sm-amber)', blue:'var(--sm-blue)' }[tone];
  return <div style={{ width:'100%', height:6, borderRadius:999, background:'var(--sm-border)', overflow:'hidden' }}><div style={{ width:`${pct}%`, height:'100%', background:c, borderRadius:999, transition:'width .3s' }}/></div>;
}

export function HealthRing({ pct, size=120 }) {
  const r=(size-14)/2, c=2*Math.PI*r, offset=c-(pct/100)*c;
  const color = pct<50?'var(--sm-red)':pct<80?'var(--sm-amber)':'var(--sm-green)';
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--sm-border)" strokeWidth="9"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition:'stroke-dashoffset .6s ease' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:26, fontWeight:700, fontFamily:'Outfit' }}>{pct}%</span>
        <span style={{ fontSize:11, color:'var(--sm-text-soft)', fontWeight:600 }}>saúde da casa</span>
      </div>
    </div>
  );
}
export function Avatar({ name='?', size=38, url }) {
  const initials = name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const colors = ['#D32F2F','#1565C0','#2E7D32','#B8740A','#6A4C93'];
  let h=0; for (let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  const bg = colors[Math.abs(h)%colors.length];
  
  const bucketUrl = `https://zzpzvjueortfmcyfygef.supabase.co/storage/v1/object/public/arquivos/`;
  const fileUrl = url ? (url.startsWith('http') ? url : `${bucketUrl}${url}`) : '';

  if (url) {
    return (
      <img 
        src={fileUrl} 
        alt={name} 
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--sm-border)' }} 
      />
    );
  }

  return <div style={{ width:size, height:size, borderRadius:'50%', background:bg+'22', color:bg, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:size*.36, flexShrink:0 }}>{initials}</div>;
}
export function Metric({ icon:Icon, label, value, tone='neutral' }) {
  const c = { neutral:'var(--sm-text)', green:'var(--sm-green)', amber:'var(--sm-amber)', blue:'var(--sm-blue)', red:'var(--sm-red)' }[tone];
  return (
    <div style={{ background:'var(--sm-bg)', borderRadius:12, padding:'12px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--sm-text-soft)', fontSize:12, fontWeight:600, marginBottom:6 }}>{Icon&&<Icon size={14}/>} {label}</div>
      <div style={{ fontSize:19, fontWeight:700, color:c, fontFamily:'Outfit' }}>{value}</div>
    </div>
  );
}

export function Row({ left, right, badge }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'6px 0', borderBottom:'1px solid var(--sm-border)', fontSize:13.5 }}>
      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{left}</span>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}><span style={{ color:'var(--sm-text-soft)' }}>{right}</span>{badge}</div>
    </div>
  );
}

export function Spinner({ size=22 }) {
  return <div style={{ width:size, height:size, border:'2.5px solid var(--sm-border)', borderTopColor:'var(--sm-red)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>;
}

export function LoadingScreen({ label='Carregando...' }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:14 }}><Spinner size={32}/><div style={{ color:'var(--sm-text-soft)', fontSize:14 }}>{label}</div></div>;
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, background:'var(--sm-red-light)', color:'var(--sm-red)', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13.5 }}>
      <span>{message}</span>
      {onRetry&&<button onClick={onRetry} style={{ background:'transparent', border:'1px solid var(--sm-red)', borderRadius:8, color:'var(--sm-red)', padding:'4px 10px', fontWeight:600, fontSize:12 }}>Tentar novamente</button>}
    </div>
  );
}

export function FileUploader({ folder, value, onUploadComplete, onRemove, label = 'Anexar arquivo', accept = '*' }) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setE] = React.useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setE('');
    try {
      const res = await uploadFile(folder, file);
      onUploadComplete(res);
    } catch (err) {
      setE(err.message || 'Erro ao fazer upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    setUploading(true); setE('');
    try {
      await deleteFile(value);
      onRemove();
    } catch (err) {
      onRemove();
    } finally {
      setUploading(false);
    }
  };

  const isImage = value && (value.match(/\.(jpeg|jpg|gif|png|webp)/i));
  const bucketUrl = `https://zzpzvjueortfmcyfygef.supabase.co/storage/v1/object/public/arquivos/`;
  const fileUrl = value ? (value.startsWith('http') ? value : `${bucketUrl}${value}`) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sm-text-soft)' }}>{label}</span>}
      
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--sm-border)', borderRadius: 10, background: 'var(--sm-bg)' }}>
          {isImage ? (
            <img src={fileUrl} alt="Anexo" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--sm-border)' }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--sm-red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sm-red)' }}>
              <FileText size={20} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value.split('/').pop()}
            </div>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--sm-red)', textDecoration: 'none', fontWeight: 600 }}>Visualizar arquivo</a>
          </div>
          <button type="button" onClick={handleRemove} disabled={uploading} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--sm-border)', background: 'transparent', color: 'var(--sm-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: 80, border: '2px dashed var(--sm-border)', borderRadius: 12, background: 'var(--sm-surface)', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s' }}>
          <input type="file" accept={accept} onChange={handleFileChange} disabled={uploading} style={{ display: 'none' }} />
          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--sm-text-soft)' }}>
              <div style={{ width: 16, height: 16, border: '2px solid var(--sm-border)', borderTopColor: 'var(--sm-red)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              Enviando arquivo...
            </div>
          ) : (
            <>
              <Upload size={18} style={{ color: 'var(--sm-text-faint)' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sm-text-soft)' }}>Clique para fazer upload</span>
            </>
          )}
        </label>
      )}
      {error && <span style={{ fontSize: 12, color: 'var(--sm-red)' }}>{error}</span>}
    </div>
  );
}
