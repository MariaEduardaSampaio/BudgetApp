import { buildBudgetSearchFilter } from "../../utils/budgetSearch";
import { makeBudget } from "../budgetFactory";
import { fakeDb, fakeSupabaseModule } from "../fakeSupabase";

// Garante que o Supabase falso se comporta como o banco nos pontos que os testes de fluxo usam.
const { supabase } = fakeSupabaseModule;

const draft = (overrides: Parameters<typeof makeBudget>[0] = {}) => {
    const { id, number, createdAt, updatedAt, ...rest } = makeBudget(overrides);
    return rest;
};

const list = async () => {
    const { data, error } = await supabase.from("budgets").select("*").order("number", { ascending: false });
    if (error) throw error;
    return data as any[];
};

beforeEach(() => fakeDb.reset());

describe("Supabase falso", () => {
    it("numera por oficina: pai 1, irmão 2, outra oficina começa em 1", async () => {
        await fakeDb.seed("pai", [draft()]);
        await fakeDb.seed("irmao", [draft()]);
        await fakeDb.seed("outraOficina", [draft()]);

        expect(fakeDb.rows("alocar").map((r) => r.number)).toEqual([1, 2]);
        expect(fakeDb.rows("outra").map((r) => r.number)).toEqual([1]);
    });

    it("irmão lê o orçamento do pai; outra oficina e sem oficina não leem nada", async () => {
        await fakeDb.seed("pai", [draft({ client: { name: "Seu Zé", phone: "(31) 98765-4321" } })]);

        fakeDb.loginAs("irmao");
        expect((await list()).map((r) => r.client_name)).toEqual(["Seu Zé"]);
        fakeDb.loginAs("outraOficina");
        expect(await list()).toEqual([]);
        fakeDb.loginAs("semOficina");
        expect(await list()).toEqual([]);
        fakeDb.loginAs(null);
        expect(await list()).toEqual([]);
    });

    it("editar mantém número e criação, troca itens e preenche updated_at", async () => {
        const [id] = await fakeDb.seed("pai", [draft()]);
        const before = fakeDb.rows("alocar")[0];
        expect(before.updated_at).toBeNull();

        fakeDb.loginAs("irmao");
        const { error } = await supabase.rpc("save_budget", {
            budget: { ...draft({ services: [{ description: "Alinhamento", quantity: 1, price: 80 }] }), id },
        });
        expect(error).toBeNull();

        const after = fakeDb.rows("alocar")[0];
        expect(after.number).toBe(before.number);
        expect(after.created_at).toBe(before.created_at);
        expect(after.updated_at).not.toBeNull();
        expect(after.budget_items).toEqual([{ position: 0, description: "Alinhamento", quantity: 1, unit_price: 80 }]);
    });

    it("não deixa outra oficina editar (Orçamento não encontrado)", async () => {
        const [id] = await fakeDb.seed("pai", [draft()]);
        fakeDb.loginAs("outraOficina");
        const { error } = await supabase.rpc("save_budget", { budget: { ...draft(), id } });
        expect(error).toEqual(expect.objectContaining({ code: "P0001", message: "Orçamento não encontrado." }));
    });

    it("recusa placa inválida com código 23514 e aceita ABC1D23 e ABC-1234", async () => {
        fakeDb.loginAs("pai");
        const save = (plate: string) =>
            supabase.rpc("save_budget", { budget: draft({ vehicle: { ...makeBudget().vehicle, licensePlate: plate } }) });

        expect((await save("ABC1D23")).error).toBeNull();
        expect((await save("ABC-1234")).error).toBeNull();
        expect((await save("abc1d23")).error).toEqual(expect.objectContaining({ code: "23514" }));
        expect((await save("ABC1234")).error).toEqual(expect.objectContaining({ code: "23514" }));
    });

    it("usuário sem oficina não consegue salvar", async () => {
        fakeDb.loginAs("semOficina");
        const { error } = await supabase.rpc("save_budget", { budget: draft() });
        expect(error).toEqual({ code: "P0001", message: "Seu usuário ainda não está vinculado a uma oficina." });
    });

    it("guarda endereço e cor vazios como null", async () => {
        await fakeDb.seed("pai", [draft({ client: { name: "A", phone: "1", address: "" } })]);
        expect(fakeDb.rows("alocar")[0].client_address).toBeNull();
    });

    it("o filtro de busca real acha por nome, modelo, placa sem hífen e número '0007'", async () => {
        const vehicle = makeBudget().vehicle;
        await fakeDb.seed("pai", [
            draft({ client: { name: "Joana D'Arc", phone: "1" }, vehicle: { ...vehicle, model: "Uno", licensePlate: "QWE1R23" } }),
            draft({ client: { name: "João", phone: "1" }, vehicle: { ...vehicle, model: "Gol", licensePlate: "ABC-1234" } }),
            ...Array.from({ length: 5 }, () => draft({ client: { name: "Outro", phone: "1" }, vehicle: { ...vehicle, model: "Palio", licensePlate: "ZZZ9Z99" } })),
        ]);
        fakeDb.loginAs("pai");

        const search = async (term: string) => {
            const { data } = await supabase.from("budgets").select("*").order("number", { ascending: false }).or(buildBudgetSearchFilter(term)!);
            return (data as any[]).map((r) => r.number);
        };

        expect(await search("joana")).toEqual([1]);
        expect(await search("gol")).toEqual([2]);
        expect(await search("abc1234")).toEqual([2]);
        expect(await search("0007")).toEqual([7]);
        // Como o Postgres: ilike ignora maiúsculas, mas não acentos.
        expect(await search("joao")).toEqual([]);
    });

    it("range e order paginam do maior para o menor número", async () => {
        await fakeDb.seed("pai", Array.from({ length: 5 }, () => draft()));
        fakeDb.loginAs("pai");
        const { data } = await supabase.from("budgets").select("*").order("number", { ascending: false }).range(1, 2);
        expect((data as any[]).map((r) => r.number)).toEqual([4, 3]);
    });

    it("eq + maybeSingle devolve um orçamento ou null", async () => {
        const [id] = await fakeDb.seed("pai", [draft()]);
        fakeDb.loginAs("pai");
        expect((await supabase.from("budgets").select("*").eq("id", id).maybeSingle()).data).toEqual(expect.objectContaining({ id }));
        expect((await supabase.from("budgets").select("*").eq("id", "nao-existe").maybeSingle()).data).toBeNull();
    });

    it("delete só apaga orçamentos da própria oficina", async () => {
        const [id] = await fakeDb.seed("pai", [draft()]);
        fakeDb.loginAs("outraOficina");
        await supabase.from("budgets").delete().eq("id", id);
        expect(fakeDb.rows("alocar")).toHaveLength(1);

        fakeDb.loginAs("irmao");
        await supabase.from("budgets").delete().eq("id", id);
        expect(fakeDb.rows("alocar")).toHaveLength(0);
    });

    it("arredonda quantidade e preço a 2 casas, como numeric(10,2)/(12,2) no banco", async () => {
        await fakeDb.seed("pai", [draft({ services: [{ description: "Fluido", quantity: 1.333, price: 90.505 }] })]);
        expect(fakeDb.rows("alocar")[0].budget_items[0]).toMatchObject({ quantity: 1.33, unit_price: 90.51 });
    });

    it.each([
        ["ano fora de 1900–2100", { vehicle: { ...makeBudget().vehicle, year: 1899 } }, "23514"],
        ["ano vazio", { vehicle: { ...makeBudget().vehicle, year: "" as unknown as number } }, "22P02"],
        ["quantidade zero", { services: [{ description: "Item", quantity: 0, price: 10 }] }, "23514"],
        ["preço negativo", { services: [{ description: "Item", quantity: 1, price: -1 }] }, "23514"],
        ["descrição só com espaços", { services: [{ description: "  ", quantity: 1, price: 10 }] }, "23514"],
        ["descrição com mais de 500 letras", { services: [{ description: "x".repeat(501), quantity: 1, price: 10 }] }, "23514"],
        ["nome com mais de 120 letras", { client: { name: "x".repeat(121), phone: "1" } }, "23514"],
        ["telefone com mais de 20 letras", { client: { name: "A", phone: "1".repeat(21) } }, "23514"],
        ["endereço com mais de 200 letras", { client: { name: "A", phone: "1", address: "x".repeat(201) } }, "23514"],
        ["marca com mais de 60 letras", { vehicle: { ...makeBudget().vehicle, brand: "x".repeat(61) } }, "23514"],
        ["modelo com mais de 60 letras", { vehicle: { ...makeBudget().vehicle, model: "x".repeat(61) } }, "23514"],
        ["cor com mais de 40 letras", { vehicle: { ...makeBudget().vehicle, color: "x".repeat(41) } }, "23514"],
    ])("recusa %s como o banco (código %s)", async (_, overrides, code) => {
        fakeDb.loginAs("pai");
        const { error } = await supabase.rpc("save_budget", { budget: draft(overrides as any) });
        expect(error).toEqual(expect.objectContaining({ code }));
        expect(fakeDb.rows("alocar")).toEqual([]);
    });

    it("editar com id que não é UUID dá erro de formato (22P02), como o banco", async () => {
        fakeDb.loginAs("pai");
        const { error } = await supabase.rpc("save_budget", { budget: { ...draft(), id: "1697040000000" } });
        expect(error).toEqual(expect.objectContaining({ code: "22P02" }));
    });

    it("failNext com `after` deixa passar as primeiras chamadas e falha a seguinte", async () => {
        fakeDb.loginAs("pai");
        fakeDb.failNext("network", 1, 1);
        expect((await supabase.rpc("save_budget", { budget: draft() })).error).toBeNull();
        expect((await supabase.from("budgets").select("*")).error).toEqual({ message: "TypeError: Failed to fetch" });
        expect((await supabase.from("budgets").select("*")).error).toBeNull();
    });

    it("failNext('network') faz só a próxima chamada falhar", async () => {
        fakeDb.loginAs("pai");
        fakeDb.failNext("network");
        expect((await supabase.from("budgets").select("*")).error).toEqual({ message: "TypeError: Failed to fetch" });
        expect((await supabase.from("budgets").select("*")).error).toBeNull();
    });

    it("login: senha certa cria sessão e avisa quem escuta; senha errada dá erro", async () => {
        const events: string[] = [];
        supabase.auth.onAuthStateChange((event) => events.push(event));

        expect((await supabase.auth.signInWithPassword({ email: "pai@teste.com", password: "errada" })).error).toEqual(
            expect.objectContaining({ message: "Invalid login credentials" }),
        );
        expect((await supabase.auth.signInWithPassword({ email: "pai@teste.com", password: "senha-do-pai" })).error).toBeNull();
        expect(fakeDb.currentUser()).toBe("pai");
        expect((await supabase.auth.getSession()).data.session).not.toBeNull();

        await supabase.auth.signOut();
        expect(fakeDb.currentUser()).toBeNull();
        expect(events).toEqual(["SIGNED_IN", "SIGNED_OUT"]);
    });
});
