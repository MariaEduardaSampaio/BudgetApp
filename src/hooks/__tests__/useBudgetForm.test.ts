import { act, renderHook } from "@testing-library/react";
import type { Budget, BudgetDraft } from "../../services/budgetService";
import { saveBudget } from "../../services/budgetStorage";
import { makeBudget } from "../../test-utils/budgetFactory";
import { useBudgetForm } from "../useBudgetForm";

// O Supabase é simulado: o "banco" devolve o que recebeu, com id e número.
jest.mock("../../services/budgetStorage", () => ({ saveBudget: jest.fn() }));
const mockedSave = jest.mocked(saveBudget);

const plain = (text: string) => text.replace(/\s/g, " ");
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
    mockedSave.mockReset();
    mockedSave.mockImplementation(async (draft: BudgetDraft): Promise<Budget> => ({
        ...draft,
        id: draft.id ?? "novo-id",
        number: 1,
        createdAt: "2026-10-14T12:00:00.000Z",
        updatedAt: draft.id ? "2026-10-15T12:00:00.000Z" : undefined,
    }));
});

/** Último orçamento enviado para salvar. */
const lastDraft = () => mockedSave.mock.calls.at(-1)![0];

/** Preenche um formulário novo com dados válidos. */
const fillValidForm = (form: ReturnType<typeof useBudgetForm>) => {
    act(() => {
        form.setName("Cliente Teste");
        form.setPhone("31987654321");
        form.setBrand("Fiat");
        form.setModel("Uno");
        form.setLicensePlate("abc1d23");
        form.setYear("2010");
        form.updateService(0, "description", "Troca de óleo");
        form.updateService(0, "price", "18000");
    });
};

const submit = async (form: ReturnType<typeof useBudgetForm>) => {
    let saved: Budget | null = null;
    await act(async () => {
        saved = await form.submit();
    });
    return saved as Budget | null;
};

