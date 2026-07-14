# Família SilMarques v2 — Supabase + Vercel

Sistema de gestão residencial completo.
**Sem backend próprio** — 100% Supabase + Vercel.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + React Router 6 |
| Banco de dados | Supabase (PostgreSQL gerenciado) |
| Autenticação | Supabase Auth (email/senha) |
| Hospedagem | Vercel (gratuito) |
| Segurança | Row Level Security (cada família só vê seus dados) |

---

## Deploy em 4 passos

### 1. Criar projeto no Supabase

1. Acesse **supabase.com** → New Project
2. Dê um nome (ex: `silmarques`), escolha a região mais próxima, defina uma senha para o banco
3. Aguarde ~2 minutos até o projeto ficar pronto

**Rodar o schema:**
- No painel Supabase: **SQL Editor** → New query
- Cole o conteúdo de `supabase/migrations/001_schema_completo.sql`
- Clique em **Run** (botão verde)
- Deve aparecer `Success. No rows returned`

**Copiar as credenciais:**
- Vá em **Settings** → **API**
- Copie o **Project URL** e o **anon/public key**

---

### 2. Subir o código no GitHub

```bash
cd silmarques-supabase
git init
git add .
git commit -m "primeiro commit - Família SilMarques v2 Supabase"
git remote add origin https://github.com/SEU_USUARIO/silmarques-v2.git
git branch -M main
git push -u origin main
```

---

### 3. Deploy no Vercel

1. Acesse **vercel.com** → Add New Project → importe `silmarques-v2`
2. Em **Root Directory** coloque: `frontend`
3. Em **Environment Variables** adicione:
   - `VITE_SUPABASE_URL` = sua Project URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua anon key do Supabase
4. Clique em **Deploy**

Em 2-3 minutos o site estará em `https://silmarques-v2.vercel.app`

---

### 4. Criar a primeira conta

Acesse o site → **Criar residência** → preencha os dados e clique em **Criar residência e entrar**.

---

## Estrutura do projeto

```
silmarques-supabase/
  frontend/
    src/
      api/db.js          → toda a lógica de acesso ao banco (Supabase SDK)
      context/           → AuthContext, ThemeContext, FamiliaContext
      components/ui.jsx  → componentes de UI reutilizáveis
      pages/             → uma página por módulo
      lib/constants.js   → constantes e helpers
    vercel.json          → redireciona rotas para index.html (SPA)
    vite.config.js
  supabase/
    migrations/
      001_schema_completo.sql  → schema + RLS + triggers
```

## Atualizar o site (após mudanças no código)

```bash
git add .
git commit -m "descrição da mudança"
git push
```

O Vercel republica automaticamente em ~1 minuto.

## Módulos disponíveis

- **Dashboard** — saúde da casa, alertas, resumo financeiro
- **Contas** — vencimentos, pagamentos, gastos por categoria
- **Compras** — feira + supermercado unificados
- **Estoque** — validade, estoque mínimo, reposição automática
- **Limpeza** — tarefas, responsáveis, prioridades, tempo
- **Veículos** — manutenções, alertas de seguro/licenciamento
- **Documentos** — escrituras, contratos, IPTU, garantias
- **Patrimônio** — inventário com garantias e exportação CSV
- **Família** — membros, permissões (Admin/Morador/Colaborador)
- **Relatórios** — gráficos interativos de gastos e consumo
