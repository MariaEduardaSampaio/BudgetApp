# Plano de testes do BudgetApp — implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cobrir com testes unitários, de banco e de fluxo completo os cenários reais de uso do app (dois logins na mesma oficina, campos opcionais, placas, histórico, sem internet, login).

**Architecture:** Um Supabase falso em memória substitui `src/services/supabase.ts` e um router falso substitui `expo-router`; o `RootLayout` real e as telas reais são renderizados com `@testing-library/react`, então guards de login, `useAuth`, `budgetStorage`, `budgetMapper` e hooks rodam de verdade. Cenários entre usuários também são confirmados no Postgres real (PGlite) com as migrations.

**Tech Stack:** Jest 29 (`jest-expo/web`), `@testing-library/react`, PGlite, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-26-plano-de-testes-design.md`

## Global Constraints

- Nenhum teste acessa rede ou o Supabase real (`alocar-budgets` é produção). Os testes de fluxo trocam `global.fetch` por uma função que lança `"Rede real proibida nos testes"`.
- Sem dependências novas. `expo-router/testing-library` **não** serve: ele exige `@testing-library/react-native` (não instalado, preset nativo). Por isso o router é simulado (fallback previsto na spec).
- Nomes de `describe`/`it` em português, descrevendo o que o usuário vê. Datas fixas; fuso já fixo em `America/Sao_Paulo` (`jest.global-setup.js`).
- Asserções sobre o que aparece na tela (texto, placeholder, `aria-label`), não sobre chamadas internas, exceto nos unitários de `budgetStorage`.
- **Não alterar código de produção.** Se um teste revelar bug real, marcar com `it.failing(...)` e um comentário `// BUG: ...`, e listar no relatório final para a Maria decidir.
- Os campos de formulário (`Field`) não ligam label ao input: localizar inputs por `placeholder` (ex.: `"Nome do cliente"`, `"(31) 99999-9999"`, `"Rua, número, bairro"`, `"Fiat"`, `"Uno"`, `"2015"`, `"Prata"`, `"Ex.: Troca de óleo e filtro"`, `"R$ 0,00"`; placa: ler o placeholder em `VehicleForm.tsx:33`).
- Rodar tudo com `npm test`; antes do fim de cada tarefa, `npm run typecheck` e `npm run lint` sem erros novos.
- Commits só com autorização da Maria (os passos "Commit" ficam pendentes até ela liberar).

## Review Focus

1. **Toque duplo em "Gerar orçamento"** enquanto salva → só um orçamento criado (Task 4).
2. **Sessão expirada no meio do uso** (`JWT expired` ao salvar) → "Sua sessão expirou. Entre novamente." e o formulário mantém os dados (Task 7).
3. **Busca com caracteres especiais** (`"Silva, (João)"`) digitada na tela → não quebra, filtra pelo texto restante (Task 6).
4. **Resposta de busca antiga chegando depois da nova** → a lista mostra o resultado da busca mais recente (Task 6).
5. **Centavos e quantidade decimal** (1,5 × R$ 90,50 + R$ 180,00 = R$ 315,75) → mesmo total no aviso de "pronto", no histórico e no detalhe (Task 4).

---

### Task 1: Supabase falso em memória

**Files:**
- Create: `src/test-utils/fakeSupabase.ts`
- Test: `src/test-utils/__tests__/fakeSupabase.test.ts`

**Interfaces:**
- Produces:
```ts
export type FakeUser = "pai" | "irmao" | "outraOficina" | "semOficina";
export const FAKE_USERS: Record<FakeUser, { email: string; password: string; workshop: "alocar" | "outra" | null }>;
// pai@teste.com / senha-do-pai → alocar; irmao@teste.com / senha-do-irmao → alocar;
// outra@teste.com / senha-da-outra → outra; sem@teste.com / senha-sem → null
export const fakeDb: {
  reset(): void;                                   // apaga orçamentos, numeração, sessão, falhas e atrasos
  loginAs(user: FakeUser | null): void;            // troca a sessão e emite SIGNED_IN / SIGNED_OUT
  currentUser(): FakeUser | null;
  seed(user: FakeUser, drafts: BudgetDraft[]): Promise<string[]>; // salva em ordem via save_budget como `user`; devolve ids
  rows(workshop: "alocar" | "outra"): BudgetRow[]; // inspeção direta, ignora RLS
  failNext(kind: "network" | "jwt", times?: number): void; // próximas N chamadas (from/rpc/auth) falham
  delayNext(ms: number): void;                     // atrasa só a próxima chamada de from()
};
export const fakeSupabaseModule: {                 // substitui o módulo src/services/supabase.ts inteiro
  supabase: FakeClient; isSupabaseConfigured: true;
  initialAuthRedirect: { isRecovery: false; errorCode: null };
  passwordResetRedirectUrl: () => string;
};
```
- Uso nos testes: `jest.mock("<caminho>/services/supabase", () => require("<caminho>/test-utils/fakeSupabase").fakeSupabaseModule);`

