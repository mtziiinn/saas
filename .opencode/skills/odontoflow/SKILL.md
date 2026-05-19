---
name: odontoflow
description: Use when building features for the OdontoFlow dental clinic CRM. Covers project patterns, conventions, architecture, and implementation rules.
---

# OdontoFlow — Dental Clinic CRM

## Project Overview
CRM para clínica odontológica com planos de tratamento, agendamentos, financeiro e portal do paciente. UI em português (pt-BR), paleta teal (saúde/odontológico).

## Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui + wouter (rotas)
- **Backend**: Express + TypeScript + Drizzle ORM + PostgreSQL
- **Geração de API**: Orval v8 (OpenAPI -> zod schemas + React Query hooks)
- **Pacotes**: pnpm workspace monorepo

## Estrutura do Projeto
```
artifacts/
  api-server/       # Backend Express (src/routes/, src/middlewares/)
  crm/              # Frontend React (src/pages/, src/components/)
lib/
  db/               # Drizzle schema + migrations (src/schema/)
  api-spec/         # OpenAPI spec (openapi.yaml) + Orval config
  api-zod/          # Generated: zod schemas + TS types
  api-client-react/ # Generated: React Query hooks
```

## Pattern: DB Schema (Drizzle)
- Arquivo em `lib/db/src/schema/<name>.ts`
- Usar `pgTable` da `drizzle-orm/pg-core`
- Campos: `id: serial("id").primaryKey()`, `createdAt`, `updatedAt`
- Exportar `insertXxxSchema` (omitindo id/createdAt/updatedAt) e tipos `InsertXxx`/`Xxx`
- Re-exportar em `lib/db/src/schema/index.ts`

```ts
export const exampleTable = pgTable("example_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const insertExampleSchema = createInsertSchema(exampleTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExample = z.infer<typeof insertExampleSchema>;
export type Example = typeof exampleTable.$inferSelect;
```

## Pattern: Backend Route
- Arquivo em `artifacts/api-server/src/routes/<name>.ts`
- Usar `Router()` do Express, `router.use(requireAuth)` para rotas protegidas
- Rotas públicas NÃO usam `requireAuth`
- Montar em `artifacts/api-server/src/routes/index.ts`

```ts
const router = Router();
router.use(requireAuth);
router.get("/resource", async (req, res) => { ... });
export default router;
```

- Async handlers com `await db.select/insert/update/delete`
- Log de atividades via `activityLogTable`
- Timestamps: `.toISOString()` na resposta
- Strings monetárias: `String(valor)` ao inserir, `Number(valor)` ao ler

## Pattern: Frontend Page
- Arquivo em `artifacts/crm/src/pages/<name>.tsx`
- Importar `useAuth` para token, `useLocation` do wouter
- Usar `fetch("/api/...")` com `Authorization: Bearer ${accessToken}` para chamadas diretas

```tsx
export default function Page() {
  const { accessToken } = useAuth();
  const [, setLocation] = useLocation();
  // useEffect com fetch + setState
}
```

- Usar shadcn/ui: `Button`, `Card`, `Input`, `Select`, `Dialog`, `Badge`, `Skeleton`
- Toast: `useToast()` hook
- Confirm: `confirm("Texto em português?")` para exclusão
- Todos os textos em português brasileiro

## Naming Conventions
- **Tabelas**: snake_case (`treatment_plans`)
- **Colunas**: snake_case (`recall_date`)
- **Rotas Express**: kebab-case (`/treatment-plans`)
- **Componentes React**: PascalCase (`PatientTimeline`)
- **Páginas**: kebab-case (`treatment-plans.tsx`)
- **Variáveis TS**: camelCase (`recallDate`)
- **Traduções**: "Pacientes", "Clínicas", "Agendamentos", "Planos de Tratamento", "Financeiro"
- **Status**: "Potencial" (lead), "Agendado" (prospect), "Ativo" (client), "Inativo" (churned)

## Financial Module
- Tabela: `financial_transactions`
- Campos: description, type (income/expense), category, amount, date, status, paymentMethod, contactId, treatmentPlanId
- Endpoints: `GET/POST/PATCH/DELETE /financial-transactions`, `GET /financial-transactions/summary`
- Categorias: consulta, procedimento, exame, material, salario, aluguel, utilidades, marketing, imposto, outro
- Status: pending, paid, cancelled

## Patient Portal
- Rota pública: `/paciente/:token`
- Token gerado automaticamente ao criar contato (campo `patientToken` em contacts)
- Exibe: dados do paciente, consultas, planos de tratamento com procedimentos, resumo financeiro
- Rota backend pública: `GET /patient-portal/:token` (sem `requireAuth`)

## Color Palette (Teal)
- Primary: hsl(174, 70%, 42%) (light) / hsl(174, 70%, 55%) (dark)
- Background: hsl(175, 40%, 97%) (light) / hsl(174, 30%, 8%) (dark)
- Sidebar: hsl(174, 35%, 97%) (light) / hsl(174, 25%, 10%) (dark)

## Build & Deploy
- Typecheck: `pnpm run typecheck` (roda tsc em libs + artifacts)
- Instalação local: `pnpm install --ignore-scripts` (pre-install falha no Windows)
- Migrations: rodam no build da Vercel (drizzle-kit push)
- Deploy: push para main (Vercel auto-deploy)

## Critical Context
- mockup-sandbox build falha no Windows (pre-existing, ignorar)
- drizzle-kit push falha localmente no Windows (esbuild), funciona na Vercel
- Sempre verificar `pnpm run typecheck` antes de commitar
- Env vars Vercel: `JWT_SECRET`, `DATABASE_URL`
