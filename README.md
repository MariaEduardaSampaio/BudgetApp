# Orçamentos — site de orçamentos para oficina mecânica

[![CI](https://github.com/MariaEduardaSampaio/BudgetApp/actions/workflows/ci.yml/badge.svg)](https://github.com/MariaEduardaSampaio/BudgetApp/actions/workflows/ci.yml)

Site (instalável no celular) para criar orçamentos de oficina de forma simples, pensado para quem tem pouca familiaridade com computador. Nasceu para dar autonomia ao meu pai, que dependia de outras pessoas para montar orçamentos no notebook.

## Funcionalidades

- Cadastro do cliente, veículo e serviços/peças, com máscaras de telefone, valores em R$ e placa (formato antigo `ABC-1234` ou Mercosul `ABC1D23`)
- Total calculado automaticamente
- Data do orçamento e validade (7, 15, 30 dias ou sem validade)
- **PDF no padrão da oficina** (cabeçalho, tabela, total e assinatura), gerado no navegador com jsPDF
- Visualizar, baixar ou compartilhar o PDF (WhatsApp, e-mail, Drive...)
- **Histórico** com busca por cliente/placa/modelo; cada orçamento pode ser aberto, editado e excluído

## Stack

Expo (SDK 53) / React Native Web · TypeScript · expo-router · jsPDF + jspdf-autotable · AsyncStorage

## Estrutura

```
app/(tabs)/          telas principais (Novo orçamento, Histórico)
app/budget/[id].tsx  visualização e edição de um orçamento
src/components/      formulários e componentes de UI (ui/)
src/hooks/           estado e regras do formulário (useBudgetForm)
src/services/        PDF (budgetPdf), visualizar/baixar/compartilhar (budgetFile) e histórico (budgetStorage)
src/utils/           formatadores e validações
src/constants/       paleta (theme.ts) e dados da oficina (workshop.ts)
public/              index.html, manifest e ícones do site
```

## Rodando em desenvolvimento

```bash
npm install
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
- **PDF** — conteúdo, total, quebra em várias páginas, validade e nome do arquivo
- **Histórico** — salvar, atualizar, buscar e excluir

Os testes rodam com fuso fixo (`America/Sao_Paulo`) para darem o mesmo resultado em qualquer máquina.

## Integração contínua

A cada push ou pull request na `master`, o GitHub Actions (`.github/workflows/ci.yml`) roda tipagem, lint, testes e o build do site. Para rodar o mesmo localmente:

```bash
npm run typecheck && npm run lint && npm test && npm run build:web
```

## Publicação

- **Deploy:** o projeto está pronto para a [Vercel](https://vercel.com) (`vercel.json`). Importe o repositório do GitHub e cada `git push` publica uma nova versão.
- **Build manual:** `npm run build:web` gera o site estático em `dist/`.
- **No celular:** Android (Chrome): menu ⋮ → *Adicionar à tela inicial*. iPhone (Safari): Compartilhar → *Adicionar à Tela de Início*.

> Por enquanto o histórico fica salvo no navegador de cada aparelho. Use sempre pelo ícone da tela de início.
