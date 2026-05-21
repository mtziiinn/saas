# Orçamentos em PDF — Design Técnico

## Overview
Sistema de geração de orçamentos/propostas comerciais em PDF para pacientes, com dados da clínica, itens detalhados e validade.

## Schema (Drizzle)

### `quotes`
| Campo | Tipo | Descrição |
|---|---|---|
| id | serial | PK |
| contactId | integer | FK → contacts.id (cascade) |
| authorId | integer | FK → users.id (set null) |
| title | text | Título do orçamento |
| status | text | "draft" \| "sent" \| "accepted" \| "rejected" \| "expired" |
| validUntil | date | Data de validade |
| notes | text | Observações gerais |
| createdAt | timestamp | defaultNow() |

### `quote_items`
| Campo | Tipo | Descrição |
|---|---|---|
| id | serial | PK |
| quoteId | integer | FK → quotes.id (cascade) |
| description | text | Descrição do item/procedimento |
| quantity | integer | Quantidade |
| unitPrice | numeric | Valor unitário |
| total | numeric | quantity * unitPrice |

## API Endpoints

- `GET /api/quotes?contactId=1` — Listar orçamentos
- `POST /api/quotes` — Criar orçamento com itens
- `GET /api/quotes/:id/pdf` — Gerar e baixar PDF
- `PATCH /api/quotes/:id/status` — Atualizar status
- `DELETE /api/quotes/:id` — Deletar

## PDF Generation
- Backend: `pdfkit` para geração server-side
- Cabeçalho: Logo/nome da clínica, dados do paciente, número do orçamento
- Tabela: Itens com descrição, qtd, valor unit., total
- Rodapé: Validade, observações, total geral
- Font: Helvetica (padrão pdfkit, sem dependência externa)

## Frontend
- Aba "Orçamentos" no contact-detail
- Lista de cards com status (badge colorido)
- Botão "Novo Orçamento" → dialog com form dinâmico de itens
- Botão "Baixar PDF" em cada orçamento
- Ações: enviar, aceitar, recusar (muda status)

## Security
- Rotas protegidas por `requireAuth`
- Validação Zod: itens com quantity > 0, unitPrice >= 0
- PDF gerado server-side (sem expor dados sensíveis no client)
- Logs de geração e alteração de status
