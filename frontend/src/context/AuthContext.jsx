import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { authApi } from '../api/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (supabaseUser) => {
    if (!supabaseUser) { setUser(null); setProfile(null); return; }
    setUser(supabaseUser);
    try {
      const p = await authApi.getProfile();
      setProfile(p);
    } catch (e) {
      setProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session?.user || null).finally(() => setLoading(false));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const u = await authApi.login(email, password);
    await loadProfile(u);
    return u;
  };

  const signup = async (payload) => {
    const u = await authApi.signup(payload);
    await loadProfile(u);
    return u;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null); setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
};
