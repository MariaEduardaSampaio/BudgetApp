/**
 * @jest-environment node
 */
// Testa o SQL do Supabase num Postgres de verdade (PGlite roda o Postgres dentro do Node).
// Simulamos o essencial do Supabase: schema auth, auth.uid() e os papéis anon/authenticated.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// Todas as migrations, na ordem do nome (data), como o Supabase aplica.
const MIGRATIONS_DIR = join(__dirname, "../migrations");
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(MIGRATIONS_DIR, file), "utf8"));

const SUPABASE_STUBS = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  -- Como o Supabase: toda tabela/função criada no schema public já nasce
  -- com permissão total para anon e authenticated (quem limita é a RLS e as migrations).
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`;

const USERS = {
    pai: "00000000-0000-0000-0000-000000000001",
    irmao: "00000000-0000-0000-0000-000000000002",
    semOficina: "00000000-0000-0000-0000-000000000003",
    outraOficina: "00000000-0000-0000-0000-000000000004",
};

let db: PGlite;

/** Executa como um usuário logado (papel authenticated + auth.uid() = userId). */
const as = async <T = any>(userId: string, sql: string, params: unknown[] = []) => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`);
    try {
        return (await db.query<T>(sql, params)).rows;
    } finally {
        await db.exec("reset role;");
    }
};

const budgetJson = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
        client: { name: "Cliente Teste", phone: "(31) 98765-4321", address: "" },
        vehicle: { brand: "Fiat", model: "Uno", licensePlate: "ABC1D23", color: "Prata", year: 2010 },
        services: [
            { description: "Troca de óleo", quantity: 1, price: 180 },
            { description: "Pastilha", quantity: 2, price: 90.5 },
        ],
        date: "2026-10-14T15:00:00.000Z",
        expiresAt: "2026-10-29T15:00:00.000Z",
        ...overrides,
    });

const save = async (userId: string, overrides: Record<string, unknown> = {}) => {
    const [row] = await as<{ id: string }>(userId, "select public.save_budget($1::jsonb) as id", [budgetJson(overrides)]);
    return row.id;
};

const getBudget = async (userId: string, id: string) => {
    const [row] = await as<any>(userId, "select * from public.budgets where id = $1", [id]);
    return row;
};

// Sobe o banco uma vez (é a parte lenta) e limpa os orçamentos antes de cada teste.
beforeAll(async () => {
    db = new PGlite();
    await db.exec(SUPABASE_STUBS);
    for (const migration of MIGRATIONS) await db.exec(migration);
    await db.exec(`
      insert into auth.users (id, email) values
        ('${USERS.pai}', 'pai@teste.com'),
        ('${USERS.irmao}', 'irmao@teste.com'),
        ('${USERS.semOficina}', 'intruso@teste.com'),
        ('${USERS.outraOficina}', 'outra@teste.com');
      insert into public.workshops (id, name) values
        ('10000000-0000-0000-0000-000000000001', 'Oficina Alocar'),
        ('10000000-0000-0000-0000-000000000002', 'Outra Oficina');
      insert into public.workshop_members (workshop_id, user_id) values
        ('10000000-0000-0000-0000-000000000001', '${USERS.pai}'),
        ('10000000-0000-0000-0000-000000000001', '${USERS.irmao}'),
        ('10000000-0000-0000-0000-000000000002', '${USERS.outraOficina}');
    `);
});

beforeEach(async () => {
    await db.exec("reset role; truncate public.budgets cascade; update public.workshops set last_budget_number = 0;");
});

afterAll(async () => {
    await db.close();
});

