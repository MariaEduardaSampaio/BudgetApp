-- =============================================================================
-- Endurecimento de segurança e limites
--
-- 1. Escritas só pela função save_budget (que valida tudo e confere a oficina):
--    o site não insere nem altera linhas direto nas tabelas. Assim ninguém
--    consegue mudar o número de um orçamento ou forjar quem o criou.
-- 2. Visitantes sem login (anon) não têm nenhum acesso às tabelas
--    (antes a RLS já bloqueava; agora nem a permissão existe).
-- 3. Funções auxiliares só ficam disponíveis para quem precisa delas.
-- 4. Limites de tamanho nos textos e na quantidade de itens.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1 e 2. Privilégios das tabelas
-- Ficam só: select (filtrado pela RLS) e delete de orçamentos (os itens saem
-- junto pelo "on delete cascade").
-- -----------------------------------------------------------------------------

revoke all on public.workshops, public.workshop_members, public.budgets, public.budget_items from anon;

revoke insert, update, delete, truncate, references, trigger
    on public.workshops, public.workshop_members, public.budget_items
  from authenticated;

revoke insert, update, truncate, references, trigger on public.budgets from authenticated;

-- Políticas explícitas para o que continua permitido.
drop policy "Membros acessam os orçamentos da oficina" on public.budgets;

create policy "Membros veem os orçamentos da oficina"
    on public.budgets for select to authenticated
    using (public.is_workshop_member(workshop_id));

create policy "Membros excluem orçamentos da oficina"
    on public.budgets for delete to authenticated
    using (public.is_workshop_member(workshop_id));

drop policy "Membros acessam os itens dos orçamentos da oficina" on public.budget_items;

create policy "Membros veem os itens dos orçamentos da oficina"
    on public.budget_items for select to authenticated
    using (exists (
        select 1 from public.budgets b
         where b.id = budget_id and public.is_workshop_member(b.workshop_id)
    ));

-- -----------------------------------------------------------------------------
-- 3. Funções auxiliares
-- (Triggers não precisam de permissão de execute para disparar.)
-- -----------------------------------------------------------------------------

revoke execute on function public.is_workshop_member(uuid) from public, anon;
grant execute on function public.is_workshop_member(uuid) to authenticated;

revoke execute on function public.set_budget_number() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Limites de tamanho (os mesmos campos do formulário têm maxLength no site)
-- -----------------------------------------------------------------------------

alter table public.budgets
    add constraint budgets_client_name_length    check (char_length(client_name) <= 120),
    add constraint budgets_client_phone_length   check (char_length(client_phone) <= 20),
    add constraint budgets_client_address_length check (char_length(client_address) <= 200),
    add constraint budgets_vehicle_brand_length  check (char_length(vehicle_brand) <= 60),
    add constraint budgets_vehicle_model_length  check (char_length(vehicle_model) <= 60),
    add constraint budgets_vehicle_color_length  check (char_length(vehicle_color) <= 40);

alter table public.budget_items
    add constraint budget_items_description_length check (char_length(description) <= 500);

-- -----------------------------------------------------------------------------
-- save_budget passa a ser a única porta de escrita.
--
-- security definer: roda com as permissões do dono das tabelas (que o site não
-- tem mais), então ela mesma confere login e oficina antes de gravar.
-- -----------------------------------------------------------------------------

create or replace function public.save_budget(budget jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id       uuid := nullif(budget ->> 'id', '')::uuid;
    v_items    integer := jsonb_array_length(coalesce(budget -> 'services', '[]'::jsonb));
    v_workshop uuid;
begin
    if auth.uid() is null then
        raise exception 'Faça login para salvar orçamentos.';
    end if;

    if v_items = 0 then
        raise exception 'O orçamento precisa ter pelo menos um item.';
    end if;

    if v_items > 100 then
        raise exception 'O orçamento pode ter no máximo 100 itens.';
    end if;

    if v_id is null then
        select workshop_id into v_workshop
          from public.workshop_members
         where user_id = auth.uid()
         order by created_at
         limit 1;

        if v_workshop is null then
            raise exception 'Seu usuário ainda não está vinculado a uma oficina.';
        end if;

        insert into public.budgets (
            workshop_id, client_name, client_phone, client_address,
            vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year,
            budget_date, expires_at, created_at, created_by
        ) values (
            v_workshop,
            budget #>> '{client,name}',
            budget #>> '{client,phone}',
            nullif(budget #>> '{client,address}', ''),
            budget #>> '{vehicle,brand}',
            budget #>> '{vehicle,model}',
            budget #>> '{vehicle,licensePlate}',
            nullif(budget #>> '{vehicle,color}', ''),
            (budget #>> '{vehicle,year}')::integer,
            (budget ->> 'date')::timestamptz,
            (budget ->> 'expiresAt')::timestamptz,
            -- Mantém a data original ao importar orçamentos antigos (nunca no futuro).
            least(coalesce((budget ->> 'createdAt')::timestamptz, now()), now()),
            auth.uid()
        )
        returning id into v_id;
    else
        update public.budgets set
            client_name    = budget #>> '{client,name}',
            client_phone   = budget #>> '{client,phone}',
            client_address = nullif(budget #>> '{client,address}', ''),
            vehicle_brand  = budget #>> '{vehicle,brand}',
            vehicle_model  = budget #>> '{vehicle,model}',
            vehicle_plate  = budget #>> '{vehicle,licensePlate}',
            vehicle_color  = nullif(budget #>> '{vehicle,color}', ''),
            vehicle_year   = (budget #>> '{vehicle,year}')::integer,
            budget_date    = (budget ->> 'date')::timestamptz,
            expires_at     = (budget ->> 'expiresAt')::timestamptz,
            updated_at     = now()
        where id = v_id
          and public.is_workshop_member(workshop_id)
        returning id into v_id;

        -- Sem linha atualizada: não existe ou é de outra oficina.
        if v_id is null then
            raise exception 'Orçamento não encontrado.';
        end if;

        delete from public.budget_items where budget_id = v_id;
    end if;

    insert into public.budget_items (budget_id, position, description, quantity, unit_price)
    select v_id,
           (item.ord - 1)::integer,
           item.value ->> 'description',
           (item.value ->> 'quantity')::numeric,
           (item.value ->> 'price')::numeric
      from jsonb_array_elements(budget -> 'services') with ordinality as item (value, ord);

    return v_id;
end;
$$;

revoke execute on function public.save_budget(jsonb) from public, anon;
grant execute on function public.save_budget(jsonb) to authenticated;
