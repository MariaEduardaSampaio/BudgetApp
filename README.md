# Orçamentos — site de orçamentos para oficina mecânica

[![CI](https://github.com/MariaEduardaSampaio/BudgetApp/actions/workflows/ci.yml/badge.svg)](https://github.com/MariaEduardaSampaio/BudgetApp/actions/workflows/ci.yml)

Site (instalável no celular) para criar orçamentos de oficina de forma simples, pensado para quem tem pouca familiaridade com computador. Nasceu para dar autonomia ao meu pai, que dependia de outras pessoas para montar orçamentos no notebook.

## Funcionalidades

- Cadastro do cliente, veículo e serviços/peças, com máscaras de telefone, valores em R$ e placa (formato antigo `ABC-1234` ou Mercosul `ABC1D23`)
- Total calculado automaticamente
- Data do orçamento e validade (7, 15, 30 dias ou sem validade)
- **PDF no padrão da oficina** (cabeçalho, tabela, total e assinatura), gerado no navegador com jsPDF
- Visualizar, baixar ou compartilhar o PDF (WhatsApp, e-mail, Drive...)
- **Histórico na nuvem** (Supabase), com busca por cliente, modelo, placa ou número; cada orçamento pode ser aberto, editado e excluído
- **Numeração sequencial** (Nº 0001, 0002...) gerada pelo banco, sem repetir mesmo com duas pessoas salvando ao mesmo tempo
- **Login com e-mail e senha**, "Esqueci minha senha" por e-mail e troca de senha; cadastro fechado (só entra quem for convidado)

## Stack

Expo (SDK 58) / React Native Web · TypeScript · expo-router · Supabase (Postgres + Auth + RLS) · jsPDF + jspdf-autotable · Vercel

## Banco de dados

O esquema fica versionado em [`supabase/migrations/`](supabase/migrations/) e é testado automaticamente:

- `workshops` / `workshop_members` — oficina e quem tem acesso a ela
- `budgets` / `budget_items` — orçamentos e seus itens, com regras de validação e limites de tamanho no próprio banco (placa, ano, quantidade, textos, até 100 itens)
- `save_budget()` — **única forma de gravar**: cria ou atualiza o orçamento com todos os itens numa transação e confere login e oficina
- Trigger de numeração sequencial por oficina

Como configurar: **[docs/supabase.md](docs/supabase.md)**.

## Segurança

- **Row Level Security** em todas as tabelas: cada usuário só enxerga os orçamentos da oficina da qual é membro
- **Superfície mínima na API:** o site só consegue *ler* e *excluir* orçamentos direto nas tabelas; criar e editar passa obrigatoriamente pela `save_budget`. Ninguém consegue alterar o número de um orçamento, forjar quem o criou ou se adicionar a uma oficina
- Visitante sem login não tem nenhuma permissão nas tabelas nem nas funções
- A chave do Supabase usada no site é a *publishable* (pública por natureza); a chave secreta nunca vai para o navegador
- **Cabeçalhos HTTP** (`vercel.json`): Content-Security-Policy (só scripts do próprio site; conexões só com o Supabase), proteção contra clickjacking, `nosniff`, `Referrer-Policy` e `Permissions-Policy`
- Mensagens de erro em português, sem expor detalhes técnicos

## Performance

- Histórico em páginas numeradas (1, 5, 10 ou 20 por página), com o total de orçamentos e busca feita no banco (com espera de digitação)
- Só as colunas usadas são buscadas
- Só a fonte de ícones usada (Ionicons) entra no site
- Arquivos com hash no nome ficam em cache no navegador por 1 ano

## Estrutura

```
app/(tabs)/          telas principais (Novo orçamento, Histórico)
app/budget/[id].tsx  visualização e edição de um orçamento
app/login.tsx        login (+ forgot-password.tsx e reset-password.tsx)
src/components/      formulários, telas de login e componentes de UI (ui/)
src/hooks/           formulário (useBudgetForm) e login (useAuth)
src/services/        Supabase (supabase, budgetStorage, budgetMapper), PDF (budgetPdf),
                     e visualizar/baixar/compartilhar (budgetFile)
src/utils/           formatadores, validações, busca, link de troca de senha e mensagens de erro
src/constants/       paleta (theme.ts) e dados da oficina (workshop.ts)
supabase/            migrations SQL e testes do banco
docs/                guia de configuração do Supabase
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

Testes automatizados (Jest + Testing Library) cobrem:

- **Formatadores** — máscaras de telefone, placa (antiga/Mercosul), valores em R$, datas
- **Validações** — campos obrigatórios, placa, ano, quantidade, senha e mensagens de erro
- **Formulário** (`useBudgetForm`) — criar, calcular total, destacar erros, salvar e editar orçamentos
- **PDF** — conteúdo, número, total, quebra em várias páginas, validade e nome do arquivo
- **Banco de dados** — o SQL roda num Postgres de verdade ([PGlite](https://pglite.dev)) dentro do teste: numeração, transação, validações, limites, **Row Level Security** e permissões (quem não é da oficina — ou não está logado — não vê nem altera nada)
- **Integração** — conversão banco ↔ app, busca, importação dos orçamentos antigos, link de troca de senha, mensagens de erro

Os testes rodam com fuso fixo (`America/Sao_Paulo`) para darem o mesmo resultado em qualquer máquina.

## Integração contínua

A cada push ou pull request na `master`, o GitHub Actions (`.github/workflows/ci.yml`) roda tipagem, lint, testes e o build do site. Para rodar o mesmo localmente:

```bash
npm run typecheck && npm run lint && npm test && npm run build:web
```

## Publicação

- **Deploy:** [Vercel](https://vercel.com) (`vercel.json`). Cada `git push` na `master` publica uma nova versão.
- **Variáveis:** `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_KEY` ficam em **Vercel → Settings → Environment Variables** (não nos Secrets do GitHub). Ver [docs/supabase.md](docs/supabase.md).
- **Build manual:** `npm run build:web` gera o site estático em `dist/`.
- **No celular:** Android (Chrome): menu ⋮ → *Adicionar à tela inicial*. iPhone (Safari): Compartilhar → *Adicionar à Tela de Início*.

## Pendências conhecidas

- **npm audit:** sobram avisos só nas ferramentas de build do Expo (`@expo/cli`, `zod`), que não vão para o site publicado. A "correção" sugerida pelo npm é voltar para um SDK antigo: ignorar até sair uma versão nova do Expo.
- **Busca sem acento:** "joao" não encontra "João" (a busca diferencia acentos).
