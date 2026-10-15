-- =============================================================================
-- Orçamentos da oficina — esquema inicial
--
-- Modelo:
--   workshops          oficina (hoje só a Alocar, mas o modelo já aceita várias)
--   workshop_members   quem pode acessar cada oficina (usuários do Supabase Auth)
--   budgets            orçamentos, numerados em sequência por oficina
--   budget_items       serviços/peças de cada orçamento
--
-- Segurança: Row Level Security em todas as tabelas — cada usuário só enxerga
-- dados das oficinas das quais é membro.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------

create table public.workshops (
    id                 uuid primary key default gen_random_uuid(),
    name               text not null check (char_length(trim(name)) > 0),
    -- Último número de orçamento usado; incrementado pelo trigger set_budget_number.
    last_budget_number integer not null default 0,
    created_at         timestamptz not null default now()
);

create table public.workshop_members (
    workshop_id uuid not null references public.workshops (id) on delete cascade,
    user_id     uuid not null references auth.users (id) on delete cascade,
    created_at  timestamptz not null default now(),
    primary key (workshop_id, user_id)
);

create table public.budgets (
    id             uuid primary key default gen_random_uuid(),
    workshop_id    uuid not null references public.workshops (id) on delete cascade,
    number         integer not null,

    client_name    text not null check (char_length(trim(client_name)) > 0),
    client_phone   text not null,
    client_address text,

    vehicle_brand  text not null check (char_length(trim(vehicle_brand)) > 0),
    vehicle_model  text not null check (char_length(trim(vehicle_model)) > 0),
    -- Formato antigo (ABC-1234) ou Mercosul (ABC1D23) — mesma regra do app.
    vehicle_plate  text not null check (vehicle_plate ~ '^[A-Z]{3}(-[0-9]{4}|[0-9][A-Z][0-9]{2})$'),
    vehicle_color  text,
    vehicle_year   integer not null check (vehicle_year between 1900 and 2100),

    budget_date    timestamptz not null,
    expires_at     timestamptz,

    created_at     timestamptz not null default now(),
    updated_at     timestamptz,
    created_by     uuid references auth.users (id) on delete set null default auth.uid(),

    unique (workshop_id, number)
);

create table public.budget_items (
    id          uuid primary key default gen_random_uuid(),
    budget_id   uuid not null references public.budgets (id) on delete cascade,
    position    integer not null,
    description text not null check (char_length(trim(description)) > 0),
    quantity    numeric(10, 2) not null check (quantity > 0),
    unit_price  numeric(12, 2) not null check (unit_price >= 0),
    unique (budget_id, position)
);

create index budgets_workshop_number_idx on public.budgets (workshop_id, number desc);
create index budget_items_budget_idx on public.budget_items (budget_id);
create index workshop_members_user_idx on public.workshop_members (user_id);

-- -----------------------------------------------------------------------------
-- Numeração sequencial dos orçamentos
-- O UPDATE trava a linha da oficina até o fim da transação, então dois
-- orçamentos salvos ao mesmo tempo nunca recebem o mesmo número.
-- -----------------------------------------------------------------------------

create function public.set_budget_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.workshops
       set last_budget_number = last_budget_number + 1
     where id = new.workshop_id
    returning last_budget_number into new.number;
    return new;
end;
$$;

create trigger budgets_set_number
    before insert on public.budgets
    for each row execute function public.set_budget_number();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

-- security definer: consulta workshop_members sem passar pela RLS dela mesma.
create function public.is_workshop_member(target_workshop uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
          from public.workshop_members
         where workshop_id = target_workshop
           and user_id = auth.uid()
    );
$$;

alter table public.workshops        enable row level security;
alter table public.workshop_members enable row level security;
alter table public.budgets          enable row level security;
alter table public.budget_items     enable row level security;

create policy "Membros veem a própria oficina"
    on public.workshops for select to authenticated
    using (public.is_workshop_member(id));

create policy "Usuário vê os próprios vínculos"
    on public.workshop_members for select to authenticated
    using (user_id = auth.uid());

create policy "Membros acessam os orçamentos da oficina"
    on public.budgets for all to authenticated
    using (public.is_workshop_member(workshop_id))
    with check (public.is_workshop_member(workshop_id));

create policy "Membros acessam os itens dos orçamentos da oficina"
    on public.budget_items for all to authenticated
    using (exists (
        select 1 from public.budgets b
         where b.id = budget_id and public.is_workshop_member(b.workshop_id)
    ))
    with check (exists (
        select 1 from public.budgets b
         where b.id = budget_id and public.is_workshop_member(b.workshop_id)
    ));

-- -----------------------------------------------------------------------------
-- save_budget: cria ou atualiza um orçamento com todos os itens numa única
-- transação (ou salva tudo, ou nada). Recebe o orçamento no mesmo formato JSON
-- usado pelo app e devolve o id.
--
-- security invoker: roda com as permissões de quem chamou, então a RLS vale.
-- -----------------------------------------------------------------------------

create function public.save_budget(budget jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_id       uuid := nullif(budget ->> 'id', '')::uuid;
    v_workshop uuid;
begin
    if jsonb_array_length(coalesce(budget -> 'services', '[]'::jsonb)) = 0 then
        raise exception 'O orçamento precisa ter pelo menos um item.';
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
            budget_date, expires_at, created_at
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
            -- Permite manter a data original ao importar orçamentos antigos.
            coalesce((budget ->> 'createdAt')::timestamptz, now())
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
        returning id into v_id;

        -- Sem linha atualizada: não existe ou a RLS não deixou ver.
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

-- Só usuários logados podem salvar (o Supabase concede execute a anon por padrão).
revoke execute on function public.save_budget(jsonb) from public, anon;
grant execute on function public.save_budget(jsonb) to authenticated;
