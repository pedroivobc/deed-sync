# Clemente Assessoria — Gestor de Serviços

Sistema interno de gestão da Clemente Assessoria para CRM, controle de processos
(escrituras, regularizações e serviços avulsos) e financeiro BPO.

## Stack

- **Frontend:** React 18 + TypeScript 5 + Vite 5
- **Estilo:** Tailwind CSS v3 + shadcn/ui (paleta preto / amarelo / cinza / branco)
- **Estado/dados:** TanStack Query
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions + Realtime)
- **Hospedagem:** Lovable

## Como rodar localmente

```bash
# 1. Instale as dependências
npm install

# 2. Inicie o dev server
npm run dev
```

Aplicação disponível em `http://localhost:8080`.

### Variáveis de ambiente

O arquivo `.env` é gerenciado automaticamente pelo Lovable Cloud e contém:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

Não edite manualmente — são reescritas a cada conexão de backend.

## Estrutura de pastas

```
src/
├── components/        # Componentes compartilhados (UI, layout, sidebar, topbar)
│   ├── ui/            # shadcn/ui primitives
│   ├── crm/           # Específicos do CRM
│   ├── servicos/      # Kanban, formulários por tipo de serviço
│   └── financeiro/    # KPIs BPO, gráficos, recomendações
├── contexts/          # AuthContext (sessão, perfil, papéis, tema)
├── hooks/             # usePermissions, useNotifications, etc.
├── integrations/
│   └── supabase/      # client.ts e types.ts (auto-gerados)
├── lib/               # utilitários (money, masks, finance, theme)
├── pages/             # Rotas (Dashboard, CRM, Serviços, Financeiro, ...)
└── test/              # Vitest setup

supabase/
├── functions/         # Edge functions (manage-users, etc.)
└── migrations/        # Migrações SQL versionadas
```

## Perfis de usuário e permissões

O sistema possui **3 perfis** com permissões granulares aplicadas por UI **e** por
RLS no banco:

| Recurso                | Administrador | Gerente | Colaborador |
|------------------------|:-------------:|:-------:|:-----------:|
| Dashboard              | ✅            | ✅      | ⚠️ sem KPIs financeiros |
| CRM (CRUD)             | ✅            | ✅      | ✅ (sem excluir terceiros, sem notas internas) |
| Serviços (Kanban+CRUD) | ✅            | ✅      | ✅ (sem campos financeiros) |
| Financeiro             | ✅            | ✅      | ❌ |
| Gestão de Usuários     | ✅            | ❌      | ❌ |
| Log de Auditoria       | ✅            | ❌      | ❌ |

## Deploy

Hospedado e publicado via **Lovable**. O deploy é automático a cada alteração
aprovada no editor.

## Licença

Proprietário — uso interno Clemente Assessoria.