Comportamento que o cliente falso precisa ter (só o que o app usa; ver `budgetStorage.ts` e `useAuth.tsx`):
- `from("budgets").select(cols).order("number",{ascending}).range(a,b).or(filter).eq("id",v).maybeSingle()` e `.delete().eq("id",v)`: builder encadeável e *thenable* que devolve `{ data, error }` no formato `BudgetRow` (com `budget_items`). Aplica a RLS: só linhas da oficina do usuário atual; sem sessão ou sem oficina → lista vazia, delete não apaga nada.
- `.or(filter)`: interpreta o texto de `buildBudgetSearchFilter` — itens separados por vírgula, `col.ilike.<padrão>` (`*` = qualquer coisa, sem diferenciar maiúsc./minúsc., **diferenciando acento**, como o Postgres) e `col.eq.<valor>`; linha passa se qualquer item casar.
- `rpc("save_budget", { budget })`: sem `id` cria com o próximo número da oficina, `created_by` = usuário, `created_at` = `budget.createdAt ?? agora`; com `id` atualiza dados e troca os itens, mantém número e criação, preenche `updated_at`. Erros como o banco: placa fora de `^[A-Z]{3}(-[0-9]{4}|[0-9][A-Z][0-9]{2})$` → `{ code: "23514", message: "... budgets_vehicle_plate_check" }`; sem oficina → `{ code: "P0001", message: "Seu usuário ainda não está vinculado a uma oficina." }`; id de outra oficina → `{ code: "P0001", message: "Orçamento não encontrado." }`. Endereço e cor vazios viram `null`.
- `auth`: `getSession`, `onAuthStateChange` (devolve `{ data: { subscription: { unsubscribe } } }`), `signInWithPassword` (senha errada → `{ error: { message: "Invalid login credentials" } }`), `signOut`, `resetPasswordForEmail`, `updateUser`.
- Falhas: `"network"` → `{ data: null, error: { message: "TypeError: Failed to fetch" } }`; `"jwt"` → `{ data: null, error: { message: "JWT expired" } }`.

- [ ] **Step 1: Escrever os testes do falso** (`describe("Supabase falso")`):
  - `"numera por oficina: pai 1, irmão 2, outra oficina começa em 1"`
  - `"irmão lê o orçamento do pai; outra oficina e sem oficina não leem nada"`
  - `"editar mantém número e criação, troca itens e preenche updated_at"`
  - `"recusa placa inválida com código 23514 e aceita ABC1D23 e ABC-1234"`
  - `"o filtro de busca real acha por nome, modelo, placa sem hífen e número '0007'"` (gera o filtro com `buildBudgetSearchFilter`)
  - `"range e order paginam do maior para o menor número"`
  - `"failNext('network') faz só a próxima chamada falhar"`
- [ ] **Step 2:** `npm test -- src/test-utils` → FAIL (módulo não existe).
- [ ] **Step 3:** Implementar `src/test-utils/fakeSupabase.ts` com as interfaces acima.
- [ ] **Step 4:** `npm test -- src/test-utils` → PASS.
- [ ] **Step 5: Commit** — `test: adiciona Supabase falso em memória para testes`

---

### Task 2: Unitários de `budgetStorage`

**Files:**
- Test: `src/services/__tests__/budgetStorage.test.ts`

**Interfaces:**
- Consumes: `fakeDb`, `fakeSupabaseModule`, `FakeUser` (Task 1); `makeBudget` (`src/test-utils/budgetFactory.ts`); `listBudgets`, `getBudget`, `saveBudget`, `deleteBudget`, `PAGE_SIZE` (`src/services/budgetStorage.ts`).

