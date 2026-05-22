# OdontoFlow | CRM para Clínicas Odontológicas

![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

CRM completo para clínicas odontológicas com gestão de pacientes, agendamentos, financeiro, estoque, comissões e prontuário eletrônico.

---

## Funcionalidades

- **Dashboard:** Visão geral com faturamento mensal, comissões pendentes, agendamentos do dia e activity feed.
- **Gestão de Pacientes:** Cadastro completo com ciclo de vida (lead, prospect, cliente, churned).
- **Agendamentos:** Calendário mensal/semanal com horários, filtros, prioridades e notificações.
- **Planos de Tratamento:** Procedimentos com valores, status e vínculo com profissionais e comissões.
- **Prontuário Eletrônico:** Evoluições clínicas e observações (uso interno) + prescrições visíveis ao paciente.
- **Orçamentos em PDF:** Criação de orçamentos com itens, status (rascunho, enviado, aceito, rejeitado) e download em PDF via pdfkit.
- **Financeiro:** Controle de receitas e despesas, categorias, formas de pagamento, saldo mensal.
- **Comissões Automáticas:** Percentual por profissional, criação automática ao concluir procedimento, filtros, baixa de pagamento e dashboard.
- **Controle de Estoque:** Categorias, produtos, movimentações (entrada/saída/ajuste), alerta de estoque baixo.
- **Relatórios:** Gráfico receitas vs despesas por mês, exportação CSV e PDF de financeiro e comissões com filtros por período.
- **Histórico de Atividades:** Timeline com filtros por tipo e data, paginação.
- **Gerenciamento de Equipe:** Cadastro de profissionais com cargo e percentual de comissão, ativação/desativação.
- **Notificações:** Envio de lembretes por email via SMTP com template HTML, auto-disparo ao criar agendamento, preferência por paciente.
- **Portal do Paciente:** Acesso externo via token para consulta de prescrições.
- **Busca Global:** Pesquisa unificada de pacientes, clínicas, agendamentos, orçamentos, prescrições e evoluções.
- **Documentos:** Upload e download seguro via Vercel Blob (stream pelo backend, token nunca exposto).

---

## Arquitetura

Monorepo com `pnpm workspaces`:

```
├── artifacts/
│   ├── api-server/      # Backend Node.js/Express (API REST)
│   ├── crm/             # Frontend React (Vite)
│   └── mockup-sandbox/  # Prototipação de componentes
├── lib/
│   ├── db/              # Schema Drizzle ORM + migrations
│   ├── api-spec/        # OpenAPI (Swagger)
│   └── api-client-react/# Hooks React Query gerados automaticamente
├── specs/               # Documentação técnica das features
├── api/                 # Entry point serverless (Vercel Functions)
└── vercel.json          # Configuração de deploy
```

---

## Tecnologias

### Frontend
- React 19 + Vite
- Tailwind CSS v4
- TanStack Query v5
- Shadcn UI
- Wouter (roteamento)
- Recharts (gráficos)
- Lucide React (ícones)
- date-fns + ptBR locale

### Backend
- Node.js + Express
- Drizzle ORM + PostgreSQL
- Vercel Blob (armazenamento)
- Zod (validação)
- Pdfkit (geração de PDF)
- Busboy (upload multipart)
- Pino (logs)

---

## Segurança

- Autenticação JWT com refresh token
- Validação de entrada (Zod) em todas as rotas
- Upload de arquivos validado por MIME-type, armazenamento privado
- Download de blobs streamado pelo backend (token nunca exposto)
- Queries parametrizadas (Drizzle ORM)

---

## Scripts

| Comando | Descrição |
|---|---|
| `pnpm dev` | Sobe frontend (Vite) + backend (Express) em paralelo |
| `pnpm build` | TypeCheck + build de todos os pacotes |
| `pnpm typecheck` | Valida tipos em libs e artifacts |
| `pnpm vercel:login` | Login no Vercel CLI |
| `pnpm vercel:pull` | Puxa variáveis de ambiente do Vercel |
| `pnpm db:backup` | Backup do PostgreSQL (pg_dump + gzip) |

---

## Deploy

O deploy é feito automaticamente pelo **Vercel** ao fazer push na branch `main`.

### Fluxo do build (Vercel)

1. `drizzle-kit push` — sincroniza o schema do banco
2. `pnpm build` — typecheck + build de todos os pacotes
3. O frontend é servido como SPA, a API como serverless functions

### Configuração

- **Build command:** `pnpm --filter @workspace/db exec drizzle-kit push --config ./drizzle.config.ts && pnpm run build`
- **Output directory:** `artifacts/crm/dist/public`
- **Rewrites:** rotas `/api/*` apontam para `api/index.mjs`, demais rotas servem `index.html`

### Variáveis de ambiente necessárias

```env
DATABASE_URL=postgres://...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
JWT_SECRET=seu_secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua_senha
SMTP_FROM=noreply@odontoflow.app
```

---

## Configuração local

### Pré-requisitos
- Node.js 18+ + pnpm
- Vercel CLI (`pnpm add -g vercel`)

### Instalação

```bash
pnpm install
pnpm vercel:login
pnpm vercel:pull
pnpm dev
```

---

## Licença

MIT. Veja [LICENSE](LICENSE).
