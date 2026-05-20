# Prontuário Eletrônico — Design Técnico

## Overview
Sistema de registro clínico para acompanhamento de evoluções, prescrições e histórico de procedimentos por paciente.

## Schema (Drizzle)

### `clinical_notes`
| Campo | Tipo | Descrição |
|---|---|---|
| id | serial | PK |
| contactId | integer | FK → contacts.id (cascade) |
| authorId | integer | FK → users.id (set null) |
| type | text | "evolution" \| "prescription" \| "observation" |
| content | text | Conteúdo clínico (markdown) |
| createdAt | timestamp | defaultNow() |

### `prescriptions`
| Campo | Tipo | Descrição |
|---|---|---|
| id | serial | PK |
| contactId | integer | FK → contacts.id (cascade) |
| authorId | integer | FK → users.id (set null) |
| medication | text | Nome do medicamento |
| dosage | text | Posologia (ex: "500mg 3x ao dia") |
| duration | text | Duração (ex: "7 dias") |
| notes | text | Observações adicionais |
| createdAt | timestamp | defaultNow() |

## API Endpoints

### Clinical Notes
- `GET /api/clinical-notes?contactId=1` — Listar notas do paciente
- `POST /api/clinical-notes` — Criar nota (body: contactId, type, content)
- `DELETE /api/clinical-notes/:id` — Deletar nota

### Prescriptions
- `GET /api/prescriptions?contactId=1` — Listar prescrições do paciente
- `POST /api/prescriptions` — Criar prescrição
- `DELETE /api/prescriptions/:id` — Deletar prescrição

## Frontend

### Componente `ClinicalRecordTab`
- Aba no contact-detail
- Timeline vertical agrupada por data
- Botão "Nova Evolução" → textarea + select de tipo
- Botão "Nova Prescrição" → form com campos estruturados
- Cards com ícone por tipo (evolução = file-text, prescrição = pill)

## Security
- Todas as rotas protegidas por `requireAuth`
- Validação Zod: content min 10 chars, type enum restrito
- Apenas o autor ou admin pode deletar (TODO: role check)
- Logs de criação/deleção de registros clínicos
