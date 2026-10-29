import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import type { BudgetDraft } from "../../services/budgetService";
import { fillBudgetForm, pressButton, VALID_FORM } from "../../test-utils/budgetFormDriver";
import { makeBudget } from "../../test-utils/budgetFactory";
import { fakeDb } from "../../test-utils/fakeSupabase";
import { renderApp } from "../../test-utils/renderApp";

jest.mock("../../services/supabase", () => jest.requireActual("../../test-utils/fakeSupabase").fakeSupabaseModule);
jest.mock("expo-router", () => jest.requireActual("../../test-utils/fakeRouter").fakeRouterModule);
jest.mock("@expo/vector-icons/Ionicons", () => jest.requireActual("../../test-utils/fakeIcons").fakeIoniconsModule);
jest.mock("react-native-web/dist/exports/FlatList", () => jest.requireActual("../../test-utils/fakeFlatList").fakeFlatListModule);

// Fluxos completos renderizam o app inteiro: no CI podem passar dos 5 s padrão.
jest.setTimeout(15000);

const OFFLINE = "Sem conexão com a internet. Verifique e tente de novo.";

const draft = (): BudgetDraft => {
    const { id, number, createdAt, updatedAt, ...rest } = makeBudget();
    return rest;
};
const cards = () => screen.queryAllByLabelText(/^Abrir orçamento/);
const valueOf = (placeholder: string) => (screen.getByPlaceholderText(placeholder) as HTMLInputElement).value;

beforeEach(() => {
    fakeDb.reset();
    fakeDb.loginAs("pai");
});

describe("sem internet", () => {
    it("salvar sem internet avisa e mantém o que foi digitado; com a rede de volta salva", async () => {
        renderApp("/");
        await screen.findByText("Gerar orçamento");
        fillBudgetForm({ ...VALID_FORM, address: "Rua das Flores, 10" });

        fakeDb.failNext("network");
        pressButton("Gerar orçamento");
        expect(await screen.findByText("Não foi possível salvar")).toBeTruthy();
        expect(screen.getByText(OFFLINE)).toBeTruthy();
        expect(fakeDb.rows("alocar")).toEqual([]);

        pressButton("Fechar");
        expect(valueOf("Nome do cliente")).toBe("Cliente Teste");
        expect(valueOf("Rua, número, bairro")).toBe("Rua das Flores, 10");
        expect(valueOf("ABC1D23")).toBe("ABC1D23");
        expect(valueOf("Ex.: Troca de óleo e filtro")).toBe("Troca de óleo");

        pressButton("Gerar orçamento");
        expect(await screen.findByText("Orçamento Nº 0001 pronto!")).toBeTruthy();
    });

    const fillThenLoseSession = async () => {
        renderApp("/");
        await screen.findByText("Gerar orçamento");
        fillBudgetForm(VALID_FORM);
        // A renovação do login falhou de vez: o Supabase avisa SIGNED_OUT.
        act(() => fakeDb.loginAs(null));
        await screen.findByPlaceholderText("seu@email.com");
    };

    it("sessão que expira de vez no meio do formulário leva ao login", async () => {
        await fillThenLoseSession();
        expect(screen.queryByText("Gerar orçamento")).toBeNull();
    });

    it("sessão que expira de vez: depois de entrar de novo, o que foi digitado continua lá", async () => {
        await fillThenLoseSession();
        act(() => fakeDb.loginAs("pai"));
        await screen.findByText("Gerar orçamento");
        expect(valueOf("Nome do cliente")).toBe("Cliente Teste");
    });

    const saveThenLoseConnection = async () => {
        renderApp("/");
        await screen.findByText("Gerar orçamento");
        fillBudgetForm(VALID_FORM);
        fakeDb.failNext("network", 1, 1); // salvar passa; recarregar o orçamento salvo falha
        pressButton("Gerar orçamento");
        await screen.findByText(OFFLINE);
    };

    it("salvou, mas a internet caiu ao recarregar: o orçamento ficou salvo e a tela avisa sem conexão", async () => {
        await saveThenLoseConnection();
        expect(fakeDb.rows("alocar")).toHaveLength(1);
    });

    it("salvou, mas a internet caiu ao recarregar: tentar de novo não duplica o orçamento", async () => {
        await saveThenLoseConnection();
        pressButton("Fechar");
        pressButton("Gerar orçamento");
        await screen.findByText(/pronto!/);
        expect(fakeDb.rows("alocar")).toHaveLength(1);
    });

    it("resposta 'JWT expired' ao salvar avisa que a sessão expirou e mantém os dados", async () => {
        renderApp("/");
        await screen.findByText("Gerar orçamento");
        fillBudgetForm(VALID_FORM);

        fakeDb.failNext("jwt");
        pressButton("Gerar orçamento");
        expect(await screen.findByText("Sua sessão expirou. Entre novamente.")).toBeTruthy();
        pressButton("Fechar");
        expect(valueOf("Nome do cliente")).toBe("Cliente Teste");
    });

    it("histórico sem internet mostra o erro e Tentar de novo, não lista vazia", async () => {
        await fakeDb.seed("pai", [draft(), draft()]);
        fakeDb.failNext("network");
        renderApp("/history");

        expect(await screen.findByText("Não foi possível carregar")).toBeTruthy();
        expect(screen.getByText(OFFLINE)).toBeTruthy();
        expect(screen.queryByText("Nenhum orçamento ainda")).toBeNull();

        pressButton("Tentar de novo");
        await waitFor(() => expect(cards()).toHaveLength(2));
    });

    it("Carregar mais sem internet avisa e mantém os orçamentos já carregados", async () => {
        await fakeDb.seed("pai", Array.from({ length: 31 }, draft));
        renderApp("/history");
        await waitFor(() => expect(cards()).toHaveLength(30));

        fakeDb.failNext("network");
        fireEvent.click(screen.getByText("Carregar mais"));
        expect(await screen.findByText(OFFLINE)).toBeTruthy();
        expect(cards()).toHaveLength(30);
    });

    it("abrir orçamento sem internet mostra o erro e Tentar de novo", async () => {
        const [id] = await fakeDb.seed("pai", [draft()]);
        fakeDb.failNext("network");
        renderApp(`/budget/${id}`);

        expect(await screen.findByText("Não foi possível carregar")).toBeTruthy();
        expect(screen.getByText(OFFLINE)).toBeTruthy();

        pressButton("Tentar de novo");
        expect(await screen.findByText("ORÇAMENTO Nº 0001")).toBeTruthy();
    });

    it("excluir sem internet avisa e não exclui", async () => {
        const [id] = await fakeDb.seed("pai", [draft()]);
        renderApp(`/budget/${id}`);
        await screen.findByText("ORÇAMENTO Nº 0001");

        pressButton("Excluir orçamento");
        fakeDb.failNext("network");
        pressButton("Excluir");

        expect(await screen.findByText(OFFLINE)).toBeTruthy();
        expect(fakeDb.rows("alocar")).toHaveLength(1);
    });

    it("entrar sem internet avisa", async () => {
        fakeDb.loginAs(null);
        renderApp("/login");
        fireEvent.change(await screen.findByPlaceholderText("seu@email.com"), { target: { value: "pai@teste.com" } });
        fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: "senha-do-pai" } });

        fakeDb.failNext("network");
        pressButton("Entrar");
        expect(await screen.findByText(OFFLINE)).toBeTruthy();
        expect(fakeDb.currentUser()).toBeNull();
    });
});
