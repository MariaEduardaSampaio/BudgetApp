import { fakeDb } from "../../test-utils/fakeSupabase";
import { makeBudget } from "../../test-utils/budgetFactory";
import type { BudgetDraft } from "../budgetService";
import { deleteBudget, getBudget, listBudgets, PAGE_SIZE, saveBudget } from "../budgetStorage";

// O Supabase é o falso em memória (mesmas regras do banco), nunca o de verdade.
jest.mock("../supabase", () => jest.requireActual("../../test-utils/fakeSupabase").fakeSupabaseModule);

const draft = (overrides: Parameters<typeof makeBudget>[0] = {}): BudgetDraft => {
    const { id, number, createdAt, updatedAt, ...rest } = makeBudget(overrides);
    return rest;
};
const withModel = (model: string) => draft({ vehicle: { ...makeBudget().vehicle, model } });
const seedMany = (count: number) => fakeDb.seed("pai", Array.from({ length: count }, () => draft()));

beforeEach(() => {
    fakeDb.reset();
    fakeDb.loginAs("pai");
});

describe("listBudgets", () => {
    it("devolve do número maior para o menor", async () => {
        await seedMany(3);
        const { budgets } = await listBudgets();
        expect(budgets.map((b) => b.number)).toEqual([3, 2, 1]);
    });

    it(`com ${PAGE_SIZE} orçamentos, traz todos e hasMore é false`, async () => {
        await seedMany(PAGE_SIZE);
        const page = await listBudgets();
        expect(page.budgets).toHaveLength(PAGE_SIZE);
        expect(page.hasMore).toBe(false);
    });

    it(`com ${PAGE_SIZE + 1}, a primeira página traz ${PAGE_SIZE} e hasMore true; a segunda traz o mais antigo`, async () => {
        await seedMany(PAGE_SIZE + 1);

        const first = await listBudgets();
        expect(first.budgets).toHaveLength(PAGE_SIZE);
        expect(first.budgets[0].number).toBe(PAGE_SIZE + 1);
        expect(first.hasMore).toBe(true);

        const second = await listBudgets({ before: first.budgets.at(-1)!.number });
        expect(second.budgets.map((b) => b.number)).toEqual([1]);
        expect(second.hasMore).toBe(false);
    });

    it("a página seguinte não repete nem pula quando alguém cria ou exclui um orçamento no meio", async () => {
        const ids = await seedMany(PAGE_SIZE + 2); // Nº 1 a 32
        const first = await listBudgets();
        expect(first.budgets.at(-1)!.number).toBe(3);

        // Enquanto o pai olha a primeira página, o irmão cria um e exclui outro já mostrado.
        await fakeDb.seed("irmao", [draft()]);
        await deleteBudget(ids[31]);

        const second = await listBudgets({ before: first.budgets.at(-1)!.number });
        expect(second.budgets.map((b) => b.number)).toEqual([2, 1]);
    });

    it("a página seguinte respeita a busca", async () => {
        await fakeDb.seed("pai", Array.from({ length: PAGE_SIZE + 5 }, (_, i) => withModel(i % 2 ? "Uno" : "Gol")));
        const first = await listBudgets({ search: "gol" });
        const second = await listBudgets({ search: "gol", before: first.budgets.at(-1)!.number });
        const all = [...first.budgets, ...second.budgets];
        expect(all.every((b) => b.vehicle.model === "Gol")).toBe(true);
        expect(all).toHaveLength(18);
        expect(second.hasMore).toBe(false);
    });

    it("aplica a busca no banco", async () => {
        await fakeDb.seed("pai", [withModel("Uno"), withModel("Gol"), withModel("Palio")]);
        const { budgets } = await listBudgets({ search: "gol" });
        expect(budgets.map((b) => b.vehicle.model)).toEqual(["Gol"]);
    });

    it("repassa o erro do banco", async () => {
        fakeDb.failNext("network");
        await expect(listBudgets()).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining("Failed to fetch") }));
    });
});

describe("getBudget", () => {
    it("id que não é UUID (link de antes do Supabase) devolve null sem consultar o banco", async () => {
        fakeDb.failNext("network"); // se consultasse, daria erro
        await expect(getBudget("1697040000000")).resolves.toBeNull();
    });

    it("id inexistente devolve null", async () => {
        await expect(getBudget("00000000-0000-4000-a000-999999999999")).resolves.toBeNull();
    });

    it("devolve o orçamento com os itens na ordem", async () => {
        const services = [
            { description: "Primeiro", quantity: 1, price: 10 },
            { description: "Segundo", quantity: 2, price: 20 },
            { description: "Terceiro", quantity: 1.5, price: 30.5 },
        ];
        const [id] = await fakeDb.seed("pai", [draft({ services })]);
        const budget = await getBudget(id);
        expect(budget?.services).toEqual(services);
    });
});

describe("saveBudget", () => {
    it("novo orçamento volta com id, número e createdAt", async () => {
        const saved = await saveBudget(draft());
        expect(saved).toEqual(expect.objectContaining({ id: expect.any(String), number: 1, createdAt: expect.any(String) }));
        expect(saved.updatedAt).toBeUndefined();
    });

    it("edição volta com updatedAt e o mesmo número", async () => {
        const created = await saveBudget(draft());
        const edited = await saveBudget({ ...draft({ client: { name: "Nome Novo", phone: "(31) 3333-4444" } }), id: created.id });
        expect(edited.number).toBe(created.number);
        expect(edited.client.name).toBe("Nome Novo");
        expect(edited.updatedAt).toEqual(expect.any(String));
    });

    it("se salvou mas a internet caiu ao recarregar, o erro avisa sem conexão e traz o id salvo", async () => {
        fakeDb.failNext("network", 1, 1); // salvar passa, recarregar falha
        const error = await saveBudget(draft()).catch((e) => e);
        expect(error).toEqual(expect.objectContaining({ message: expect.stringContaining("Failed to fetch"), savedId: fakeDb.rows("alocar")[0].id }));

        // Tentar de novo com o id atualiza o mesmo orçamento.
        await saveBudget({ ...draft(), id: error.savedId });
        expect(fakeDb.rows("alocar")).toHaveLength(1);
    });

    it("repassa o erro de placa inválida (code 23514)", async () => {
        await expect(saveBudget(draft({ vehicle: { ...makeBudget().vehicle, licensePlate: "XYZ" } }))).rejects.toEqual(
            expect.objectContaining({ code: "23514" }),
        );
    });
});

describe("deleteBudget", () => {
    it("some da listagem depois de excluir", async () => {
        const [id] = await seedMany(2);
        await deleteBudget(id);
        const { budgets } = await listBudgets();
        expect(budgets.map((b) => b.number)).toEqual([2]);
    });
});