- [ ] **Step 1: Escrever os testes** (logado como `pai`, `fakeDb.reset()` no `beforeEach`):
  - `listBudgets`: `"devolve do número maior para o menor"`; `"com 30 orçamentos, hasMore é false"`; `"com 31, a primeira página traz 30 e hasMore true; offset 30 traz o último"`; `"aplica a busca no banco"` (3 orçamentos, busca `"gol"` traz só o Gol); `"repassa o erro do banco"` (`failNext("network")` → rejeita com mensagem contendo `"Failed to fetch"`).
  - `getBudget`: `"id que não é UUID devolve null"` (ex.: `"1697040000000"`); `"id inexistente devolve null"`; `"devolve o orçamento com os itens na ordem"`.
  - `saveBudget`: `"novo orçamento volta com id, número e createdAt"`; `"edição volta com updatedAt e o mesmo número"`; `"repassa erro de placa inválida (code 23514)"`.
  - `deleteBudget`: `"some da listagem depois de excluir"`.
- [ ] **Step 2:** `npm test -- budgetStorage` → PASS (o código já existe; se algum falhar, é bug real → regra `it.failing` das Global Constraints).
- [ ] **Step 3: Commit** — `test: cobre listagem, paginação, busca e exclusão do budgetStorage`

---

### Task 3: Unitários de `useAuth`, `budgetFile` e PDF com opcionais vazios

**Files:**
- Test: `src/hooks/__tests__/useAuth.test.tsx`
- Test: `src/services/__tests__/budgetFile.test.ts`
- Modify: `src/services/__tests__/budgetPdf.test.ts` (novo `it`)

**Interfaces:**
- Consumes: Task 1; `AuthProvider`, `useAuth` (`src/hooks/useAuth.tsx`); `viewBudgetPdf`, `downloadBudgetPdf`, `shareBudgetPdf`, `FileResult` (`src/services/budgetFile.ts`); `buildBudgetPdf`, `getBudgetFileName` (`src/services/budgetPdf.ts`).

- [ ] **Step 1: `useAuth`** (`renderHook` com wrapper `AuthProvider`):
  - `"começa carregando e termina deslogado quando não há sessão salva"`
  - `"começa logado quando já existe sessão"` (`loginAs("pai")` antes de renderizar)
  - `"signIn com senha certa cria a sessão; com senha errada rejeita com 'Invalid login credentials'"`
  - `"signOut limpa a sessão"`
  - `"remove espaços do e-mail antes de entrar"` (`" pai@teste.com "` funciona)
- [ ] **Step 2: `budgetFile`** (stubar `URL.createObjectURL`/`revokeObjectURL`, `window.open`, `navigator.canShare`/`share`):
  - `"compartilhar usa navigator.share com o arquivo .pdf quando o navegador suporta"`
  - `"compartilhar cai para download quando o navegador não suporta" → "downloaded"`
  - `"compartilhar cai para download quando o usuário bloqueia (NotAllowedError)"`
  - `"baixar cria um link com o nome de getBudgetFileName"`
- [ ] **Step 3: PDF** — em `budgetPdf.test.ts`: `"gera o PDF só com os campos obrigatórios, sem 'undefined' nem 'null' no texto"` (`makeBudget` com `address: ""`, `color: ""`, `expiresAt: undefined`).
- [ ] **Step 4:** `npm test -- useAuth budgetFile budgetPdf` → PASS.
- [ ] **Step 5: Commit** — `test: cobre login, arquivo do PDF e PDF sem campos opcionais`

---

### Task 4: Router falso, `renderApp` e fluxo de criar orçamento

**Files:**
- Create: `src/test-utils/fakeRouter.tsx`
- Create: `src/test-utils/renderApp.tsx`
- Create: `src/test-utils/budgetFormDriver.ts`
- Test: `src/__tests__/flows/criarOrcamento.test.tsx`

