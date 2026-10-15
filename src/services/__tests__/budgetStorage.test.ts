import { makeBudget } from "../../test-utils/budgetFactory";
import { deleteBudget, getBudget, listBudgets, saveBudget } from "../budgetStorage";

// Na web o AsyncStorage usa o localStorage do navegador (o jsdom simula um nos testes).
beforeEach(() => localStorage.clear());

describe("budgetStorage", () => {
    it("começa vazio", async () => {
        expect(await listBudgets()).toEqual([]);
    });

    it("coloca orçamentos novos no topo da lista", async () => {
        await saveBudget(makeBudget({ id: "a" }));
        await saveBudget(makeBudget({ id: "b" }));

        expect((await listBudgets()).map((b) => b.id)).toEqual(["b", "a"]);
    });

    it("atualiza um orçamento existente sem mudar a posição dele", async () => {
        await saveBudget(makeBudget({ id: "a" }));
        await saveBudget(makeBudget({ id: "b" }));
        await saveBudget(makeBudget({ id: "a", client: { name: "Nome Editado", phone: "(31) 98765-4321" } }));

        const budgets = await listBudgets();
        expect(budgets.map((b) => b.id)).toEqual(["b", "a"]);
        expect(budgets[1].client.name).toBe("Nome Editado");
    });

    it("busca um orçamento pelo id", async () => {
        await saveBudget(makeBudget({ id: "a" }));

        expect((await getBudget("a"))?.id).toBe("a");
        expect(await getBudget("nao-existe")).toBeNull();
    });

    it("exclui só o orçamento escolhido", async () => {
        await saveBudget(makeBudget({ id: "a" }));
        await saveBudget(makeBudget({ id: "b" }));
        await deleteBudget("a");

        expect((await listBudgets()).map((b) => b.id)).toEqual(["b"]);
    });
});
