// Trigger build change to force environment variable reload
import { createClient } from '@supabase/supabase-js';

const sanitize = (val) => val ? String(val).trim().replace(/^["']|["']$/g, '') : '';

const rawUrl = sanitize(import.meta.env.VITE_SUPABASE_URL);
const rawKey = sanitize(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Se a URL estiver vazia ou não for um endereço web válido, usa a URL padrão da casa
const supabaseUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
  ? rawUrl
  : 'https://zzpzvjueortfmcyfygef.supabase.co';

// Se a chave anônima estiver vazia ou for uma chave secreta (começando com sb_secret_ etc.), usa a chave pública padrão
const supabaseAnonKey = (rawKey.startsWith('sb_publishable_') || rawKey.startsWith('eyJ'))
  ? rawKey
  : 'sb_publishable_CW-jQ0WUElcjI4yEf0PaMw_ujYlhUJ_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadFile = async (folder, file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('arquivos')
    .upload(filePath, file);

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage
    .from('arquivos')
    .getPublicUrl(filePath);

  return { path: filePath, url: publicUrl };
};

export const deleteFile = async (filePath) => {
  const { error } = await supabase.storage
    .from('arquivos')
    .remove([filePath]);
  if (error) throw new Error(error.message);
};
