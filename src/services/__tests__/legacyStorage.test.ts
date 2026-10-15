import type { Budget, BudgetDraft } from "../budgetService";
import { saveBudget } from "../budgetStorage";
import { importLegacyBudgets, LegacyBudget, readLegacyBudgets } from "../legacyStorage";

// O envio para o Supabase é simulado; aqui testamos só a lógica da importação.
jest.mock("../budgetStorage", () => ({ saveBudget: jest.fn() }));
const mockedSave = jest.mocked(saveBudget);

const legacy = (id: string, overrides: Partial<LegacyBudget> = {}): LegacyBudget => ({
    id,
    createdAt: "2026-10-10T12:00:00.000Z",
    client: { name: `Cliente ${id}`, phone: "(31) 98765-4321", address: "" },
    vehicle: { brand: "Fiat", model: "Uno", licensePlate: "ABC-1234", color: "", year: 2010 },
    services: [{ description: "Item", quantity: 1, price: 10 }],
    date: "2026-10-10T12:00:00.000Z",
    expiresAt: null,
    ...overrides,
});

// A versão antiga guardava o mais recente primeiro.
const storeLegacy = (budgets: LegacyBudget[]) => localStorage.setItem("budgets:v1", JSON.stringify(budgets));

beforeEach(() => {
    localStorage.clear();
    mockedSave.mockReset();
    mockedSave.mockImplementation(async (draft: BudgetDraft) => ({ ...draft, id: "novo", number: 1, createdAt: "" }) as Budget);
});

describe("importLegacyBudgets", () => {
    it("envia do mais antigo para o mais novo, para a numeração seguir a ordem", async () => {
        storeLegacy([legacy("recente"), legacy("antigo")]);

        expect(await importLegacyBudgets()).toBe(2);
        expect(mockedSave.mock.calls.map(([draft]) => draft.client.name)).toEqual(["Cliente antigo", "Cliente recente"]);
    });

    it("não envia o id local e mantém a data de criação original", async () => {
        storeLegacy([legacy("a", { createdAt: "2026-01-02T10:00:00.000Z" })]);

        await importLegacyBudgets();

        const [draft] = mockedSave.mock.calls[0];
        expect(draft).not.toHaveProperty("id");
        expect(draft.createdAt).toBe("2026-01-02T10:00:00.000Z");
    });

    it("corrige placas Mercosul salvas no formato antigo do app", async () => {
        storeLegacy([legacy("a", { vehicle: { brand: "Fiat", model: "Uno", licensePlate: "ABC-1D23", year: 2010 } })]);

        await importLegacyBudgets();

        expect(mockedSave.mock.calls[0][0].vehicle.licensePlate).toBe("ABC1D23");
    });

    it("apaga do aparelho depois de enviar tudo", async () => {
        storeLegacy([legacy("a"), legacy("b")]);

        await importLegacyBudgets();

        expect(await readLegacyBudgets()).toEqual([]);
        expect(localStorage.getItem("budgets:v1")).toBeNull();
    });

    it("se falhar no meio, mantém só os que faltam (tentar de novo não duplica)", async () => {
        storeLegacy([legacy("recente"), legacy("meio"), legacy("antigo")]);
        mockedSave
            .mockImplementationOnce(async (draft) => ({ ...draft, id: "1", number: 1, createdAt: "" }) as Budget)
            .mockRejectedValueOnce(new Error("Failed to fetch"));

        await expect(importLegacyBudgets()).rejects.toThrow("Failed to fetch");

        expect((await readLegacyBudgets()).map((b) => b.id)).toEqual(["recente", "meio"]);
    });

    it("não faz nada quando não há orçamentos antigos", async () => {
        expect(await importLegacyBudgets()).toBe(0);
        expect(mockedSave).not.toHaveBeenCalled();
    });
});
