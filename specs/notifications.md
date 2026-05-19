# Feature: Notificações (Lembretes)

## Requisitos (EARS)
Enquanto um usuário autenticado visualiza um agendamento, quando ele clica no ícone de sino, o sistema deverá enviar um lembrete para o paciente vinculado e registrar o envio no histórico.

## Arquitetura

### Frontend
- **Componentes:** Botão sino na task row (tasks.tsx) + dashboard today tasks + card de histórico no contact-detail
- **Validação client-side:** Verificar se task tem contactId antes de chamar API
- **Estados:** loading (toast), error (toast destrutivo), success (toast confirmação)
- **Fluxo:** fetch POST /api/notifications/send → toast resultado

### Backend
- **Endpoint:** `POST /api/notifications/send`
- **Schemas:** Zod: `{ contactId: z.number().int().positive(), taskId?: z.number().int().positive(), type: z.enum(["email","sms"]).default("email"), message: z.string().min(1).max(500) }`
- **Operações DB:** Insert em `notifications` + `activity_log`
- **Regras:** Contact precisa existir. Se email configurado, tenta enviar de verdade. Fallback para simulado.
- **Serviços externos:** Nodemailer (SMTP)

### Security
- **Autenticação:** `requireAuth` em todas as rotas
- **Autorização:** Qualquer usuário autenticado pode enviar para qualquer contato (sem multitenancy)
- **Validação input:** Zod schema no body
- **Rate limiting:** 100 req/15min (generalLimiter)
- **Audit log:** `activityLogTable` com tipo `notification_sent`
- **Output:** Retorna apenas campos da notificação (sem dados sensíveis)

## Plano de Implementação

- [x] Passo 1: Schema DB (`notifications` table)
- [x] Passo 2: Validação Zod (backend)
- [x] Passo 3: Endpoint API (`GET /notifications` + `POST /notifications/send`)
- [x] Passo 4: Serviço de email (nodemailer)
- [x] Passo 5: Botão "Enviar Lembrete" (tasks.tsx + dashboard.tsx)
- [x] Passo 6: Card de histórico (contact-detail.tsx)
- [x] Passo 7: Typecheck passou ✅

## Checklist de Segurança

| Categoria | OK? | Ação |
|-----------|-----|------|
| Auth | ✅ | requireAuth em todas as rotas |
| Authz | ⚠️ | Sem multitenancy — qualquer usuário autenticado envia |
| Input | ✅ | Zod schema validando contactId, type, message |
| Output | ✅ | Apenas campos da notificação |
| Rate Limit | ✅ | General limiter (100/15min) |
| Logging | ✅ | Activity log com tipo notification_sent |
