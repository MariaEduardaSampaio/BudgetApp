# Orçamentos — app de orçamentos para oficina mecânica

App (site + Android) para criar orçamentos de oficina de forma simples, pensado para quem tem pouca familiaridade com computador. Nasceu para dar autonomia ao meu pai, que dependia de outras pessoas para montar orçamentos no notebook.

## Funcionalidades

- Cadastro do cliente, veículo e serviços/peças, com máscaras de telefone, placa (Mercosul) e valores em R$
- Total calculado automaticamente
- Data do orçamento e validade (7, 15, 30 dias ou sem validade)
- **PDF no padrão da oficina** (cabeçalho, tabela, total e assinatura), gerado no próprio aparelho com jsPDF — sem internet nem servidor
- Envio do arquivo PDF pelo menu de compartilhamento (WhatsApp, e-mail, Drive...) ou download no navegador
- **Histórico** dos orçamentos salvos no aparelho, com busca por cliente/placa/modelo, reenvio e exclusão

## Stack

Expo (SDK 53) · React Native · TypeScript · expo-router · jsPDF + jspdf-autotable · AsyncStorage

## Estrutura

```
app/(tabs)/          telas (Novo orçamento, Histórico)
src/components/      formulários e componentes de UI (ui/)
src/hooks/           estado e regras do formulário (useBudgetForm)
src/services/        PDF (budgetPdf), arquivo/compartilhamento (budgetFile[.web]) e histórico (budgetStorage)
src/utils/           formatadores e validações
src/constants/       paleta (theme.ts) e dados da oficina exibidos no PDF (workshop.ts)
```

## Rodando em desenvolvimento

```bash
npm install
npx expo start --web
```

## Site (recomendado para começar)

O mesmo código roda como site e pode ser "instalado" no celular:

- **Deploy:** o projeto está pronto para a [Vercel](https://vercel.com) (`vercel.json`). Importe o repositório do GitHub e cada `git push` publica uma nova versão.
- **Build manual:** `npm run build:web` gera o site estático em `dist/`.
- **No iPhone:** abra o site no Safari → Compartilhar → *Adicionar à Tela de Início*. No Android (Chrome): menu ⋮ → *Adicionar à tela inicial*.

> O histórico fica salvo no navegador de cada aparelho. Use sempre pelo ícone da tela de início: no iPhone, sites abertos só pelo Safari podem ter os dados apagados após alguns dias sem uso.

## App Android (opcional)

```bash
npm install -g eas-cli
eas login            # conta gratuita em expo.dev
eas build -p android --profile preview
```

Ao final, o EAS mostra um link/QR code para baixar o `.apk` direto no celular.