describe("save_budget e numeração", () => {
    it("numera os orçamentos em sequência por oficina, para todos os membros", async () => {
        const first = await save(USERS.pai);
        const second = await save(USERS.irmao);
        const otherWorkshop = await save(USERS.outraOficina);

        expect((await getBudget(USERS.pai, first)).number).toBe(1);
        expect((await getBudget(USERS.pai, second)).number).toBe(2);
        expect((await getBudget(USERS.outraOficina, otherWorkshop)).number).toBe(1);
    });

    it("grava os itens na ordem enviada e registra quem criou", async () => {
        const id = await save(USERS.pai);

        const items = await as(USERS.pai, "select description, quantity::float, unit_price::float from public.budget_items where budget_id = $1 order by position", [id]);
        expect(items).toEqual([
            { description: "Troca de óleo", quantity: 1, unit_price: 180 },
            { description: "Pastilha", quantity: 2, unit_price: 90.5 },
        ]);
        expect((await getBudget(USERS.pai, id)).created_by).toBe(USERS.pai);
    });

    it("ao editar, mantém o número, troca os itens e registra a data de edição", async () => {
        const id = await save(USERS.pai);

        await save(USERS.irmao, { id, client: { name: "Nome Editado", phone: "(31) 98765-4321" }, services: [{ description: "Só um item", quantity: 1, price: 50 }] });

        const budget = await getBudget(USERS.pai, id);
        expect(budget.number).toBe(1);
        expect(budget.client_name).toBe("Nome Editado");
        expect(budget.updated_at).not.toBeNull();
        const items = await as(USERS.pai, "select description from public.budget_items where budget_id = $1", [id]);
        expect(items).toEqual([{ description: "Só um item" }]);
    });

    it("mantém a data de criação enviada (importação de orçamentos antigos)", async () => {
        const id = await save(USERS.pai, { createdAt: "2026-01-02T10:00:00.000Z" });
        expect((await getBudget(USERS.pai, id)).created_at.toISOString()).toBe("2026-01-02T10:00:00.000Z");
    });
});

describe("regras de validação do banco", () => {
    it.each([
        ["placa fora dos formatos", { vehicle: { brand: "Fiat", model: "Uno", licensePlate: "ABC-1D23", year: 2010 } }],
        ["orçamento sem itens", { services: [] }],
        ["quantidade zero", { services: [{ description: "Item", quantity: 0, price: 10 }] }],
        ["descrição vazia", { services: [{ description: "  ", quantity: 1, price: 10 }] }],
        ["cliente sem nome", { client: { name: "", phone: "(31) 98765-4321" } }],
    ])("recusa %s", async (_case, overrides) => {
        await expect(save(USERS.pai, overrides)).rejects.toThrow();
    });

    it("não salva nada pela metade quando um item é inválido (nem gasta o número)", async () => {
        await expect(
            save(USERS.pai, { services: [{ description: "Ok", quantity: 1, price: 10 }, { description: "Ruim", quantity: -1, price: 10 }] })
        ).rejects.toThrow();

        expect(await as(USERS.pai, "select id from public.budgets")).toEqual([]);
        expect(await as(USERS.pai, "select id from public.budget_items")).toEqual([]);
        const next = await save(USERS.pai);
        expect((await getBudget(USERS.pai, next)).number).toBe(1);
    });
});

describe("segurança (RLS)", () => {
    it("membro vê só os orçamentos da própria oficina", async () => {
        await save(USERS.pai);
        await save(USERS.outraOficina);

        expect(await as(USERS.irmao, "select number from public.budgets")).toEqual([{ number: 1 }]);
        expect(await as(USERS.outraOficina, "select number from public.budgets")).toHaveLength(1);
    });

    it("usuário sem oficina não vê nada e não consegue criar orçamentos", async () => {
        await save(USERS.pai);

        expect(await as(USERS.semOficina, "select * from public.budgets")).toEqual([]);
        expect(await as(USERS.semOficina, "select * from public.budget_items")).toEqual([]);
        await expect(save(USERS.semOficina)).rejects.toThrow("não está vinculado a uma oficina");
    });

    it("não dá para editar nem excluir orçamento de outra oficina", async () => {
        const id = await save(USERS.pai);

        await expect(save(USERS.outraOficina, { id })).rejects.toThrow("Orçamento não encontrado");
        await as(USERS.outraOficina, "delete from public.budgets where id = $1", [id]);
        expect(await getBudget(USERS.pai, id)).toBeDefined();
    });

    it("excluir um orçamento apaga os itens junto", async () => {
        const id = await save(USERS.pai);
        await as(USERS.pai, "delete from public.budgets where id = $1", [id]);

        expect(await as(USERS.pai, "select * from public.budget_items")).toEqual([]);
    });
});

