# Feature: Comissões Automáticas

## Architecture

### Frontend
- **Página `/commissions`** com tabela de comissões, filtros (status, profissional, período) e ação de baixa
- **Adicionar campo "Profissional"** no formulário de procedimentos (create/edit treatment plan)
- **Sidebar**: link "Comissões" com badge de pendentes
- **Dashboard**: card com total de comissões pendentes no mês

### Backend
- **Novo schema `commissions`**: id, procedureId, professionalId, treatmentPlanId, procedureValue, commissionPercentage, commissionAmount, status (pending/paid), paidAt, notes, createdAt, updatedAt
- **Alteração no `users` schema**: adicionar `commissionPercentage` (numeric, default 0)
- **Alteração no `treatment_procedures` schema**: adicionar `professionalId` (FK → users, nullable)
- **Trigger**: quando procedure status muda para "completed", auto-criar commission (status=pending)
- **Endpoint `GET /commissions`**: listar com filtros (status, professionalId, startDate, endDate)
- **Endpoint `GET /commissions/summary`**: total pendente, total pago, contagens
- **Endpoint `PATCH /commissions/:id`**: marcar como paid (com data)
- **Dashboard**: adicionar total de comissões pendentes

### Security
- Autenticação JWT em todos os endpoints
- Apenas admins podem marcar comissão como paga
- Validação de input nos schemas Zod
- Log de atividades ao criar/pagar comissão

## Implementation Plan

- [ ] Step 1: Update DB schemas (users, treatment-procedures, new commissions)
- [ ] Step 2: Update treatment-plans route to handle professionalId, auto-create commissions
- [ ] Step 3: Create commissions route with CRUD + summary
- [ ] Step 4: Register commissions route
- [ ] Step 5: Update frontend treatment-plans.tsx (professional select)
- [ ] Step 6: Create frontend commissions page
- [ ] Step 7: Add to sidebar navigation
- [ ] Step 8: Update dashboard stats
- [ ] Step 9: TypeScript check, commit, push
