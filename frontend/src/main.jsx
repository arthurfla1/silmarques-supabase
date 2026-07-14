import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, FamiliaProvider } from './context/contexts';
import { ProtectedRoute, DashboardPage } from './pages/DashboardPage';
import AppLayout from './pages/AppLayout';
import { LoginPage, SignupPage } from './pages/AuthPages';
import {
  ContasPage, EstoquePage, ComprasPage, LimpezaPage, VeiculosPage,
  DocumentosPage, PatrimonioPage, FamiliaPage, RelatoriosPage,
} from './pages/ModulePages';
import './theme.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<SignupPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <FamiliaProvider>
                  <AppLayout />
                </FamiliaProvider>
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="contas" element={<ContasPage />} />
              <Route path="compras" element={<ComprasPage />} />
              <Route path="estoque" element={<EstoquePage />} />
              <Route path="limpeza" element={<LimpezaPage />} />
              <Route path="veiculos" element={<VeiculosPage />} />
              <Route path="documentos" element={<DocumentosPage />} />
              <Route path="patrimonio" element={<PatrimonioPage />} />
              <Route path="familia" element={<FamiliaPage />} />
              <Route path="relatorios" element={<RelatoriosPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
