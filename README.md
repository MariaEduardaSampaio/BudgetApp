# Orçamentos — site de orçamentos para oficina mecânica

[![CI](https://github.com/MariaEduardaSampaio/BudgetApp/actions/workflows/ci.yml/badge.svg)](https://github.com/MariaEduardaSampaio/BudgetApp/actions/workflows/ci.yml)

Site (instalável no celular) para criar orçamentos de oficina de forma simples, pensado para quem tem pouca familiaridade com computador. Nasceu para dar autonomia ao meu pai, que dependia de outras pessoas para montar orçamentos no notebook.

## Funcionalidades

- Cadastro do cliente, veículo e serviços/peças, com máscaras de telefone, valores em R$ e placa (formato antigo `ABC-1234` ou Mercosul `ABC1D23`)
- Total calculado automaticamente
- Data do orçamento e validade (7, 15, 30 dias ou sem validade)
- **PDF no padrão da oficina** (cabeçalho, tabela, total e assinatura), gerado no navegador com jsPDF
- Visualizar, baixar ou compartilhar o PDF (WhatsApp, e-mail, Drive...)
- **Histórico na nuvem** (Supabase), compartilhado entre quem trabalha na oficina, com busca por cliente/placa/número; cada orçamento pode ser aberto, editado e excluído
- **Numeração sequencial** (Nº 0001, 0002...) gerada pelo banco, sem repetir mesmo com duas pessoas salvando ao mesmo tempo
- **Login com e-mail e senha**; cadastro fechado (só entra quem for convidado)

## Stack

Expo (SDK 53) / React Native Web · TypeScript · expo-router · Supabase (Postgres + Auth + RLS) · jsPDF + jspdf-autotable

## Banco de dados

O esquema fica versionado em [`supabase/migrations/`](supabase/migrations/) e é testado automaticamente:

- `workshops` / `workshop_members` — oficina e quem tem acesso a ela
- `budgets` / `budget_items` — orçamentos e seus itens, com regras de validação no próprio banco (placa, ano, quantidade...)
- **Row Level Security**: cada usuário só enxerga os orçamentos da oficina da qual é membro
- `save_budget()` — salva orçamento + itens numa única transação
- Trigger de numeração sequencial por oficina

Como configurar: **[docs/supabase.md](docs/supabase.md)**.

## Estrutura

```
app/(tabs)/          telas principais (Novo orçamento, Histórico)
app/budget/[id].tsx  visualização e edição de um orçamento
app/login.tsx        login
src/components/      formulários e componentes de UI (ui/)
src/hooks/           formulário (useBudgetForm) e login (useAuth)
src/services/        Supabase (supabase, budgetStorage, budgetMapper), PDF (budgetPdf),
                     visualizar/baixar/compartilhar (budgetFile) e importação dos orçamentos antigos (legacyStorage)
src/utils/           formatadores, validações e mensagens de erro
src/constants/       paleta (theme.ts) e dados da oficina (workshop.ts)
supabase/            migrations SQL e testes do banco
public/              index.html, manifest e ícones do site
```

## Rodando em desenvolvimento

```bash
npm install
cp .env.example .env.local   # e preencha com os dados do Supabase
npm start
```

## Testes

```bash
npm test
```

Testes automatizados (Jest + Testing Library) cobrem as regras de negócio:

- **Formatadores** — máscaras de telefone, placa (antiga/Mercosul), valores em R$, datas
- **Validações** — campos obrigatórios, placa, ano, quantidade e mensagens de erro
- **Formulário** (`useBudgetForm`) — criar, calcular total, destacar erros, salvar e editar orçamentos
- **PDF** — conteúdo, número, total, quebra em várias páginas, validade e nome do arquivo
- **Banco de dados** — o SQL roda num Postgres de verdade ([PGlite](https://pglite.dev)) dentro do teste: numeração, transação, regras de validação e **Row Level Security** (quem não é da oficina não vê nem altera nada)
- **Integração** — conversão banco ↔ app, importação dos orçamentos antigos, mensagens de erro

Os testes rodam com fuso fixo (`America/Sao_Paulo`) para darem o mesmo resultado em qualquer máquina.

## Integração contínua

A cada push ou pull request na `master`, o GitHub Actions (`.github/workflows/ci.yml`) roda tipagem, lint, testes e o build do site. Para rodar o mesmo localmente:

```bash
npm run typecheck && npm run lint && npm test && npm run build:web
```

## Publicação

- **Deploy:** o projeto está pronto para a [Vercel](https://vercel.com) (`vercel.json`). Importe o repositório do GitHub e cada `git push` publica uma nova versão. Configure as variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_KEY` (ver [docs/supabase.md](docs/supabase.md)).
- **Build manual:** `npm run build:web` gera o site estático em `dist/`.
- **No celular:** Android (Chrome): menu ⋮ → *Adicionar à tela inicial*. iPhone (Safari): Compartilhar → *Adicionar à Tela de Início*.

> Orçamentos feitos antes do Supabase ficavam só no navegador. Ao abrir o Histórico nesse aparelho, aparece o botão **"Enviar para a nuvem"** para importá-los.
