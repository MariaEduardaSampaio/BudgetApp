/**
 * @jest-environment node
 */
// Testa o SQL do Supabase num Postgres de verdade (PGlite roda o Postgres dentro do Node).
// Simulamos o essencial do Supabase: schema auth, auth.uid() e os papéis anon/authenticated.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "fs";
import { join } from "path";

const MIGRATION = readFileSync(join(__dirname, "../migrations/20261015000000_initial_schema.sql"), "utf8");

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
`;

// Mesmos privilégios que o Supabase dá por padrão (quem limita o acesso é a RLS).
const SUPABASE_GRANTS = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
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
    await db.exec(MIGRATION);
    await db.exec(SUPABASE_GRANTS);
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

    it("não dá para inserir direto na oficina de outra pessoa", async () => {
        await expect(
            as(USERS.semOficina, `insert into public.budgets (workshop_id, number, client_name, client_phone, vehicle_brand, vehicle_model, vehicle_plate, vehicle_year, budget_date)
                                  values ('10000000-0000-0000-0000-000000000001', 99, 'X', 'X', 'X', 'X', 'ABC1D23', 2010, now())`)
        ).rejects.toThrow(/row-level security/);
    });

    it("visitante sem login (anon) não pode chamar save_budget", async () => {
        await db.exec("set role anon;");
        await expect(db.query("select public.save_budget($1::jsonb)", [budgetJson()])).rejects.toThrow(/permission denied/);
        await db.exec("reset role;");
    });

    it("excluir um orçamento apaga os itens junto", async () => {
        const id = await save(USERS.pai);
        await as(USERS.pai, "delete from public.budgets where id = $1", [id]);

        expect(await as(USERS.pai, "select * from public.budget_items")).toEqual([]);
    });
});
