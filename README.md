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
- **Agendamentos:** Calendário e lista com filtros, prioridades e notificações.
- **Planos de Tratamento:** Procedimentos com valores, status e vínculo com profissionais.
- **Prontuário Eletrônico:** Evoluições clínicas e observações (uso interno) + prescrições visíveis ao paciente.
- **Orçamentos em PDF:** Criação de orçamentos com itens, status (rascunho, enviado, aceito, rejeitado) e download em PDF via pdfkit.
- **Financeiro:** Controle de receitas e despesas, categorias, formas de pagamento, saldo mensal.
- **Comissões Automáticas:** Percentual por profissional, criação automática ao concluir procedimento, filtros e baixa de pagamento.
- **Controle de Estoque:** Categorias, produtos, movimentações (entrada/saída/ajuste), alerta de estoque baixo.
- **Relatórios:** Exportação CSV de financeiro e comissões por período com filtros.
- **Histórico de Atividades:** Timeline com filtros por tipo e data.
- **Gerenciamento de Equipe:** Cadastro de profissionais com cargo e percentual de comissão.
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

## Configuração

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
