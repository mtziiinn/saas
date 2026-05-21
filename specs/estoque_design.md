# Controle de Estoque — Design Técnico

## Overview
Sistema de gestão de estoque odontológico com categorias, controle de entrada/saída, baixa automática por procedimento e alerta de estoque mínimo.

## Schema (Drizzle)

### `product_categories`
| Campo | Tipo | Descrição |
|---|---|---|
| id | serial | PK |
| name | text | Nome da categoria (ex: "Material de Consumo", "Medicamento", "Instrumental") |
| createdAt | timestamp | defaultNow() |

### `products`
| Campo | Tipo | Descrição |
|---|---|---|
| id | serial | PK |
| name | text | Nome do produto |
| categoryId | integer | FK → product_categories.id (set null) |
| quantity | integer | Quantidade atual em estoque (>= 0) |
| minStock | integer | Quantidade mínima para alerta |
| costPrice | numeric(10,2) | Preço de custo |
| salePrice | numeric(10,2) | Preço de venda |
| createdAt | timestamp | defaultNow() |
| updatedAt | timestamp | defaultNow() |

### `inventory_movements`
| Campo | Tipo | Descrição |
|---|---|---|
| id | serial | PK |
| productId | integer | FK → products.id (cascade) |
| type | text | "in" \| "out" \| "adjustment" |
| quantity | integer | Quantidade (positiva para entrada, negativa para saída) |
| reason | text | Motivo (ex: "compra", "procedimento", "ajuste") |
| procedureId | integer | FK → treatment_procedures.id (set null) — vinculado quando baixa automática |
| createdAt | timestamp | defaultNow() |

## API Endpoints

### Categories
- `GET /api/inventory/categories` — Listar categorias
- `POST /api/inventory/categories` — Criar categoria
- `PUT /api/inventory/categories/:id` — Atualizar
- `DELETE /api/inventory/categories/:id` — Deletar (se sem produtos)

### Products
- `GET /api/inventory/products` — Listar (filtro por categoryId, busca por nome, flag lowStock)
- `POST /api/inventory/products` — Criar produto
- `PUT /api/inventory/products/:id` — Atualizar
- `DELETE /api/inventory/products/:id` — Deletar

### Movements
- `GET /api/inventory/movements?productId=1` — Histórico de movimentações
- `POST /api/inventory/movements` — Registrar entrada/saída manual (atualiza quantity do produto)

### Low Stock
- `GET /api/inventory/low-stock` — Listar produtos com quantity <= minStock

### Auto Deduction (triggered by procedure status)
- Quando um procedimento muda para status "completed", o backend deduz do estoque os produtos vinculados
- A vincularção produto x procedimento será definida em tabela separada

### `procedure_products`
| Campo | Tipo | Descrição |
|---|---|---|
| id | serial | PK |
| procedureId | integer | FK → treatment_procedures.id (cascade) |
| productId | integer | FK → products.id |
| quantity | integer | Quantidade usada |

## Frontend

### Página `/inventory` (Lista de Estoque)
- Tabela com produtos: nome, categoria, quantidade, minStock, custo, venda
- Indicador visual (vermelho) se quantity <= minStock
- Botões: Novo Produto, Nova Categoria, Registrar Movimentação
- Filtro por categoria e busca por nome

### Modal "Novo Produto"
- Campos: nome, categoria (select), quantidade inicial, minStock, custo, venda

### Modal "Registrar Movimentação"
- Select de produto, tipo (entrada/saída), quantidade, motivo

### Aba "Estoque" no contact-detail (opcional)
- Mostra produtos usados nos procedimentos do paciente

### Low Stock Alerts
- Badge no header/menu com quantidade de produtos críticos
- Tooltip ou dropdown com lista dos produtos

## Integration with Treatment Procedures

- Ao criar/editar procedimento, clínico pode vincular produtos usados
- Quando status muda para "completed", o backend:
  1. Verifica se há estoque suficiente
  2. Deduz a quantidade de cada produto
  3. Cria registro em inventory_movements (type: "out", reason: "procedimento")
  4. Se estoque insuficiente, retorna erro e não completa o procedimento

## Security
- Todas as rotas protegidas por `requireAuth`
- Validação Zod em todas as entradas
- Logs de movimentações
- Quantidade nunca negativa (checkpoint no banco ou na aplicação)
