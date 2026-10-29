import { fireEvent, screen } from "@testing-library/react";
import { fillBudgetForm, pressButton, VALID_FORM } from "../../test-utils/budgetFormDriver";
import { fakeDb } from "../../test-utils/fakeSupabase";
import { renderApp } from "../../test-utils/renderApp";

jest.mock("../../services/supabase", () => jest.requireActual("../../test-utils/fakeSupabase").fakeSupabaseModule);
jest.mock("expo-router", () => jest.requireActual("../../test-utils/fakeRouter").fakeRouterModule);
jest.mock("@expo/vector-icons/Ionicons", () => jest.requireActual("../../test-utils/fakeIcons").fakeIoniconsModule);

// Fluxos completos renderizam o app inteiro: no CI podem passar dos 5 s padrão.
jest.setTimeout(15000);

const signIn = async (email: string, password: string) => {
    fireEvent.change(await screen.findByPlaceholderText("seu@email.com"), { target: { value: email } });
    fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: password } });
    pressButton("Entrar");
};

beforeEach(() => fakeDb.reset());

describe("login", () => {
    it("senha errada mostra 'E-mail ou senha incorretos.'", async () => {
        renderApp("/login");
        await signIn("pai@teste.com", "senha-errada");
        expect(await screen.findByText("E-mail ou senha incorretos.")).toBeTruthy();
        expect(fakeDb.currentUser()).toBeNull();
    });

    it("login certo leva ao formulário de novo orçamento", async () => {
        const app = renderApp("/login");
        await signIn("irmao@teste.com", "senha-do-irmao");
        expect(await screen.findByText("Gerar orçamento")).toBeTruthy();
        expect(app.path()).toBe("/");
    });

    it("Sair volta para o login", async () => {
        fakeDb.loginAs("pai");
        renderApp("/");
        fireEvent.click(await screen.findByLabelText("Conta"));
        pressButton("Sair");

        expect(await screen.findByPlaceholderText("seu@email.com")).toBeTruthy();
        expect(screen.queryByText("Gerar orçamento")).toBeNull();
    });

    it("Sair de propósito não deixa o orçamento digitado para o próximo login", async () => {
        fakeDb.loginAs("pai");
        renderApp("/");
        await screen.findByText("Gerar orçamento");
        fillBudgetForm(VALID_FORM);

        fireEvent.click(screen.getByLabelText("Conta"));
        pressButton("Sair");
        await signIn("irmao@teste.com", "senha-do-irmao");
        await screen.findByText("Gerar orçamento");
        expect((screen.getByPlaceholderText("Nome do cliente") as HTMLInputElement).value).toBe("");
    });

    it.each([["/history"], ["/budget/00000000-0000-4000-a000-000000000001"]] as const)(
        "sem login, abrir %s leva ao login",
        async (path) => {
            const app = renderApp(path);
            expect(await screen.findByPlaceholderText("seu@email.com")).toBeTruthy();
            expect(app.path()).toBe("/login");
        },
    );

    it("usuário sem oficina entra, mas ao gerar vê que não está vinculado a uma oficina", async () => {
        renderApp("/login");
        await signIn("sem@teste.com", "senha-sem");
        await screen.findByText("Gerar orçamento");

        fillBudgetForm(VALID_FORM);
        pressButton("Gerar orçamento");
        expect(await screen.findByText("Seu usuário ainda não está vinculado a uma oficina.")).toBeTruthy();
    });
});
