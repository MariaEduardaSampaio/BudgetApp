import { act, fireEvent, screen } from "@testing-library/react";
import { fillBudgetForm, pressButton, VALID_FORM } from "../../test-utils/budgetFormDriver";
import { makeBudget } from "../../test-utils/budgetFactory";
import { FakeUser, fakeDb } from "../../test-utils/fakeSupabase";
import { renderApp } from "../../test-utils/renderApp";

// Pai e irmão usam logins diferentes na mesma oficina; "outraOficina" é qualquer outra oficina.
jest.mock("../../services/supabase", () => jest.requireActual("../../test-utils/fakeSupabase").fakeSupabaseModule);
jest.mock("expo-router", () => jest.requireActual("../../test-utils/fakeRouter").fakeRouterModule);
jest.mock("@expo/vector-icons/Ionicons", () => jest.requireActual("../../test-utils/fakeIcons").fakeIoniconsModule);

// Fluxos completos renderizam o app inteiro: no CI podem passar dos 5 s padrão.
jest.setTimeout(15000);

type App = ReturnType<typeof renderApp>;

const expectShown = (text: string | RegExp) => expect(screen.getAllByText(text).length).toBeGreaterThan(0);

/** Troca de login com o app aberto (como sair e entrar com outra conta). */
const switchTo = (user: FakeUser) => act(() => fakeDb.loginAs(user));

const openFromHistory = async (app: App, label: string) => {
    await app.goTo("/history");
    fireEvent.click(await screen.findByLabelText(label));
    await screen.findByText(/^ORÇAMENTO Nº/);
};

const createOnScreen = async (data: Partial<typeof VALID_FORM>, number: string) => {
    fillBudgetForm({ ...VALID_FORM, ...data });
    pressButton("Gerar orçamento");
    await screen.findByText(`Orçamento Nº ${number} pronto!`);
    pressButton("Novo orçamento");
};

const draft = () => {
    const { id, number, createdAt, updatedAt, ...rest } = makeBudget();
    return rest;
};

beforeEach(() => {
    fakeDb.reset();
    fakeDb.loginAs("pai");
});

describe("oficina compartilhada", () => {
    it("o irmão vê o orçamento criado pelo pai com todos os dados", async () => {
        const app = renderApp("/");
        await screen.findByText("Gerar orçamento");
        await createOnScreen(
            {
                name: "Antônio Carlos",
                address: "Av. Brasil, 500",
                brand: "Chevrolet",
                model: "Onix",
                plate: "RST2U34",
                year: "2019",
                color: "Branco",
                items: [
                    { description: "Revisão completa", price: "45000" },
                    { description: "Filtro de ar", quantity: "2", price: "3500" },
                ],
            },
            "0001",
        );

        switchTo("irmao");
        await openFromHistory(app, "Abrir orçamento 0001 de Antônio Carlos");

        for (const text of ["Antônio Carlos", "(31) 98765-4321", "Av. Brasil, 500", "Chevrolet", "Onix", "RST2U34", "2019", "Branco", "Revisão completa", "Filtro de ar", /R\$ 520,00/]) {
            expectShown(text);
        }
    });

    it("a edição do irmão aparece para o pai, com o mesmo número", async () => {
        const app = renderApp("/");
        await screen.findByText("Gerar orçamento");
        await createOnScreen({ name: "Seu Joaquim" }, "0001");

        switchTo("irmao");
        await openFromHistory(app, "Abrir orçamento 0001 de Seu Joaquim");
        pressButton("Editar orçamento");
        fillBudgetForm({ phone: "3133334444", items: [{ description: "Troca de óleo e filtro", price: "22000" }] });
        pressButton("Salvar");
        await screen.findByText("Editar orçamento");

        switchTo("pai");
        await openFromHistory(app, "Abrir orçamento 0001 de Seu Joaquim");
        expectShown("(31) 3333-4444");
        expectShown("Troca de óleo e filtro");
        expectShown(/R\$ 220,00/);
        expectShown("ORÇAMENTO Nº 0001");
        expect(fakeDb.rows("alocar")).toHaveLength(1);
    });

    it("o que um exclui some para o outro", async () => {
        const [id] = await fakeDb.seed("pai", [draft()]);
        const app = renderApp("/");
        await screen.findByText("Gerar orçamento");

        await openFromHistory(app, "Abrir orçamento 0001 de Cliente Teste");
        pressButton("Excluir orçamento");
        pressButton("Excluir");
        await screen.findByText("Nenhum orçamento ainda");

        switchTo("irmao");
        await app.goTo("/");
        await app.goTo("/history");
        expect(await screen.findByText("Nenhum orçamento ainda")).toBeTruthy();

        await app.goTo(`/budget/${id}`);
        expect(await screen.findByText("Orçamento não encontrado")).toBeTruthy();
    });

    it("a numeração é compartilhada: pai 0001, irmão 0002, pai 0003", async () => {
        renderApp("/");
        await screen.findByText("Gerar orçamento");

        await createOnScreen({ name: "Primeiro" }, "0001");
        switchTo("irmao");
        await createOnScreen({ name: "Segundo" }, "0002");
        switchTo("pai");
        await createOnScreen({ name: "Terceiro" }, "0003");
    });

    it("outra oficina não vê nada da Alocar", async () => {
        const [id] = await fakeDb.seed("pai", [draft(), draft(), draft()]);
        fakeDb.loginAs("outraOficina");
        const app = renderApp("/history");

        expect(await screen.findByText("Nenhum orçamento ainda")).toBeTruthy();
        await app.goTo(`/budget/${id}`);
        expect(await screen.findByText("Orçamento não encontrado")).toBeTruthy();
    });
});
