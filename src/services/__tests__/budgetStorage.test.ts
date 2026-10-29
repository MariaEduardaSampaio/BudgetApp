import { fakeDb } from "../../test-utils/fakeSupabase";
import { makeBudget } from "../../test-utils/budgetFactory";
import type { BudgetDraft } from "../budgetService";
import { DEFAULT_PAGE_SIZE, deleteBudget, getBudget, listBudgets, saveBudget } from "../budgetStorage";

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

    it(`sem tamanho de página, traz ${DEFAULT_PAGE_SIZE} e o total de orçamentos`, async () => {
        await seedMany(DEFAULT_PAGE_SIZE + 2);
        const page = await listBudgets();
        expect(page.budgets.map((b) => b.number)).toEqual(Array.from({ length: DEFAULT_PAGE_SIZE }, (_, i) => DEFAULT_PAGE_SIZE + 2 - i));
        expect(page.total).toBe(DEFAULT_PAGE_SIZE + 2);
        expect(page.page).toBe(1);
    });

    it("traz a página pedida, com o tamanho escolhido", async () => {
        await seedMany(12);
        expect((await listBudgets({ page: 1, pageSize: 5 })).budgets.map((b) => b.number)).toEqual([12, 11, 10, 9, 8]);
        expect((await listBudgets({ page: 2, pageSize: 5 })).budgets.map((b) => b.number)).toEqual([7, 6, 5, 4, 3]);
        const last = await listBudgets({ page: 3, pageSize: 5 });
        expect(last.budgets.map((b) => b.number)).toEqual([2, 1]);
        expect(last.total).toBe(12);
    });

    it("sem orçamentos: lista vazia, total 0, página 1", async () => {
        expect(await listBudgets({ page: 1, pageSize: 5 })).toEqual({ budgets: [], total: 0, page: 1 });
    });

    it("página que deixou de existir (excluíram o último dela) devolve a última página que existe", async () => {
        const ids = await seedMany(6);
        await deleteBudget(ids[0]); // sobram 5: cabem numa página só
        const page = await listBudgets({ page: 2, pageSize: 5 });
        expect(page.page).toBe(1);
        expect(page.budgets.map((b) => b.number)).toEqual([6, 5, 4, 3, 2]);
        expect(page.total).toBe(5);
    });

    it("página muito além do fim também volta para a última", async () => {
        await seedMany(7);
        const page = await listBudgets({ page: 50, pageSize: 5 });
        expect(page.page).toBe(2);
        expect(page.budgets.map((b) => b.number)).toEqual([2, 1]);
    });

    it("a busca vale para o total e para as páginas", async () => {
        await fakeDb.seed("pai", Array.from({ length: 25 }, (_, i) => withModel(i % 2 ? "Uno" : "Gol"))); // 13 Gol
        const first = await listBudgets({ search: "gol", page: 1, pageSize: 10 });
        const second = await listBudgets({ search: "gol", page: 2, pageSize: 10 });
        const all = [...first.budgets, ...second.budgets];
        expect(first.total).toBe(13);
        expect(all).toHaveLength(13);
        expect(all.every((b) => b.vehicle.model === "Gol")).toBe(true);
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
