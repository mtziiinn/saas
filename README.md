# 🛡️ OdontoFlow | SaaS CRM Enterprise

![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

Uma solução completa de CRM e Gestão ERP focada em Agências, Freelancers e Clínicas, construída com foco em segurança máxima, escalabilidade e experiência do usuário.

---

## ✨ Funcionalidades Principais

- **📊 Dashboard Inteligente:** Visão 360º de faturamento, novos leads e tarefas urgentes.
- **👥 Gestão de Contatos (CRM):** Ciclo de vida completo (Lead -> Prospect -> Cliente -> Churned).
- **📁 Sistema de Documentos Seguro:** Upload direto para **Vercel Blob** com metadados no Postgres.
- **💰 Módulo Financeiro:** Controle de fluxo de caixa, receitas e despesas.
- **📑 Planos de Tratamento:** Gestão detalhada de serviços recorrentes e procedimentos.
- **🌐 Portal do Paciente/Cliente:** Acesso externo seguro via token para consulta de prontuários.
- **🔔 Notificações em Tempo Real:** Alertas de agendamentos e atualizações de status.

---

## 🏗️ Arquitetura do Projeto

O projeto utiliza uma estrutura de **Monorepo** moderna com `pnpm workspaces`:

```text
├── artifacts/
│   ├── api-server/      # Backend Node.js/Express (API REST)
│   ├── crm/             # Frontend React (Dashboard principal)
│   └── mockup-sandbox/  # Ambiente de testes para novos componentes
├── lib/
│   ├── db/              # Esquema Drizzle ORM e Migrações
│   ├── api-spec/        # Especificação OpenAPI (Swagger)
│   └── api-client-react/# Cliente gerado automaticamente para o frontend
└── specs/               # Documentação técnica e designs de features
```

---

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 19** + **Vite**
- **Tailwind CSS v4** (Modern Engine)
- **TanStack Query v5** (Gerenciamento de Estado)
- **Shadcn UI** (Componentes visuais)
- **Wouter** (Roteamento leve)

### Backend
- **Node.js** + **Express**
- **Drizzle ORM** (TypeScript-first ORM)
- **Vercel Blob** (Armazenamento de arquivos)
- **Pino** (Logs de alta performance)
- **Zod** (Validação de esquemas)

---

## 🛡️ Padrões de Segurança (Fullstack Guardian)

Este projeto segue rigorosamente o protocolo **Fullstack Guardian**:
- **Auth Z:** Proteção de rotas em nível de Middleware.
- **Input Validation:** Validação rigorosa em todas as entradas (Client & Server).
- **Secure Uploads:** Arquivos validados por MIME-type e armazenados de forma não-pública.
- **Rate Limiting:** Proteção contra ataques de força bruta.

---

## ⚙️ Configuração do Ambiente

### Pré-requisitos
- Node.js + pnpm instalado.
- Vercel CLI (`pnpm add -g vercel`).

### Instalação

1. Clone o repositório e instale as dependências:
   ```bash
   pnpm install
   ```

2. Sincronize as variáveis de ambiente com o Vercel:
   ```bash
   pnpm vercel:login
   pnpm vercel:pull
   ```

3. Execute o ambiente de desenvolvimento:
   ```bash
   pnpm dev
   ```

---

## 📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido com ❤️ para ser o melhor CRM do mercado.
