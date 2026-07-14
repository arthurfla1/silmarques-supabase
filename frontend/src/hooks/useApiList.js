import { useState, useEffect, useCallback } from 'react';

export function useApiList(fetchFn) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await fetchFn()); }
    catch (e) { setError(e.message || 'Erro ao carregar dados.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { data, setData, loading, error, reload };
}
