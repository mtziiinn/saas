---
name: fullstack-guardian-design
description: Template para design de features seguindo o padrão Three-Perspective (Frontend, Backend, Security)
---

# Feature: {Nome da Feature}

## Requisitos (EARS)
Enquanto `<pré-condição>`, quando `<gatilho>`, o sistema deverá `<resposta>`.

**Exemplo:** Enquanto o usuário está logado, quando ele clica em "Enviar Lembrete", o sistema deverá enviar uma notificação para o paciente e exibir uma mensagem de sucesso.

## Arquitetura

### Frontend
- **Componentes necessários:**
- **Validação client-side:**
- **Estados:** loading, empty, error, success
- **Otimizações:** optimistic updates, cache invalidation

### Backend
- **Endpoint:** `METHOD /api/recurso`
- **Schemas:** Zod/Pydantic para request/response
- **Operações DB:** Drizzle ORM queries
- **Regras de negócio:**
- **Serviços externos:**

### Security
- **Autenticação:** `requireAuth` middleware
- **Autorização:** verificar ownership/role
- **Validação input:** Zod schema no body/query
- **Rate limiting:** limite por endpoint
- **Audit log:** activityLogTable
- **Sanitização output:** campos sensíveis excluídos

## Plano de Implementação

- [ ] Passo 1: Schema DB (se necessário)
- [ ] Passo 2: Validação Zod (backend)
- [ ] Passo 3: Endpoint API
- [ ] Passo 4: Testar endpoint (curl/insomnia)
- [ ] Passo 5: Componente UI
- [ ] Passo 6: Integração frontend/backend
- [ ] Passo 7: Typecheck + testes

## Checklist de Segurança

| Categoria | OK? | Ação |
|-----------|-----|------|
| Auth |  | Middleware necessário? |
| Authz |  | Ownership verificado? |
| Input |  | Zod schema validando? |
| Output |  | Dados sensíveis filtrados? |
| Rate Limit |  | Limite configurado? |
| Logging |  | Evento logado? |
