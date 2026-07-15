// Trigger build change to force environment variable reload
import { createClient } from '@supabase/supabase-js';

const sanitize = (val) => val ? String(val).trim().replace(/^["']|["']$/g, '') : '';

const supabaseUrl = sanitize(import.meta.env.VITE_SUPABASE_URL) || 'https://zzpzvjueortfmcyfygef.supabase.co';
const supabaseAnonKey = sanitize(import.meta.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_CW-jQ0WUElcjI4yEf0PaMw_ujYlhUJ_';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.\n' +
    'Crie o arquivo .env.local com os valores do seu projeto Supabase.'
  );
}

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