describe("segurança: só se escreve pela save_budget", () => {
    it("nem membro da oficina consegue inserir orçamento direto na tabela", async () => {
        await expect(
            as(USERS.pai, `insert into public.budgets (workshop_id, number, client_name, client_phone, vehicle_brand, vehicle_model, vehicle_plate, vehicle_year, budget_date)
                           values ('10000000-0000-0000-0000-000000000001', 99, 'X', 'X', 'X', 'X', 'ABC1D23', 2010, now())`)
        ).rejects.toThrow(/permission denied/);
    });

    it("não dá para alterar número, oficina ou autor direto na tabela", async () => {
        const id = await save(USERS.pai);

        await expect(as(USERS.pai, "update public.budgets set number = 999 where id = $1", [id])).rejects.toThrow(/permission denied/);
        await expect(as(USERS.pai, "update public.budgets set created_by = $2 where id = $1", [id, USERS.irmao])).rejects.toThrow(/permission denied/);
        expect((await getBudget(USERS.pai, id)).number).toBe(1);
    });

    it("não dá para inserir, alterar ou apagar itens soltos", async () => {
        const id = await save(USERS.pai);

        await expect(
            as(USERS.pai, "insert into public.budget_items (budget_id, position, description, quantity, unit_price) values ($1, 9, 'X', 1, 1)", [id])
        ).rejects.toThrow(/permission denied/);
        await expect(as(USERS.pai, "update public.budget_items set unit_price = 0 where budget_id = $1", [id])).rejects.toThrow(/permission denied/);
        await expect(as(USERS.pai, "delete from public.budget_items where budget_id = $1", [id])).rejects.toThrow(/permission denied/);
    });

    it("ninguém consegue se adicionar a uma oficina", async () => {
        await expect(
            as(USERS.semOficina, "insert into public.workshop_members (workshop_id, user_id) values ('10000000-0000-0000-0000-000000000001', $1)", [USERS.semOficina])
        ).rejects.toThrow(/permission denied/);
    });

    it("o autor é sempre quem está logado", async () => {
        const id = await save(USERS.irmao, { created_by: USERS.pai });
        expect((await getBudget(USERS.pai, id)).created_by).toBe(USERS.irmao);
    });

    it("não aceita data de criação no futuro", async () => {
        const id = await save(USERS.pai, { createdAt: "2099-01-01T00:00:00.000Z" });
        expect((await getBudget(USERS.pai, id)).created_at.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it("exige login mesmo para quem tem o papel authenticated", async () => {
        await expect(save("")).rejects.toThrow("Faça login para salvar orçamentos.");
    });
});

describe("segurança: visitante sem login (anon)", () => {
    const asAnon = async (sql: string, params: unknown[] = []) => {
        await db.exec("reset role; set role anon;");
        try {
            return (await db.query(sql, params)).rows;
        } finally {
            await db.exec("reset role;");
        }
    };

    it.each(["budgets", "budget_items", "workshops", "workshop_members"])("não tem acesso à tabela %s", async (table) => {
        await expect(asAnon(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
    });

    it("não pode chamar save_budget nem is_workshop_member", async () => {
        await expect(asAnon("select public.save_budget($1::jsonb)", [budgetJson()])).rejects.toThrow(/permission denied/);
        await expect(asAnon("select public.is_workshop_member('10000000-0000-0000-0000-000000000001')")).rejects.toThrow(/permission denied/);
    });
});

describe("limites de tamanho", () => {
    it("recusa mais de 100 itens", async () => {
        const services = Array.from({ length: 101 }, (_, i) => ({ description: `Item ${i}`, quantity: 1, price: 1 }));
        await expect(save(USERS.pai, { services })).rejects.toThrow("no máximo 100 itens");
    });

    it("aceita exatamente 100 itens", async () => {
        const services = Array.from({ length: 100 }, (_, i) => ({ description: `Item ${i}`, quantity: 1, price: 1 }));
        await expect(save(USERS.pai, { services })).resolves.toEqual(expect.any(String));
    });

    it.each([
        ["nome do cliente", { client: { name: "x".repeat(121), phone: "(31) 98765-4321" } }],
        ["descrição do item", { services: [{ description: "x".repeat(501), quantity: 1, price: 1 }] }],
        ["modelo do veículo", { vehicle: { brand: "Fiat", model: "x".repeat(61), licensePlate: "ABC1D23", year: 2010 } }],
    ])("recusa %s grande demais", async (_case, overrides) => {
        await expect(save(USERS.pai, overrides)).rejects.toThrow(/check constraint/);
    });
});
