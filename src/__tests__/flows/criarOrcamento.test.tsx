import { fireEvent, screen } from "@testing-library/react";
import { fillBudgetForm, pressButton, VALID_FORM } from "../../test-utils/budgetFormDriver";
import { fakeDb } from "../../test-utils/fakeSupabase";
import { renderApp } from "../../test-utils/renderApp";

// Fluxo completo: telas reais, com o Supabase e o expo-router falsos (nada sai da memória).
jest.mock("../../services/supabase", () => jest.requireActual("../../test-utils/fakeSupabase").fakeSupabaseModule);
jest.mock("expo-router", () => jest.requireActual("../../test-utils/fakeRouter").fakeRouterModule);
jest.mock("@expo/vector-icons/Ionicons", () => jest.requireActual("../../test-utils/fakeIcons").fakeIoniconsModule);

// Fluxos completos renderizam o app inteiro: no CI podem passar dos 5 s padrão.
jest.setTimeout(15000);

/** O valor aparece na tela (o detalhe repete alguns dados no resumo e na ficha). */
const expectShown = (text: string | RegExp) => expect(screen.getAllByText(text).length).toBeGreaterThan(0);

const openFromHistory = async (label: string | RegExp) => {
    fireEvent.click(await screen.findByLabelText(label));
    await screen.findByText(/^ORÇAMENTO Nº/);
};

beforeEach(() => {
    fakeDb.reset();
    fakeDb.loginAs("pai");
});

describe("criar orçamento", () => {
    it("salva só com os obrigatórios e o orçamento abre com os opcionais em branco", async () => {
        const app = renderApp("/");
        await screen.findByText("Gerar orçamento");

        fillBudgetForm(VALID_FORM);
        pressButton("Gerar orçamento");
        expect(await screen.findByText("Orçamento Nº 0001 pronto!")).toBeTruthy();

        await app.goTo("/history");
        await openFromHistory("Abrir orçamento 0001 de Cliente Teste");

        expectShown("Cliente Teste");
        expectShown("(31) 98765-4321");
        expectShown("ABC1D23");
        expect(screen.queryByText("Endereço")).toBeNull();
        expect(screen.queryByText("Cor")).toBeNull();
        expect(screen.getByLabelText("Compartilhar PDF")).toBeTruthy();
    });

    it("salva com todos os campos e mostra tudo igual ao digitado", async () => {
        const app = renderApp("/");
        await screen.findByText("Gerar orçamento");

        fillBudgetForm({
            ...VALID_FORM,
            name: "Maria da Conceição",
            address: "Rua das Flores, 10",
            brand: "Volkswagen",
            model: "Gol",
            plate: "ABC1234",
            year: "2014",
            color: "Prata",
            items: [
                { description: "Troca de óleo", price: "18000" },
                { description: "Pastilha de freio", quantity: "2", price: "9050" },
            ],
        });
        pressButton("Gerar orçamento");
        await screen.findByText("Orçamento Nº 0001 pronto!");

        await app.goTo("/history");
        await openFromHistory("Abrir orçamento 0001 de Maria da Conceição");

        for (const text of ["Maria da Conceição", "(31) 98765-4321", "Rua das Flores, 10", "Volkswagen", "Gol", "2014", "Prata", "ABC-1234", "Troca de óleo", "Pastilha de freio"]) {
            expectShown(text);
        }
        expect(screen.getAllByText(/R\$ 361,00/).length).toBeGreaterThan(0);
    });

    it("aceita placa Mercosul e placa antiga, digitadas em minúsculas", async () => {
        const app = renderApp("/");
        await screen.findByText("Gerar orçamento");

        fillBudgetForm({ ...VALID_FORM, name: "Mercosul", plate: "abc1d23" });
        pressButton("Gerar orçamento");
        await screen.findByText("Orçamento Nº 0001 pronto!");
        pressButton("Novo orçamento");

        fillBudgetForm({ ...VALID_FORM, name: "Antiga", plate: "abc1234" });
        pressButton("Gerar orçamento");
        await screen.findByText("Orçamento Nº 0002 pronto!");

        expect(fakeDb.rows("alocar").map((row) => row.vehicle_plate)).toEqual(["ABC1D23", "ABC-1234"]);

        await app.goTo("/history");
        await openFromHistory("Abrir orçamento 0002 de Antiga");
        expectShown("ABC-1234");
    });

    it("não salva com obrigatório faltando e avisa", async () => {
        renderApp("/");
        await screen.findByText("Gerar orçamento");

        fillBudgetForm({ ...VALID_FORM, name: "" });
        pressButton("Gerar orçamento");

        expect(await screen.findByText("Faltam algumas informações")).toBeTruthy();
        expect(fakeDb.rows("alocar")).toEqual([]);
    });

    it("tocar duas vezes em Gerar orçamento cria um só", async () => {
        renderApp("/");
        await screen.findByText("Gerar orçamento");
        fillBudgetForm(VALID_FORM);

        const button = screen.getByText("Gerar orçamento").closest<HTMLElement>("[role=button]")!;
        // Cada toque é um evento separado, como no navegador (a tela atualiza entre eles).
        fireEvent.click(button);
        fireEvent.click(button);

        await screen.findByText("Orçamento Nº 0001 pronto!");
        expect(fakeDb.rows("alocar")).toHaveLength(1);
    });

    const fillThreeDecimals = async () => {
        renderApp("/");
        await screen.findByText("Gerar orçamento");
        fillBudgetForm({ ...VALID_FORM, items: [{ description: "Fluido", quantity: "1,333", price: "9050" }] });
    };

    it("quantidade aceita no máximo 2 casas decimais, como o banco: 1,333 vira 1,33", async () => {
        await fillThreeDecimals();
        expect(screen.getByDisplayValue("1,33")).toBeTruthy();
    });

    it("quantidade com 3 casas: o total salvo é o mesmo que o formulário mostrou (1,33 × R$ 90,50 = R$ 120,37)", async () => {
        await fillThreeDecimals();
        expectShown(/R\$ 120,37/);
        pressButton("Gerar orçamento");
        expect(await screen.findByText(/Total: R\$ 120,37/)).toBeTruthy();
    });

    it("centavos e quantidade decimal dão o mesmo total em todas as telas", async () => {
        const app = renderApp("/");
        await screen.findByText("Gerar orçamento");

        fillBudgetForm({
            ...VALID_FORM,
            items: [
                { description: "Mão de obra", price: "18000" },
                { description: "Fluido", quantity: "1,5", price: "9050" },
            ],
        });
        pressButton("Gerar orçamento");
        expect(await screen.findByText(/Total: R\$ 315,75/)).toBeTruthy();

        await app.goTo("/history");
        expect(await screen.findByText(/R\$ 315,75/)).toBeTruthy();

        await openFromHistory("Abrir orçamento 0001 de Cliente Teste");
        expect(screen.getAllByText(/R\$ 315,75/).length).toBeGreaterThan(0);
    });
});
