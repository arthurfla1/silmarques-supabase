import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/db';

// ── TEMA ──────────────────────────────────────────────────────
const ThemeContext = createContext(null);
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('sm_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sm_theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);

// ── FAMÍLIA ───────────────────────────────────────────────────
const FamiliaContext = createContext(null);
export function FamiliaProvider({ children }) {
  const [familia, setFamilia] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setFamilia(await authApi.getMembers()); } catch (e) { setFamilia([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return (
    <FamiliaContext.Provider value={{ familia, setFamilia, loading, reload }}>
      {children}
    </FamiliaContext.Provider>
  );
}
export const useFamilia = () => useContext(FamiliaContext);