**Interfaces:**
- Consumes: Task 1.
- Produces:
```ts
// fakeRouter.tsx — substitui o módulo "expo-router"
export const fakeRouterModule: {
  Stack: FakeStack;            // Stack, Stack.Screen, Stack.Protected
  useRouter(): { push(to: string | { pathname: string; params?: Record<string,string> }): void;
                 replace(to: ...): void; back(): void; canGoBack(): boolean };
  useLocalSearchParams<T>(): T;  // { id } extraído de /budget/<id>
  useFocusEffect(cb: () => void): void; // roda ao montar e quando cb muda
};
export const fakeNav: { reset(path?: string): void; path(): string };
// renderApp.tsx
export function renderApp(startPath?: "/" | "/history" | "/login" | `/budget/${string}`): RenderResult & { path(): string };
// budgetFormDriver.ts
export interface FormData { name: string; phone: string; address?: string; brand: string; model: string;
  plate: string; year: string; color?: string; items: { description: string; quantity?: string; price: string }[] }
export function fillBudgetForm(data: Partial<FormData>): void;  // digita pelos placeholders; adiciona itens pelo botão "Adicionar serviço ou peça"
export const VALID_FORM: FormData; // só obrigatórios: "Cliente Teste", "31987654321", "Fiat", "Uno", "ABC1D23", "2010", 1 item "Troca de óleo" "18000"
```
Comportamento do router falso: o `RootLayout` real (`app/_layout.tsx`) é renderizado; `Stack` registra os `Stack.Screen` com `name` permitidos pelos `Stack.Protected` (guard verdadeiro) e renderiza a tela da rota atual: `"(tabs)"` para `/` (`app/(tabs)/index.tsx`) e `/history` (`app/(tabs)/history.tsx`), ambos com `<AccountButton />` acima (como o `headerRight` de `app/(tabs)/_layout.tsx`); `"budget/[id]"`, `"login"`, `"forgot-password"`, `"reset-password"` pelos arquivos de `app/`. Se a rota atual não estiver permitida, vai para a primeira permitida (`/` ou `/login`), como o expo-router. `Stack.Screen` sem `name` (usado dentro de `budget/[id].tsx` para opções) não renderiza nada. Navegar desmonta a tela anterior (o histórico recarrega ao voltar). `renderApp` também troca `global.fetch` pela função que lança `"Rede real proibida nos testes"`.

- [ ] **Step 1: Escrever `criarOrcamento.test.tsx`** (`loginAs("pai")`, `renderApp("/")`):
  - `"salva só com os obrigatórios e o orçamento abre com os opcionais em branco"` — `fillBudgetForm(VALID_FORM)`, clicar `"Gerar orçamento"` → aparece `"Orçamento Nº 0001 pronto!"`; ir para `/history` → card `"Abrir orçamento 0001 de Cliente Teste"`; abrir → mostra `"Nome"`, `"Telefone"`, `"Placa"`, e **não** mostra `"Endereço"` nem `"Cor"`; botões `"Visualizar PDF"`/`"Compartilhar PDF"` presentes (conferir os rótulos em `BudgetActions.tsx`).
  - `"salva com todos os campos e mostra tudo igual ao digitado"` — endereço `"Rua das Flores, 10"`, cor `"Prata"`, 2 itens; detalhe mostra cada valor, cada item e o total.
  - `"aceita placa Mercosul e placa antiga"` — dois orçamentos: `"abc1d23"` → `"ABC1D23"` e `"abc1234"` → `"ABC-1234"` no detalhe.
  - `"não salva com obrigatório faltando e avisa"` — sem nome → `"Faltam algumas informações"`; `fakeDb.rows("alocar")` vazio.
  - Review Focus 1: `"tocar duas vezes em Gerar orçamento cria um só"` — dois cliques seguidos → `fakeDb.rows("alocar")` com 1 linha.
  - Review Focus 5: `"centavos e quantidade decimal dão o mesmo total em todas as telas"` — itens `1 × R$ 180,00` e `1,5 × R$ 90,50` → `"R$ 315,75"` no aviso, no card do histórico e no detalhe.
- [ ] **Step 2:** `npm test -- flows/criarOrcamento` → FAIL (helpers não existem).
- [ ] **Step 3:** Implementar `fakeRouter.tsx`, `renderApp.tsx`, `budgetFormDriver.ts`.
- [ ] **Step 4:** `npm test -- flows/criarOrcamento` → PASS.
- [ ] **Step 5: Commit** — `test: fluxo completo de criar orçamento`

---

### Task 5: Fluxo da oficina compartilhada (dois logins)

**Files:**
- Test: `src/__tests__/flows/oficinaCompartilhada.test.tsx`

**Interfaces:**
- Consumes: Tasks 1 e 4 (`fakeDb.loginAs`, `fakeDb.seed`, `renderApp`, `fillBudgetForm`, `VALID_FORM`).

Trocar de login = `act(() => fakeDb.loginAs("irmao"))` com o app montado (o `useAuth` recebe o evento), depois navegar.

