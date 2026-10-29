# Plano de testes do BudgetApp — design

Data: 26/10/2026

## Intenção

O app é usado no dia a dia por duas pessoas da mesma oficina (o pai e o irmão da Maria). Os testes devem dar segurança de que os cenários reais de uso funcionam: criar orçamento com campos opcionais vazios, os dois logins verem e editarem os orçamentos um do outro, placas nos dois formatos, histórico com busca e paginação, e mensagens claras quando a internet cai. Hoje há ~100 testes, mas eles cobrem funções isoladas e o banco; nenhuma tela e nenhum fluxo completo é testado.

## Objetivos

- Preencher as lacunas de testes unitários (lista abaixo).
- Criar testes de fluxo completo que renderizam as telas reais e simulam o uso (digitar, tocar em botões, trocar de login).
- Cobrir os cenários pedidos pela Maria (seção "Catálogo de cenários").
- Tudo rodando com `npm test`, offline, no CI atual, sem configuração extra.

## Não-objetivos

- Testar contra um Supabase de verdade (local com Docker ou o projeto na nuvem). Decisão da Maria: só simulação.
- Testes de navegador real (Playwright/Cypress).
- Testar se o site abre sem internet (depende do navegador/cache, não do código).
- Corrigir bugs conhecidos (busca sensível a acento, cabeçalho do PDF fixo). Os testes podem documentá-los, mas a correção é outra tarefa.

## Anti-objetivos (seria fracasso mesmo funcionando)

- **Qualquer teste que acesse o Supabase real.** O projeto `alocar-budgets` é produção e guarda os dados reais da Oficina Alocar. A simulação precisa garantir isso: o cliente do Supabase é substituído em todos os testes de fluxo.
- Testes instáveis (dependem de horário, ordem ou rede). O fuso já é fixo em `jest.global-setup.js`; datas devem ser fixas.
- Testes que só repetem a implementação (ex.: conferir que uma função foi chamada com a string exata) em vez de conferir o que o usuário vê.

## Restrições e convenções do projeto

- Jest 29 com preset `jest-expo/web`, `@testing-library/react`, PGlite para o banco. Não adicionar dependências novas se der para evitar; `expo-router/testing-library` já está instalado.
- Nomes de `describe`/`it` em português, descrevendo o comportamento ("mantém o que foi digitado quando a internet cai").
- Reaproveitar `src/test-utils/budgetFactory.ts` e o padrão de usuários do `supabase/__tests__/schema.test.ts` (`pai`, `irmao`, `outraOficina`, `semOficina`).
- Testes perto do código: `__tests__/` ao lado do arquivo; fluxos completos em uma pasta própria (sugestão: `src/__tests__/flows/`).

## Abordagem: três camadas

### 1. Unitários (lacunas)

| Alvo | O que testar |
|---|---|
| `src/services/budgetStorage.ts` | `listBudgets`: ordem por número desc, páginas de 30, `hasMore` com 30/31 registros, `offset`, busca aplicada; `getBudget`: id que não é UUID devolve `null` sem chamar o banco, não encontrado devolve `null`; `saveBudget`: devolve o orçamento recarregado, erro se não conseguir recarregar; `deleteBudget`; todos repassam o erro do banco. |
| `src/services/budgetFile.ts` | Visualizar/baixar/compartilhar: nome do arquivo, fallback quando o navegador não suporta compartilhar. |
| `src/hooks/useAuth.tsx` | Estado inicial (carregando → logado/deslogado), reage a login/logout, sessão expirada. |
| `src/services/budgetPdf.ts` | PDF de orçamento só com campos obrigatórios (sem endereço, cor, validade) gera sem erro e sem "undefined"/"null" no texto. |
| Componentes (`ServicesList`, `DatesForm`, `VehicleForm`, `BudgetActions`) | Só o comportamento que não é coberto pelos fluxos: adicionar/remover item, "Sem validade", máscara de placa nos dois formatos. |

### 2. Banco (PGlite, `supabase/__tests__/`)

Acrescentar aos testes existentes, no mesmo arquivo ou num novo arquivo de cenários que reaproveite os stubs:

- Pai cria → irmão lê o orçamento com **todos** os campos e itens iguais.
- Irmão edita → pai lê a versão editada (itens trocados, `updated_at` preenchido, número mantido).
- Pai exclui → irmão não encontra mais.
- Orçamento só com campos obrigatórios é salvo; opcionais ficam nulos/vazios.
- Placa Mercosul (`ABC1D23`) e antiga (`ABC-1234`) são aceitas; formato inválido é recusado.
- Nomes com acento e apóstrofo ("Joana D'Arc", "João") são gravados e lidos sem alteração.
- Outra oficina não vê nenhum desses orçamentos (parte já existe; garantir também para orçamentos editados pelo irmão).

### 3. Fluxos completos (telas + Supabase simulado)

