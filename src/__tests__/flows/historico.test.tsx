import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { makeBudget } from "../../test-utils/budgetFactory";
import { fakeDb } from "../../test-utils/fakeSupabase";
import { renderApp } from "../../test-utils/renderApp";
import type { BudgetDraft } from "../../services/budgetService";

jest.mock("../../services/supabase", () => jest.requireActual("../../test-utils/fakeSupabase").fakeSupabaseModule);
jest.mock("expo-router", () => jest.requireActual("../../test-utils/fakeRouter").fakeRouterModule);
jest.mock("@expo/vector-icons/Ionicons", () => jest.requireActual("../../test-utils/fakeIcons").fakeIoniconsModule);
jest.mock("react-native-web/dist/exports/FlatList", () => jest.requireActual("../../test-utils/fakeFlatList").fakeFlatListModule);

// Fluxos completos renderizam o app inteiro: no CI podem passar dos 5 s padrão.
jest.setTimeout(15000);

const vehicle = makeBudget().vehicle;
const draft = (name: string, model = "Gol", licensePlate = "ABC-1234"): BudgetDraft => {
    const { id, number, createdAt, updatedAt, ...rest } = makeBudget({
        client: { name, phone: "(31) 98765-4321" },
        vehicle: { ...vehicle, model, licensePlate },
    });
    return rest;
};
const seedMany = (count: number, make = (i: number) => draft(`Cliente ${i + 1}`)) =>
    fakeDb.seed("pai", Array.from({ length: count }, (_, i) => make(i)));

/** Números dos orçamentos na tela, na ordem exibida. */
const shownNumbers = () =>
    screen.queryAllByLabelText(/^Abrir orçamento/).map((card) => Number(card.getAttribute("aria-label")!.match(/orçamento (\d+)/)![1]));
const range = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, i) => from - i);
const expectNumbers = (expected: number[]) => waitFor(() => expect(shownNumbers()).toEqual(expected), { timeout: 3000 });

const search = (text: string) => fireEvent.change(screen.getByPlaceholderText("Buscar por cliente, placa ou número"), { target: { value: text } });
// Os botões de página aparecem em cima e embaixo da lista; por padrão usa os de baixo.
const pagerButtons = (title: string) => screen.getAllByText(title).map((text) => text.closest<HTMLElement>("[role=button]")!);
const press = (title: string, where: "top" | "bottom" = "bottom") => {
    const [top, bottom] = pagerButtons(title);
    fireEvent.click(where === "top" ? top : bottom);
};
const choosePageSize = (size: number) => fireEvent.click(screen.getByRole("radio", { name: String(size) }));
/** Desativado nos dois lugares (em cima e embaixo). */
const isDisabled = (title: string) => {
    const states = pagerButtons(title).map((button) => button.getAttribute("aria-disabled") === "true");
    expect(states).toHaveLength(2);
    return states.every(Boolean);
};
/** "Página X de Y" aparece em cima e embaixo da lista. */
const expectPageInfo = (text: string) => expect(screen.getAllByText(text)).toHaveLength(2);
const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

const openHistory = async () => {
    renderApp("/history");
    await screen.findByPlaceholderText("Buscar por cliente, placa ou número");
};

beforeEach(() => {
    fakeDb.reset();
    fakeDb.loginAs("pai");
});

describe("histórico: paginação", () => {
    it("começa com 10 por página e mostra o total, a faixa e o número de páginas", async () => {
        await seedMany(41);
        await openHistory();
        await expectNumbers(range(41, 32));

        expect(screen.getByRole("radio", { name: "10" }).getAttribute("aria-checked")).toBe("true");
        expect(screen.getByText("Mostrando 1–10 de 41 orçamentos")).toBeTruthy();
        expectPageInfo("Página 1 de 5");
    });

    it("Próxima e Anterior trocam de página; nas pontas o botão fica desativado", async () => {
        await seedMany(41);
        await openHistory();
        await expectNumbers(range(41, 32));
        expect(isDisabled("Anterior")).toBe(true);

        press("Próxima");
        await expectNumbers(range(31, 22));
        expect(screen.getByText("Mostrando 11–20 de 41 orçamentos")).toBeTruthy();
        expectPageInfo("Página 2 de 5");

        press("Próxima");
        press("Próxima");
        press("Próxima");
        await expectNumbers([1]);
        expect(screen.getByText("Mostrando 41 de 41 orçamentos")).toBeTruthy();
        expect(isDisabled("Próxima")).toBe(true);

        press("Anterior");
        await expectNumbers(range(11, 2));
        expectPageInfo("Página 4 de 5");
    });

    it("os botões de cima também trocam de página", async () => {
        await seedMany(41);
        await openHistory();
        await expectNumbers(range(41, 32));

        press("Próxima", "top");
        await expectNumbers(range(31, 22));
        expectPageInfo("Página 2 de 5");

        press("Anterior", "top");
        await expectNumbers(range(41, 32));
        expectPageInfo("Página 1 de 5");
    });

    it.each([
        [1, [41], "Página 1 de 41"],
        [5, range(41, 37), "Página 1 de 9"],
        [20, range(41, 22), "Página 1 de 3"],
    ])("escolher %i por página mostra essa quantidade", async (size, numbers, pages) => {
        await seedMany(41);
        await openHistory();
        await expectNumbers(range(41, 32));

        choosePageSize(size);
        await expectNumbers(numbers);
        expectPageInfo(pages);
        expect(screen.getByRole("radio", { name: String(size) }).getAttribute("aria-checked")).toBe("true");
    });

    it("trocar a quantidade por página volta para a página 1", async () => {
        await seedMany(41);
        await openHistory();
        await expectNumbers(range(41, 32));
        press("Próxima");
        await expectNumbers(range(31, 22));

        choosePageSize(5);
        await expectNumbers(range(41, 37));
        expectPageInfo("Página 1 de 9");
    });

    it("com uma página só, não mostra os botões de página", async () => {
        await seedMany(7);
        await openHistory();
        await expectNumbers(range(7, 1));
        expect(screen.getByText("Mostrando 1–7 de 7 orçamentos")).toBeTruthy();
        expect(screen.queryByText("Próxima")).toBeNull();
    });

    it("um orçamento só: texto no singular", async () => {
        await seedMany(1);
        await openHistory();
        await expectNumbers([1]);
        expect(screen.getByText("Mostrando 1 de 1 orçamento")).toBeTruthy();
    });

    it("sem orçamentos: não mostra contagem nem seletor de página", async () => {
        await openHistory();
        expect(await screen.findByText("Nenhum orçamento ainda")).toBeTruthy();
        expect(screen.queryByText(/^Mostrando/)).toBeNull();
        expect(screen.queryByRole("radio")).toBeNull();
    });

    it("orçamento criado por outra pessoa aparece no total ao trocar de página", async () => {
        await seedMany(41);
        await openHistory();
        await expectNumbers(range(41, 32));

        await fakeDb.seed("irmao", [draft("Novo do irmão")]); // vira o Nº 42
        press("Próxima");
        await expectNumbers(range(32, 23));
        expect(screen.getByText("Mostrando 11–20 de 42 orçamentos")).toBeTruthy();
    });
});

