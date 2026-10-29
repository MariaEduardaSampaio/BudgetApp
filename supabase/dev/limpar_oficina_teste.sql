-- =============================================================================
-- Apaga TODOS os orçamentos da Oficina Teste e zera a numeração
--
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo → Run.
-- Só mexe na oficina chamada 'Oficina Teste'. Os itens saem junto (on delete cascade).
-- A oficina, o usuário de teste e o vínculo entre eles continuam.
-- =============================================================================

do $$
declare
    v_workshop uuid;
    v_deleted  integer;
begin
    select id into v_workshop from public.workshops where name = 'Oficina Teste';
    if v_workshop is null then
        raise exception 'Não encontrei a oficina "Oficina Teste".';
    end if;

    delete from public.budgets where workshop_id = v_workshop;
    get diagnostics v_deleted = row_count;

    update public.workshops set last_budget_number = 0 where id = v_workshop;

    raise notice '% orçamento(s) apagado(s). O próximo será o Nº 0001.', v_deleted;
end $$;

-- Conferência: deve mostrar 0 orçamentos e numeração 0 na Oficina Teste.
select w.name as oficina,
       w.last_budget_number as ultimo_numero,
       (select count(*) from public.budgets b where b.workshop_id = w.id) as orcamentos
  from public.workshops w
 order by w.name;