**Supabase simulado (peça central).** Um cliente falso em memória, colocado no lugar de `src/services/supabase.ts` via `jest.mock`, que implementa só o que o app usa:

- `auth`: `getSession`, `onAuthStateChange`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `updateUser`. Um helper `loginAs("pai" | "irmao" | "outraOficina")` troca o usuário atual.
- `from("budgets")`: `select`, `order`, `range`, `or`, `eq`, `maybeSingle`, `delete`, com a regra da RLS (só a oficina do usuário atual).
- `rpc("save_budget")`: cria (número sequencial por oficina) ou atualiza, guardando autor e datas.
- `or(filtro)`: interpreta o texto gerado pelo `buildBudgetSearchFilter` real (`col.ilike.*termo*` e `number.eq.N`), para que a busca seja testada de verdade e não só como texto.
- `failNextRequest("network")`: faz a próxima chamada falhar com `TypeError("Failed to fetch")`, simulando queda de internet.

Assim o código real de `budgetStorage`, `budgetMapper`, `useAuth`, hooks e telas roda inteiro; só a rede é trocada.

**Renderização.** Telas renderizadas com o router de verdade (`expo-router/testing-library`, `renderRouter`), interagindo como usuário: digitar nos campos, tocar em "Salvar", abrir o histórico, tocar em um orçamento.

## Catálogo de cenários (fluxos)

**Criar**
1. Preencher só os obrigatórios e salvar → sucesso, aparece no topo do histórico, abre com os campos opcionais em branco, PDF gerado.
2. Preencher tudo e salvar → ao abrir, todos os dados aparecem iguais ao digitado (cliente, veículo, itens, total, datas).
3. Placa Mercosul e placa antiga → as duas salvam, aparecem formatadas no histórico e no nome do PDF.
4. Faltando obrigatório → não salva e mostra os campos com erro (já coberto no hook; aqui só confirmar na tela).

**Oficina compartilhada (dois logins)**
5. Pai cria → `loginAs("irmao")` → irmão vê o orçamento no histórico e abre com todos os dados.
6. Irmão edita (troca um item e o telefone) → `loginAs("pai")` → pai vê a versão editada; número continua o mesmo.
7. Pai exclui → irmão não vê mais no histórico; abrir o link direto mostra "não encontrado".
8. Numeração: pai cria Nº 1, irmão cria Nº 2, pai cria Nº 3.
9. `loginAs("outraOficina")` → histórico vazio; link direto para orçamento da Alocar mostra "não encontrado".

**Histórico: paginação e busca**
10. 30 orçamentos → nenhum botão de carregar mais. 31 → carrega mais traz 1. 61 → três páginas, sem repetir nem pular, do mais novo para o mais antigo.
11. Busca por nome, modelo, placa (com e sem hífen) e número ("7", "0007").
12. Busca + paginação: termo com mais de 30 resultados pagina só dentro dos resultados.
13. Busca sem resultados mostra o estado vazio; limpar a busca volta à lista completa.
14. Busca "joao" não acha "João": documenta a limitação conhecida (ver "Decisões").

**Sem internet**
15. Salvar com queda de rede → mensagem "Sem conexão com a internet. Verifique e tente de novo." e **o que foi digitado continua no formulário**; tentar de novo com a rede de volta salva.
16. Abrir o histórico sem rede → mensagem de erro (não lista vazia).
17. Carregar mais sem rede → mensagem, e os orçamentos já carregados continuam na tela.
18. Abrir orçamento, excluir e entrar (login) sem rede → mensagem correta, nada excluído.

**Login**
19. Senha errada → "E-mail ou senha incorretos."; login correto leva ao formulário; sair volta para o login.
20. Sem login, tentar abrir o histórico ou um orçamento → vai para o login.

## Decisões tomadas por mim (Claude) — confira

- **Simular no nível do cliente do Supabase**, não do `budgetStorage`, para que o máximo de código real rode nos fluxos.
- **O simulado interpreta o filtro de busca real**, em vez de reimplementar a busca. Se o simulado e o PostgREST discordarem em algum caso, o teste de banco (camada 2) é a referência.
- **Limitação de acento (cenário 14)**: o teste confere o comportamento atual e tem um comentário apontando o README; quando a busca for corrigida, o teste é invertido.
- **Edição ao mesmo tempo pelos dois** não entra no plano: hoje vale a última gravação e não há aviso; testar isso só faz sentido se houver uma decisão de produto.
- Os arquivos de `supabase/dev/` (seed e limpeza) não são usados pelos testes.

## Deixado para quem implementar

- Organização exata dos arquivos e helpers do simulado.
- Se `renderRouter` não funcionar bem com alguma tela, renderizar a tela isolada com o router simulado, mantendo o mesmo cenário.
- Quantidade de testes de componente: só o que os fluxos não cobrem.
- Ordem de implementação sugerida: Supabase simulado → unitários de `budgetStorage` → fluxos (criar → compartilhada → histórico → sem internet → login) → banco → componentes restantes.