- [ ] **Step 1: Escrever os testes:**
  - `"o irmão vê o orçamento criado pelo pai com todos os dados"` — pai cria pela tela com todos os campos; troca para irmão; histórico mostra o card; detalhe mostra cliente, telefone, endereço, marca, modelo, ano, cor, placa, itens e total.
  - `"a edição do irmão aparece para o pai"` — pai cria; irmão abre, `"Editar orçamento"`, troca telefone e descrição do item, `"Salvar"`; troca para pai; detalhe mostra os novos valores e o mesmo `"ORÇAMENTO Nº 0001"`.
  - `"o que um exclui some para o outro"` — pai exclui (`"Excluir orçamento"` → `"Excluir"`); irmão: histórico `"Nenhum orçamento ainda"`; `renderApp("/budget/<id>")` → `"Orçamento não encontrado"`.
  - `"a numeração é compartilhada: pai 0001, irmão 0002, pai 0003"`.
  - `"outra oficina não vê nada da Alocar"` — `seed("pai", 3 orçamentos)`; `loginAs("outraOficina")`: histórico vazio; link direto → `"Orçamento não encontrado"`.
- [ ] **Step 2:** `npm test -- flows/oficinaCompartilhada` → PASS.
- [ ] **Step 3: Commit** — `test: fluxos de dois logins na mesma oficina`

---

### Task 6: Fluxo do histórico — paginação e busca

**Files:**
- Test: `src/__tests__/flows/historico.test.tsx`

**Interfaces:**
- Consumes: Tasks 1 e 4; `makeBudget` para gerar drafts (`fakeDb.seed`).

A busca tem atraso de 350 ms (`SEARCH_DELAY_MS`): usar `findBy...`/`waitFor` com `timeout: 2000` ou `jest.useFakeTimers()` + `advanceTimersByTime(350)`.

- [ ] **Step 1: Escrever os testes** (placeholder da busca: `"Buscar por cliente, placa ou número"`; botão `"Carregar mais"`):
  - `"30 orçamentos: mostra todos e não tem Carregar mais"`.
  - `"31 orçamentos: Carregar mais traz o mais antigo"` — antes: Nº 0031…0002; depois: aparece Nº 0001 e o botão some.
  - `"61 orçamentos: três páginas sem repetir nem pular, do mais novo ao mais antigo"` — coletar os números exibidos e comparar com `61..1`.
  - `"busca por nome, modelo, placa com e sem hífen e número"` — casos: `"Joana"`, `"Gol"`, `"ABC1234"` e `"abc-1234"`, `"7"` e `"0007"`.
  - `"busca com mais de 30 resultados pagina só dentro dos resultados"` — 35 com modelo `"Gol"` + 5 `"Uno"`; busca `"gol"` → 30 + Carregar mais → 35, nenhum Uno.
  - `"busca sem resultado mostra Nada encontrado; limpar volta à lista"`.
  - `"busca guarda acento e apóstrofo: acha \"Joana D'Arc\" e \"João\""`.
  - `"limitação conhecida: 'joao' não acha 'João'"` — confere o comportamento atual; comentário apontando o README (inverter quando corrigido).
  - Review Focus 3: `"caracteres especiais na busca não quebram: 'Silva, (João)' acha 'João Silva'"`.
  - Review Focus 4: `"resposta atrasada de uma busca antiga não sobrescreve a nova"` — `delayNext(1000)` antes de buscar `"gol"`, depois buscar `"uno"`; ao fim só Unos na tela.
- [ ] **Step 2:** `npm test -- flows/historico` → PASS.
- [ ] **Step 3: Commit** — `test: paginação e busca do histórico`

---

### Task 7: Fluxos sem internet

**Files:**
- Test: `src/__tests__/flows/semInternet.test.tsx`

**Interfaces:**
- Consumes: Tasks 1 e 4 (`fakeDb.failNext`).

Mensagem esperada em todos: `"Sem conexão com a internet. Verifique e tente de novo."`

- [ ] **Step 1: Escrever os testes:**
  - `"salvar sem internet avisa e mantém o que foi digitado; com a rede de volta salva"` — `failNext("network")`, gerar → diálogo `"Não foi possível salvar"` com a mensagem; `"Fechar"`; inputs ainda com os valores; gerar de novo → `"Orçamento Nº 0001 pronto!"`.
  - `"histórico sem internet mostra o erro e Tentar de novo, não lista vazia"` — `"Não foi possível carregar"` + mensagem; **não** aparece `"Nenhum orçamento ainda"`; `"Tentar de novo"` carrega a lista.
  - `"Carregar mais sem internet avisa e mantém os já carregados"` — 31 orçamentos; `failNext` antes do clique. Conferir o que a tela faz hoje (a lista some porque `data={loadError ? [] : budgets}`): se os 30 sumirem, é bug real → `it.failing` + relatório.
  - `"abrir orçamento sem internet mostra o erro e Tentar de novo"`.
  - `"excluir sem internet avisa e não exclui"` — mensagem no diálogo; `fakeDb.rows("alocar")` mantém a linha.
  - `"entrar sem internet avisa"` — na tela de login.
  - Review Focus 2: `"sessão expirada ao salvar avisa e mantém os dados"` — `failNext("jwt")` → `"Sua sessão expirou. Entre novamente."`; inputs preservados.