describe("histórico: busca", () => {
    beforeEach(async () => {
        await fakeDb.seed("pai", [
            draft("Joana D'Arc", "Uno", "QWE1R23"),
            draft("João Pereira", "Gol", "ABC-1234"),
            draft("Pedro Silva", "Palio", "ZZZ9Z99"),
            ...Array.from({ length: 5 }, () => draft("Cliente Teste", "Palio", "ZZZ9Z99")),
        ]);
    });

    it.each([
        ["nome", "Joana", [1]],
        ["modelo", "Gol", [2]],
        ["placa sem hífen", "ABC1234", [2]],
        ["placa com hífen e minúsculas", "abc-1234", [2]],
        ["placa Mercosul", "qwe1r23", [1]],
        ["número", "7", [7]],
        ["número com zeros", "0007", [7]],
        ["apóstrofo", "D'Arc", [1]],
        ["acento", "João", [2]],
    ])("acha por %s (%s)", async (_, term, expected) => {
        await openHistory();
        await expectNumbers(range(8, 1));
        search(term);
        await expectNumbers(expected);
    });

    it("busca sem resultado mostra Nada encontrado; limpar volta à lista", async () => {
        await openHistory();
        await expectNumbers(range(8, 1));

        search("Fusca");
        expect(await screen.findByText("Nada encontrado")).toBeTruthy();
        search("");
        await expectNumbers(range(8, 1));
    });

    it("limitação conhecida: 'joao' sem acento não acha 'João' (ver README)", async () => {
        // Quando a busca passar a ignorar acentos, este teste deve passar a esperar [2].
        await openHistory();
        await expectNumbers(range(8, 1));
        search("joao");
        expect(await screen.findByText("Nada encontrado")).toBeTruthy();
    });

    it("caracteres especiais na busca não quebram: 'Silva, (' acha 'Pedro Silva'", async () => {
        await openHistory();
        await expectNumbers(range(8, 1));
        search("Silva, (");
        await expectNumbers([3]);
    });

    it("resposta atrasada de uma busca antiga não sobrescreve a nova", async () => {
        await openHistory();
        await expectNumbers(range(8, 1));

        fakeDb.delayNext(1000); // a busca por "Gol" vai demorar
        search("Gol");
        await wait(500); // a busca por "Gol" já saiu
        search("Uno");
        await expectNumbers([1]);

        await wait(1000); // a resposta de "Gol" chega agora
        expect(shownNumbers()).toEqual([1]);
    });
});

describe("histórico: busca com paginação", () => {
    it("a busca conta e pagina só dentro dos resultados", async () => {
        await seedMany(40, (i) => (i < 15 ? draft(`Gol ${i + 1}`, "Gol") : draft(`Uno ${i + 1}`, "Uno")));
        await openHistory();
        await expectNumbers(range(40, 31));

        search("gol");
        await expectNumbers(range(15, 6));
        expect(screen.getByText("Mostrando 1–10 de 15 orçamentos")).toBeTruthy();
        expectPageInfo("Página 1 de 2");

        press("Próxima");
        await expectNumbers(range(5, 1));
        expect(isDisabled("Próxima")).toBe(true);
    });

    it("buscar volta para a página 1", async () => {
        await seedMany(40, (i) => (i < 15 ? draft(`Gol ${i + 1}`, "Gol") : draft(`Uno ${i + 1}`, "Uno")));
        await openHistory();
        await expectNumbers(range(40, 31));
        press("Próxima");
        press("Próxima");
        await expectNumbers(range(20, 11));

        search("gol");
        await expectNumbers(range(15, 6));
        expectPageInfo("Página 1 de 2");
    });
});