describe("useBudgetForm — novo orçamento", () => {
    it("começa com um item, quantidade 1 e validade de 15 dias", () => {
        const { result } = renderHook(() => useBudgetForm());

        expect(result.current.services).toEqual([{ description: "", quantity: "1", price: "" }]);
        expect(result.current.validityDays).toBe(15);
        expect(result.current.total).toBe(0);
    });

    it("aplica as máscaras ao digitar", () => {
        const { result } = renderHook(() => useBudgetForm());

        act(() => {
            result.current.setPhone("31987654321");
            result.current.setLicensePlate("abc1234");
            result.current.setYear("20a14x9");
            result.current.updateService(0, "price", "18050");
        });

        expect(result.current.phone).toBe("(31) 98765-4321");
        expect(result.current.licensePlate).toBe("ABC-1234");
        expect(result.current.year).toBe("2014");
        expect(plain(result.current.services[0].price)).toBe("R$ 180,50");
    });

    it("recalcula o total ao mudar quantidade e preço", () => {
        const { result } = renderHook(() => useBudgetForm());

        act(() => {
            result.current.updateService(0, "quantity", "2");
            result.current.updateService(0, "price", "9050");
            result.current.addService();
        });
        act(() => {
            result.current.updateService(1, "quantity", "1,5");
            result.current.updateService(1, "price", "1000");
        });

        expect(result.current.total).toBeCloseTo(2 * 90.5 + 1.5 * 10, 2);
    });

    it("adiciona e remove itens", () => {
        const { result } = renderHook(() => useBudgetForm());

        act(() => result.current.addService());
        act(() => result.current.updateService(1, "description", "Segundo"));
        act(() => result.current.removeService(0));

        expect(result.current.services.map((s) => s.description)).toEqual(["Segundo"]);
    });

    it("só destaca erros depois da primeira tentativa de salvar", async () => {
        const { result } = renderHook(() => useBudgetForm());
        expect(result.current.errorFor("name")).toBeUndefined();

        const saved = await submit(result.current);

        expect(saved).toBeNull();
        expect(result.current.showMissingDialog).toBe(true);
        expect(result.current.errorFor("name")).toBe("Preencha este campo");
        expect(mockedSave).not.toHaveBeenCalled();
    });

    it("o erro some assim que o campo é corrigido", async () => {
        const { result } = renderHook(() => useBudgetForm());
        await submit(result.current);

        act(() => result.current.setName("Cliente Teste"));

        expect(result.current.errorFor("name")).toBeUndefined();
    });

    it("envia um orçamento novo (sem id) com números e datas corretos", async () => {
        const { result } = renderHook(() => useBudgetForm());
        fillValidForm(result.current);

        const saved = await submit(result.current);

        const draft = lastDraft();
        expect(draft.id).toBeUndefined();
        expect(draft.vehicle).toMatchObject({ licensePlate: "ABC1D23", year: 2010 });
        expect(draft.services).toEqual([{ description: "Troca de óleo", quantity: 1, price: 180 }]);
        expect(new Date(draft.expiresAt!).getTime() - new Date(draft.date).getTime()).toBe(15 * DAY_MS);
        expect(saved).toMatchObject({ id: "novo-id", number: 1 });
    });

    it("mostra uma mensagem amigável quando o salvamento falha", async () => {
        mockedSave.mockRejectedValueOnce(new TypeError("Failed to fetch"));
        const { result } = renderHook(() => useBudgetForm());
        fillValidForm(result.current);

        const saved = await submit(result.current);

        expect(saved).toBeNull();
        expect(result.current.saveError).toBe("Sem conexão com a internet. Verifique e tente de novo.");
        expect(result.current.isSaving).toBe(false);
    });

    it("salva sem validade quando 'Sem validade' é escolhido", async () => {
        const { result } = renderHook(() => useBudgetForm());
        fillValidForm(result.current);
        act(() => result.current.setValidityDays(null));

        await submit(result.current);

        expect(lastDraft().expiresAt).toBeNull();
    });

    it("limpa o formulário para um novo orçamento", () => {
        const { result } = renderHook(() => useBudgetForm());
        fillValidForm(result.current);

        act(() => result.current.resetForm());

        expect(result.current.name).toBe("");
        expect(result.current.licensePlate).toBe("");
        expect(result.current.services).toHaveLength(1);
        expect(result.current.total).toBe(0);
    });
});

describe("useBudgetForm — editando um orçamento", () => {
    const existing = makeBudget({
        services: [{ description: "Óleo (litros)", quantity: 3.5, price: 45.9 }],
    });

    it("preenche o formulário com os dados salvos", () => {
        const { result } = renderHook(() => useBudgetForm(existing));

        expect(result.current.name).toBe("Cliente Teste");
        expect(result.current.year).toBe("2014");
        expect(result.current.services[0].quantity).toBe("3,5");
        expect(plain(result.current.services[0].price)).toBe("R$ 45,90");
        expect(result.current.validityDays).toBe(15);
    });

    it("converte placas salvas no formato antigo do app (ABC-1D23)", () => {
        const legacy = makeBudget({ vehicle: { ...existing.vehicle, licensePlate: "ABC-1D23" } });
        const { result } = renderHook(() => useBudgetForm(legacy));

        expect(result.current.licensePlate).toBe("ABC1D23");
    });

    it("envia o id do orçamento para atualizar (número e criação ficam com o banco)", async () => {
        const { result } = renderHook(() => useBudgetForm(existing));
        act(() => result.current.setName("Nome Editado"));

        await submit(result.current);

        const draft = lastDraft();
        expect(draft.id).toBe(existing.id);
        expect(draft.client.name).toBe("Nome Editado");
        expect(draft.services).toEqual(existing.services);
        expect(draft).not.toHaveProperty("number");
        expect(draft).not.toHaveProperty("createdAt");
    });
});