- [ ] **Step 2:** `npm test -- flows/semInternet` → PASS (ou `it.failing` documentado).
- [ ] **Step 3: Commit** — `test: comportamento sem internet e com sessão expirada`

---

### Task 8: Fluxos de login e proteção das telas

**Files:**
- Test: `src/__tests__/flows/login.test.tsx`

**Interfaces:**
- Consumes: Tasks 1 e 4.

- [ ] **Step 1: Escrever os testes** (inputs por placeholder `"seu@email.com"` e `"Sua senha"`, botão `"Entrar"`):
  - `"senha errada mostra 'E-mail ou senha incorretos.'"`.
  - `"login certo leva ao formulário de novo orçamento"` — aparece `"Gerar orçamento"`.
  - `"Sair volta para o login"` — `"Conta"` → `"Sair"` → aparece `"Entrar"`.
  - `"sem login, abrir /history ou /budget/<id> leva ao login"`.
  - `"usuário sem oficina entra, mas ao gerar vê 'Seu usuário ainda não está vinculado a uma oficina.'"`.
- [ ] **Step 2:** `npm test -- flows/login` → PASS.
- [ ] **Step 3: Commit** — `test: fluxos de login, logout e telas protegidas`

---

### Task 9: Cenários entre usuários no banco real (PGlite)

**Files:**
- Modify: `supabase/__tests__/schema.test.ts` (novo `describe("cenários da oficina compartilhada")` reaproveitando `as`, `save`, `getBudget`, `budgetJson`, `USERS`)

**Interfaces:**
- Consumes: helpers existentes do próprio arquivo.

- [ ] **Step 1: Escrever os testes:**
  - `"irmão lê o orçamento do pai com todos os campos e itens iguais"`.
  - `"edição do irmão aparece para o pai, com o mesmo número e updated_at"`.
  - `"exclusão do pai some para o irmão"`.
  - `"salva só com obrigatórios: endereço e cor ficam null, validade null"` (`address: ""`, `color: ""`, `expiresAt: null`).
  - `"aceita ABC1D23 e ABC-1234; recusa abc1d23, ABC1234 e ABC-1D23"` (recusa com code `23514`).
  - `"guarda acento e apóstrofo sem alterar: \"Joana D'Arc\", \"João\""`.
  - `"orçamento editado pelo irmão continua invisível para outra oficina"`.
- [ ] **Step 2:** `npm test -- supabase` → PASS.
- [ ] **Step 3: Commit** — `test: cenários de dois usuários da mesma oficina no banco`

---

### Task 10: Componentes — só o que os fluxos não cobrem

**Files:**
- Test: `src/components/__tests__/ServicesList.test.tsx`
- Test: `src/components/__tests__/DatesForm.test.tsx`

**Interfaces:**
- Consumes: os componentes com props reais (ler as `Props` de cada arquivo).

- [ ] **Step 1: Escrever os testes:**
  - `ServicesList`: `"esconde Adicionar ao chegar no limite de itens e mostra 'Limite de N itens por orçamento.'"` (usar `MAX_SERVICES`); `"Remover item 2 chama a remoção do índice 1"`; `"não mostra Remover quando há um só item"` (conferir o comportamento atual antes de afirmar).
  - `DatesForm`: `"escolher 'Sem validade' esconde a data de validade"`; `"mostra a data do orçamento no formato dd/mm/aaaa"`.
- [ ] **Step 2:** `npm test -- components` → PASS.
- [ ] **Step 3:** Rodar a suíte inteira, `npm run typecheck`, `npm run lint` → tudo verde.
- [ ] **Step 4: Commit** — `test: componentes de itens e datas`

---

## Relatório final (ao terminar)

Listar para a Maria: número de testes antes/depois, cada `it.failing` com o bug que ele documenta, e qualquer cenário da spec que não pôde ser testado e por quê.
