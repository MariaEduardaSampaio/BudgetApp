-- =============================================================================
-- Orçamentos de teste para a Oficina Teste (37 orçamentos, 11/08 a 23/10/2026)
--
-- Como usar: Supabase → SQL Editor → New query → cole TODO este arquivo → Run.
--
-- Segurança: o script só grava na oficina chamada 'Oficina Teste'. Ele para sem
-- gravar nada se a oficina ou o usuário de teste não existirem, se o usuário não
-- for membro dela, ou se ela já tiver orçamentos (rode limpar_oficina_teste.sql antes).
-- Tudo roda numa transação: ou entram os 37, ou nenhum.
--
-- Se o seu e-mail de teste for outro, troque em v_email logo abaixo.
-- =============================================================================

do $$
declare
    v_email    constant text := 'mariaeduardamrs0+teste@gmail.com';
    v_workshop uuid;
    v_user     uuid;
    v_budget   uuid;
begin
    select id into v_workshop from public.workshops where name = 'Oficina Teste';
    if v_workshop is null then
        raise exception 'Não encontrei a oficina "Oficina Teste". Crie e vincule o usuário de teste antes.';
    end if;

    select id into v_user from auth.users where lower(email) = lower(v_email);
    if v_user is null then
        raise exception 'Não encontrei o usuário %. Confira o e-mail em v_email.', v_email;
    end if;

    if not exists (select 1 from public.workshop_members where workshop_id = v_workshop and user_id = v_user) then
        raise exception 'O usuário % não é membro da Oficina Teste.', v_email;
    end if;

    if exists (select 1 from public.budgets where workshop_id = v_workshop) then
        raise exception 'A Oficina Teste já tem orçamentos. Rode limpar_oficina_teste.sql antes.';
    end if;

    -- Sem orçamentos: a numeração começa do 0001.
    update public.workshops set last_budget_number = 0 where id = v_workshop;

    -- Nº 0001 · 11/08 · Sebastião Ferreira · Uno Vivace · 3 itens · R$ 244,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Sebastião Ferreira', '(31) 3337-1844', null, 'Fiat', 'Uno Vivace', 'GZE-0954', null, 2012, '2026-08-11 15:40:00-03', '2026-08-26 15:40:00-03', '2026-08-11 15:40:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Óleo 15W40 semissintético (litro)', 4, 38.00),
        (v_budget, 1, 'Filtro de óleo', 1, 42.00),
        (v_budget, 2, 'Mão de obra - troca de óleo', 1, 50.00);

    -- Nº 0002 · 13/08 · Lúcia Helena Martins · Fox · 4 itens · R$ 925,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Lúcia Helena Martins', '(31) 99119-9762', 'Rua Pernambuco, 1322 - Funcionários', 'Volkswagen', 'Fox', 'HRD-4131', 'Branco', 2015, '2026-08-13 08:15:00-03', '2026-08-28 08:15:00-03', '2026-08-13 08:15:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Pastilha de freio dianteira (jogo)', 1, 210.00),
        (v_budget, 1, 'Disco de freio dianteiro', 2, 245.00),
        (v_budget, 2, 'Fluido de freio DOT 4', 1, 45.00),
        (v_budget, 3, 'Mão de obra - freios', 1, 180.00);

    -- Nº 0003 · 15/08 · João Batista de Oliveira · Gol 1.0 · 2 itens · R$ 900,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'João Batista de Oliveira', '(31) 3680-0515', 'Rua Pouso Alegre, 905 - Santa Tereza', 'Volkswagen', 'Gol 1.0', 'GQS-4323', 'Vermelho', 2011, '2026-08-15 08:22:00-03', '2026-08-22 08:22:00-03', '2026-08-15 08:22:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Pneu 175/70 R14', 2, 380.00),
        (v_budget, 1, 'Alinhamento e balanceamento', 1, 140.00);

    -- Nº 0004 · 17/08 · Patrícia Gomes · HB20 1.0 · 5 itens · R$ 1.409,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Patrícia Gomes', '(31) 99592-8040', null, 'Hyundai', 'HB20 1.0', 'QJK8P55', null, 2019, '2026-08-17 12:11:00-03', '2026-09-16 12:11:00-03', '2026-08-17 12:11:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Kit correia dentada (correia e tensor)', 1, 460.00),
        (v_budget, 1, 'Bomba d''água', 1, 320.00),
        (v_budget, 2, 'Aditivo para radiador (litro)', 2, 42.00),
        (v_budget, 3, 'Correia do alternador', 1, 95.00),
        (v_budget, 4, 'Mão de obra', 1, 450.00);

    -- Nº 0005 · 20/08 · Cássio Rodrigues · Prisma LT · 1 item · R$ 180,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Cássio Rodrigues', '(31) 98767-7158', 'Av. do Contorno, 2780 - Santa Efigênia', 'Chevrolet', 'Prisma LT', 'GZA-2014', 'Preto', 2016, '2026-08-20 14:31:00-03', null, '2026-08-20 14:31:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Higienização do ar-condicionado', 1, 180.00);

    -- Nº 0006 · 21/08 · Glória Aparecida Santos · Sandero Expression · 6 itens · R$ 1.630,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Glória Aparecida Santos', '(31) 99763-2696', 'Rua Salinas, 455 - Santa Tereza', 'Renault', 'Sandero Expression', 'HXU-5714', 'Cinza', 2014, '2026-08-21 17:08:00-03', '2026-09-05 17:08:00-03', '2026-08-21 17:08:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Amortecedor dianteiro', 2, 340.00),
        (v_budget, 1, 'Kit batente e coifa', 2, 85.00),
        (v_budget, 2, 'Coxim do amortecedor', 2, 110.00),
        (v_budget, 3, 'Bieleta', 2, 75.00),
        (v_budget, 4, 'Alinhamento', 1, 90.00),
        (v_budget, 5, 'Mão de obra - suspensão', 1, 320.00);

    -- Nº 0007 · 22/08 · Márcio Vinícius Lopes · Corolla XEi · 4 itens · R$ 510,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Márcio Vinícius Lopes', '(31) 98377-5073', null, 'Toyota', 'Corolla XEi', 'SXG9S58', 'Prata', 2018, '2026-08-22 08:47:00-03', '2026-09-06 08:47:00-03', '2026-08-22 08:47:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Óleo 5W30 sintético (litro)', 5, 58.00),
        (v_budget, 1, 'Filtro de óleo', 1, 55.00),
        (v_budget, 2, 'Filtro de ar do motor', 1, 85.00),
        (v_budget, 3, 'Mão de obra - revisão', 1, 80.00);

    -- Nº 0008 · 25/08 · Maria da Conceição Silva · Onix 1.0 · 3 itens · R$ 670,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Maria da Conceição Silva', '(31) 99330-0711', null, 'Chevrolet', 'Onix 1.0', 'RSC7U14', 'Branco', 2020, '2026-08-25 08:29:00-03', '2026-09-01 08:29:00-03', '2026-08-25 08:29:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Bateria 60Ah', 1, 560.00),
        (v_budget, 1, 'Teste do sistema de carga', 1, 60.00),
        (v_budget, 2, 'Terminal de bateria', 2, 25.00);

    -- Nº 0009 · 27/08 · Fábio Nogueira · Ka SE 1.0 · 7 itens · R$ 2.315,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Fábio Nogueira', '(31) 98316-8274', 'Rua Conselheiro Rocha, 1880 - Horto', 'Ford', 'Ka SE 1.0', 'GXX-3227', null, 2017, '2026-08-27 09:50:00-03', '2026-09-26 09:50:00-03', '2026-08-27 09:50:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Kit embreagem (platô, disco e rolamento)', 1, 980.00),
        (v_budget, 1, 'Retífica do volante do motor', 1, 250.00),
        (v_budget, 2, 'Cabo de embreagem', 1, 110.00),
        (v_budget, 3, 'Retentor do câmbio', 1, 65.00),
        (v_budget, 4, 'Óleo de câmbio (litro)', 2, 65.00),
        (v_budget, 5, 'Coxim do câmbio', 1, 180.00),
        (v_budget, 6, 'Mão de obra - embreagem', 1, 600.00);

    -- Nº 0010 · 28/08 · Vânia Cristina Barbosa · Fit LX · 2 itens · R$ 730,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Vânia Cristina Barbosa', '(31) 98376-9041', 'Rua Ceará, 640 - Santa Efigênia', 'Honda', 'Fit LX', 'GMO-9333', null, 2013, '2026-08-28 13:01:00-03', '2026-09-12 13:01:00-03', '2026-08-28 13:01:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Martelinho de ouro (porta traseira esquerda)', 1, 350.00),
        (v_budget, 1, 'Polimento técnico', 1, 380.00);

    -- Nº 0011 · 31/08 · André Luiz Pereira · Palio Fire · 5 itens · R$ 1.071,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'André Luiz Pereira', '(31) 99669-8818', null, 'Fiat', 'Palio Fire', 'HSA-6485', 'Verde', 2009, '2026-08-31 08:27:00-03', '2026-09-15 08:27:00-03', '2026-08-31 08:27:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Radiador', 1, 520.00),
        (v_budget, 1, 'Mangueira superior do radiador', 1, 95.00),
        (v_budget, 2, 'Mangueira inferior do radiador', 1, 110.00),
        (v_budget, 3, 'Aditivo para radiador (litro)', 3, 42.00),
        (v_budget, 4, 'Mão de obra', 1, 220.00);

    -- Nº 0012 · 02/09 · Antônio Carlos Souza · Strada Freedom · 3 itens · R$ 732,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Antônio Carlos Souza', '(31) 98838-4476', 'Rua Itajubá, 1210 - Sagrada Família', 'Fiat', 'Strada Freedom', 'QNF9D95', 'Branco', 2019, '2026-09-02 15:15:00-03', null, '2026-09-02 15:15:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Diagnóstico com scanner', 1, 120.00),
        (v_budget, 1, 'Bobina de ignição', 1, 420.00),
        (v_budget, 2, 'Vela de ignição', 4, 48.00);

    -- Nº 0013 · 03/09 · Inês de Fátima Rocha · March · 1 item · R$ 780,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Inês de Fátima Rocha', '(31) 98123-6375', 'Rua Grão Mogol, 77 - Sion', 'Nissan', 'March', 'SBE3A92', 'Vermelho', 2016, '2026-09-03 13:10:00-03', '2026-09-10 13:10:00-03', '2026-09-03 13:10:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Motor de partida recondicionado (com mão de obra)', 1, 780.00);

    -- Nº 0014 · 07/09 · Ricardo Alves Moreira · Renegade Sport · 6 itens · R$ 4.220,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Ricardo Alves Moreira', '(31) 98489-7865', 'Av. Francisco Sales, 1540 - Santa Efigênia', 'Jeep', 'Renegade Sport', 'RCI8T62', 'Cinza', 2021, '2026-09-07 10:42:00-03', '2026-10-07 10:42:00-03', '2026-09-07 10:42:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Compressor do ar-condicionado', 1, 2600.00),
        (v_budget, 1, 'Filtro secador', 1, 280.00),
        (v_budget, 2, 'Válvula de expansão', 1, 320.00),
        (v_budget, 3, 'Carga de gás R134a', 1, 280.00),
        (v_budget, 4, 'Óleo do compressor', 1, 90.00),
        (v_budget, 5, 'Mão de obra - ar-condicionado', 1, 650.00);

    -- Nº 0015 · 09/09 · Tereza Cristina Duarte · Up! Move · 2 itens · R$ 310,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Tereza Cristina Duarte', '(31) 98150-8183', null, 'Volkswagen', 'Up! Move', 'GOC-7709', null, 2017, '2026-09-09 11:28:00-03', '2026-09-24 11:28:00-03', '2026-09-09 11:28:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Pastilha de freio dianteira (jogo)', 1, 190.00),
        (v_budget, 1, 'Mão de obra - freios', 1, 120.00);

    -- Nº 0016 · 10/09 · Wellington Souza Lima · Toro Freedom Diesel · 5 itens · R$ 812,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Wellington Souza Lima', '(31) 99282-2889', 'Rua Jacuí, 2330 - Concórdia', 'Fiat', 'Toro Freedom Diesel', 'QLO2W00', 'Preto', 2020, '2026-09-10 14:44:00-03', '2026-09-25 14:44:00-03', '2026-09-10 14:44:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Óleo 5W30 diesel (litro)', 6, 62.00),
        (v_budget, 1, 'Filtro de óleo', 1, 70.00),
        (v_budget, 2, 'Filtro de combustível', 1, 160.00),
        (v_budget, 3, 'Filtro de ar do motor', 1, 120.00),
        (v_budget, 4, 'Mão de obra - revisão', 1, 90.00);

    -- Nº 0017 · 12/09 · João Batista de Oliveira · Gol 1.0 · 4 itens · R$ 1.220,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'João Batista de Oliveira', '(31) 3680-0515', 'Rua Pouso Alegre, 905 - Santa Tereza', 'Volkswagen', 'Gol 1.0', 'GQS-4323', 'Vermelho', 2011, '2026-09-12 10:23:00-03', '2026-09-27 10:23:00-03', '2026-09-12 10:23:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Amortecedor traseiro', 2, 260.00),
        (v_budget, 1, 'Kit batente traseiro', 2, 60.00),
        (v_budget, 2, 'Mola traseira', 2, 180.00),
        (v_budget, 3, 'Mão de obra - suspensão', 1, 220.00);

    -- Nº 0018 · 15/09 · Raimunda Costa · Celta Life · 3 itens · R$ 2.190,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Raimunda Costa', '(31) 3882-5999', null, 'Chevrolet', 'Celta Life', 'HWA-8358', 'Prata', 2010, '2026-09-15 13:25:00-03', '2026-10-15 13:25:00-03', '2026-09-15 13:25:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Retífica do cabeçote', 1, 1100.00),
        (v_budget, 1, 'Jogo de juntas do cabeçote', 1, 240.00),
        (v_budget, 2, 'Mão de obra', 1, 850.00);

    -- Nº 0019 · 16/09 · Gustavo Henrique Prado · Creta Limited · 7 itens · R$ 5.950,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Gustavo Henrique Prado', '(31) 98617-7121', 'Rua Paraíba, 1100 - Savassi', 'Hyundai', 'Creta Limited', 'SBL1S71', 'Branco', 2022, '2026-09-16 16:09:00-03', '2026-10-16 16:09:00-03', '2026-09-16 16:09:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Para-choque dianteiro', 1, 1350.00),
        (v_budget, 1, 'Farol dianteiro direito', 1, 1650.00),
        (v_budget, 2, 'Grade frontal', 1, 420.00),
        (v_budget, 3, 'Suporte do para-choque', 1, 180.00),
        (v_budget, 4, 'Pintura do para-choque', 1, 750.00),
        (v_budget, 5, 'Pintura do para-lama direito', 1, 700.00),
        (v_budget, 6, 'Mão de obra - funilaria', 1, 900.00);

    -- Nº 0020 · 19/09 · Elaine Marques · Kwid Zen · 2 itens · R$ 210,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Elaine Marques', '(31) 98809-3628', null, 'Renault', 'Kwid Zen', 'QPV7C73', null, 2021, '2026-09-19 10:09:00-03', '2026-09-26 10:09:00-03', '2026-09-19 10:09:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Alinhamento e balanceamento', 1, 150.00),
        (v_budget, 1, 'Rodízio de pneus', 1, 60.00);

    -- Nº 0021 · 21/09 · Benedito Ramos · Fiesta Hatch · 4 itens · R$ 875,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Benedito Ramos', '(31) 3557-2544', 'Rua Itapecerica, 512 - Lagoinha', 'Ford', 'Fiesta Hatch', 'HJO-4430', null, 2012, '2026-09-21 12:06:00-03', '2026-10-06 12:06:00-03', '2026-09-21 12:06:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Sensor de oxigênio (sonda lambda)', 1, 460.00),
        (v_budget, 1, 'Limpeza de bicos injetores', 1, 240.00),
        (v_budget, 2, 'Filtro de combustível', 1, 55.00),
        (v_budget, 3, 'Diagnóstico com scanner', 1, 120.00);

    -- Nº 0022 · 22/09 · Mônica Albuquerque · Polo Highline · 5 itens · R$ 3.035,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Mônica Albuquerque', '(31) 99045-9596', 'Rua Alvarenga Peixoto, 288 - Lourdes', 'Volkswagen', 'Polo Highline', 'QHD8I27', 'Azul', 2020, '2026-09-22 10:13:00-03', '2026-10-07 10:13:00-03', '2026-09-22 10:13:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Óleo ATF do câmbio automático (litro)', 7, 95.00),
        (v_budget, 1, 'Filtro do câmbio automático', 1, 280.00),
        (v_budget, 2, 'Junta do cárter do câmbio', 1, 120.00),
        (v_budget, 3, 'Válvula solenoide do câmbio', 1, 1450.00),
        (v_budget, 4, 'Mão de obra - câmbio automático', 1, 520.00);

    -- Nº 0023 · 25/09 · Flávio Augusto Teixeira · S10 LT Diesel · 6 itens · R$ 14.520,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Flávio Augusto Teixeira', '(31) 98471-9817', 'Av. Cristiano Machado, 4100 - Cidade Nova', 'Chevrolet', 'S10 LT Diesel', 'GDC-9067', 'Prata', 2015, '2026-09-25 17:26:00-03', '2026-10-25 17:26:00-03', '2026-09-25 17:26:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Retífica completa do motor', 1, 6800.00),
        (v_budget, 1, 'Jogo de pistões e anéis', 1, 2400.00),
        (v_budget, 2, 'Jogo de bronzinas', 1, 780.00),
        (v_budget, 3, 'Jogo completo de juntas', 1, 690.00),
        (v_budget, 4, 'Bomba de óleo', 1, 650.00),
        (v_budget, 5, 'Mão de obra - desmontagem e montagem do motor', 1, 3200.00);

    -- Nº 0024 · 26/09 · Aurélio Mendes · Mobi Like · 3 itens · R$ 1.150,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Aurélio Mendes', '(31) 99070-3287', null, 'Fiat', 'Mobi Like', 'QEO3H13', 'Branco', 2019, '2026-09-26 11:20:00-03', '2026-10-11 11:20:00-03', '2026-09-26 11:20:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Bandeja de suspensão dianteira', 2, 340.00),
        (v_budget, 1, 'Terminal de direção', 2, 110.00),
        (v_budget, 2, 'Mão de obra - suspensão', 1, 250.00);

    -- Nº 0025 · 30/09 · Lívia Carvalho · Civic EXL · 1 item · R$ 850,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Lívia Carvalho', '(31) 99162-0504', 'Rua Desembargador Jorge Fontana, 300 - Belvedere', 'Honda', 'Civic EXL', 'HTK-2865', 'Preto', 2017, '2026-09-30 10:42:00-03', null, '2026-09-30 10:42:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Reparo do para-choque traseiro com pintura', 1, 850.00);

    -- Nº 0026 · 01/10 · Maria da Conceição Silva · Onix 1.0 · 5 itens · R$ 475,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Maria da Conceição Silva', '(31) 99330-0711', null, 'Chevrolet', 'Onix 1.0', 'RSC7U14', 'Branco', 2020, '2026-10-01 08:36:00-03', '2026-10-16 08:36:00-03', '2026-10-01 08:36:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Óleo 5W30 sintético (litro)', 4, 55.00),
        (v_budget, 1, 'Filtro de óleo', 1, 45.00),
        (v_budget, 2, 'Filtro de ar do motor', 1, 75.00),
        (v_budget, 3, 'Filtro de ar-condicionado (cabine)', 1, 65.00),
        (v_budget, 4, 'Mão de obra - revisão', 1, 70.00);

    -- Nº 0027 · 03/10 · Sílvio Antunes · Saveiro Trendline · 4 itens · R$ 1.530,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Sílvio Antunes', '(31) 98388-5442', 'Rua Itaguaí, 158 - Caiçara', 'Volkswagen', 'Saveiro Trendline', 'HKZ-3634', null, 2014, '2026-10-03 08:19:00-03', '2026-10-18 08:19:00-03', '2026-10-03 08:19:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Alternador recondicionado', 1, 720.00),
        (v_budget, 1, 'Correia do alternador', 1, 90.00),
        (v_budget, 2, 'Bateria 60Ah', 1, 540.00),
        (v_budget, 3, 'Mão de obra', 1, 180.00);

    -- Nº 0028 · 06/10 · Rosângela Pires · Etios XS · 3 itens · R$ 840,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Rosângela Pires', '(31) 99601-3769', null, 'Toyota', 'Etios XS', 'GZP-4946', 'Vermelho', 2016, '2026-10-06 10:42:00-03', '2026-10-13 10:42:00-03', '2026-10-06 10:42:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Disco de freio dianteiro', 2, 230.00),
        (v_budget, 1, 'Pastilha de freio dianteira (jogo)', 1, 200.00),
        (v_budget, 2, 'Mão de obra - freios', 1, 180.00);

    -- Nº 0029 · 07/10 · Hélio Castro · L200 Triton · 7 itens · R$ 12.610,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Hélio Castro', '(31) 98027-1749', 'Rua Niquelina, 820 - Santa Efigênia', 'Mitsubishi', 'L200 Triton', 'GUV-9294', 'Preto', 2013, '2026-10-07 14:19:00-03', '2026-11-06 14:19:00-03', '2026-10-07 14:19:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Capô', 1, 1900.00),
        (v_budget, 1, 'Para-choque dianteiro', 1, 1450.00),
        (v_budget, 2, 'Farol dianteiro', 2, 980.00),
        (v_budget, 3, 'Radiador', 1, 1100.00),
        (v_budget, 4, 'Reparo da longarina dianteira', 1, 2200.00),
        (v_budget, 5, 'Pintura da parte dianteira', 1, 2600.00),
        (v_budget, 6, 'Mão de obra - funilaria e montagem', 1, 1400.00);

    -- Nº 0030 · 09/10 · Cleide Fonseca · Argo Drive · 2 itens · R$ 250,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Cleide Fonseca', '(31) 98538-9960', null, 'Fiat', 'Argo Drive', 'QDZ8Y07', null, 2022, '2026-10-09 15:21:00-03', null, '2026-10-09 15:21:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Higienização do ar-condicionado', 1, 180.00),
        (v_budget, 1, 'Filtro de ar-condicionado (cabine)', 1, 70.00);

    -- Nº 0031 · 12/10 · João Batista de Oliveira · Gol 1.0 · 5 itens · R$ 1.350,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'João Batista de Oliveira', '(31) 3680-0515', 'Rua Pouso Alegre, 905 - Santa Tereza', 'Volkswagen', 'Gol 1.0', 'GQS-4323', 'Vermelho', 2011, '2026-10-12 16:41:00-03', '2026-10-27 16:41:00-03', '2026-10-12 16:41:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Kit correia dentada (correia e tensor)', 1, 380.00),
        (v_budget, 1, 'Bomba d''água', 1, 260.00),
        (v_budget, 2, 'Vela de ignição', 4, 40.00),
        (v_budget, 3, 'Jogo de cabos de vela', 1, 170.00),
        (v_budget, 4, 'Mão de obra', 1, 380.00);

    -- Nº 0032 · 14/10 · Débora Cunha · 208 Active · 4 itens · R$ 970,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Débora Cunha', '(31) 99861-4598', 'Rua Mármore, 410 - Santa Tereza', 'Peugeot', '208 Active', 'ROB9L08', 'Branco', 2018, '2026-10-14 16:45:00-03', '2026-10-29 16:45:00-03', '2026-10-14 16:45:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Bobina de ignição', 1, 480.00),
        (v_budget, 1, 'Vela de ignição', 4, 55.00),
        (v_budget, 2, 'Limpeza do corpo de borboleta', 1, 150.00),
        (v_budget, 3, 'Diagnóstico com scanner', 1, 120.00);

    -- Nº 0033 · 16/10 · Natanael Brito · Spin LTZ · 6 itens · R$ 2.240,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Natanael Brito', '(31) 99020-6314', null, 'Chevrolet', 'Spin LTZ', 'HAZ-0677', null, 2016, '2026-10-16 13:14:00-03', '2026-11-15 13:14:00-03', '2026-10-16 13:14:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Amortecedor dianteiro', 2, 380.00),
        (v_budget, 1, 'Amortecedor traseiro', 2, 290.00),
        (v_budget, 2, 'Kit batente dianteiro', 2, 95.00),
        (v_budget, 3, 'Kit batente traseiro', 2, 70.00),
        (v_budget, 4, 'Alinhamento', 1, 120.00),
        (v_budget, 5, 'Mão de obra - suspensão', 1, 450.00);

    -- Nº 0034 · 17/10 · Antônio Carlos Souza · Strada Freedom · 4 itens · R$ 1.930,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Antônio Carlos Souza', '(31) 98838-4476', 'Rua Itajubá, 1210 - Sagrada Família', 'Fiat', 'Strada Freedom', 'QNF9D95', 'Branco', 2019, '2026-10-17 09:40:00-03', '2026-10-24 09:40:00-03', '2026-10-17 09:40:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Pneu 175/70 R14', 4, 420.00),
        (v_budget, 1, 'Alinhamento', 1, 90.00),
        (v_budget, 2, 'Balanceamento', 4, 25.00),
        (v_budget, 3, 'Válvula de pneu', 4, 15.00);

    -- Nº 0035 · 19/10 · Joana D'Arc Moura · Duster Dynamique · 5 itens · R$ 2.615,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Joana D''Arc Moura', '(31) 99214-1673', 'Rua Gonçalves Dias, 2050 - Lourdes', 'Renault', 'Duster Dynamique', 'RGT4A79', 'Marrom', 2019, '2026-10-19 08:11:00-03', '2026-11-03 08:11:00-03', '2026-10-19 08:11:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Kit embreagem (platô e disco)', 1, 1250.00),
        (v_budget, 1, 'Atuador hidráulico da embreagem', 1, 480.00),
        (v_budget, 2, 'Fluido de freio DOT 4', 1, 45.00),
        (v_budget, 3, 'Óleo de câmbio (litro)', 2, 70.00),
        (v_budget, 4, 'Mão de obra - embreagem', 1, 700.00);

    -- Nº 0036 · 21/10 · Otávio Lacerda · Virtus Comfortline · 3 itens · R$ 3.080,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Otávio Lacerda', '(31) 99729-1247', 'Rua Tomé de Souza, 845 - Funcionários', 'Volkswagen', 'Virtus Comfortline', 'QGG2D60', null, 2023, '2026-10-21 14:37:00-03', '2026-11-20 14:37:00-03', '2026-10-21 14:37:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Caixa de direção recondicionada', 1, 2200.00),
        (v_budget, 1, 'Terminal de direção', 2, 140.00),
        (v_budget, 2, 'Mão de obra - direção', 1, 600.00);

    -- Nº 0037 · 23/10 · Priscila Moraes · Cronos Drive · 2 itens · R$ 410,00
    insert into public.budgets (workshop_id, client_name, client_phone, client_address, vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, budget_date, expires_at, created_at, created_by)
    values (v_workshop, 'Priscila Moraes', '(31) 99876-8098', null, 'Fiat', 'Cronos Drive', 'SJA6T07', 'Vermelho', 2021, '2026-10-23 13:07:00-03', '2026-10-30 13:07:00-03', '2026-10-23 13:07:00-03', v_user)
    returning id into v_budget;
    insert into public.budget_items (budget_id, position, description, quantity, unit_price) values
        (v_budget, 0, 'Diagnóstico com scanner', 1, 120.00),
        (v_budget, 1, 'Sensor de rotação', 1, 290.00);
end $$;

-- Resultado: os 37 orçamentos, na ordem do número.
select b.number as "Nº",
       to_char(b.budget_date at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as data,
       b.client_name as cliente,
       b.vehicle_model as modelo,
       b.vehicle_plate as placa,
       count(i.id) as itens,
       sum(i.quantity * i.unit_price) as total
  from public.budgets b
  join public.workshops w on w.id = b.workshop_id
  join public.budget_items i on i.budget_id = b.id
 where w.name = 'Oficina Teste'
 group by b.id
 order by b.number;
