-- =============================================================================
-- Desempenho das regras de acesso (RLS)
--
-- Antes, as políticas chamavam public.is_workshop_member(workshop_id) para cada
-- linha: o banco lia os orçamentos de todas as oficinas, chamava a função linha
-- por linha e só depois descartava os que não eram da oficina do usuário.
--
-- Agora a política diz "workshop_id está entre as oficinas do usuário". Assim o
-- banco descobre as oficinas uma vez e lê só os orçamentos delas, pelo índice
-- budgets_workshop_number_idx. (select auth.uid()) entre parênteses faz o
-- Supabase calcular o usuário uma vez por consulta, e não por linha.
--
-- As regras continuam as mesmas: cada usuário só vê e exclui orçamentos das
-- oficinas das quais é membro. A save_budget não muda.
-- =============================================================================

drop policy "Usuário vê os próprios vínculos" on public.workshop_members;
create policy "Usuário vê os próprios vínculos"
    on public.workshop_members for select to authenticated
    using (user_id = (select auth.uid()));

drop policy "Membros veem os orçamentos da oficina" on public.budgets;
create policy "Membros veem os orçamentos da oficina"
    on public.budgets for select to authenticated
    using (workshop_id in (
        select wm.workshop_id from public.workshop_members wm where wm.user_id = (select auth.uid())
    ));

drop policy "Membros excluem orçamentos da oficina" on public.budgets;
create policy "Membros excluem orçamentos da oficina"
    on public.budgets for delete to authenticated
    using (workshop_id in (
        select wm.workshop_id from public.workshop_members wm where wm.user_id = (select auth.uid())
    ));

-- Os itens seguem o orçamento: dá para ver o item se dá para ver o orçamento
-- (a consulta em budgets já passa pela política acima).
drop policy "Membros veem os itens dos orçamentos da oficina" on public.budget_items;
create policy "Membros veem os itens dos orçamentos da oficina"
    on public.budget_items for select to authenticated
    using (budget_id in (select b.id from public.budgets b));
