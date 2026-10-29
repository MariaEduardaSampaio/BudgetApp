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
const loadMore = () => fireEvent.click(screen.getByText("Carregar mais"));
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
    it("30 orçamentos: mostra todos e não tem Carregar mais", async () => {
        await seedMany(30);
        await openHistory();
        await expectNumbers(range(30, 1));
        expect(screen.queryByText("Carregar mais")).toBeNull();
    });

    it("31 orçamentos: Carregar mais traz o mais antigo", async () => {
        await seedMany(31);
        await openHistory();
        await expectNumbers(range(31, 2));

        loadMore();
        await expectNumbers(range(31, 1));
        expect(screen.queryByText("Carregar mais")).toBeNull();
    });

    it("orçamento criado por outra pessoa enquanto a lista está aberta não duplica nada ao carregar mais", async () => {
        await seedMany(31);
        await openHistory();
        await expectNumbers(range(31, 2));

        await fakeDb.seed("irmao", [draft("Novo do irmão")]); // vira o Nº 32
        loadMore();
        await expectNumbers(range(31, 1));
    });

    it("61 orçamentos: três páginas sem repetir nem pular, do mais novo ao mais antigo", async () => {
        await seedMany(61);
        await openHistory();
        await expectNumbers(range(61, 32));

        loadMore();
        await expectNumbers(range(61, 2));
        loadMore();
        await expectNumbers(range(61, 1));
        expect(screen.queryByText("Carregar mais")).toBeNull();
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
    it("busca com mais de 30 resultados pagina só dentro dos resultados", async () => {
        await seedMany(40, (i) => (i < 35 ? draft(`Gol ${i + 1}`, "Gol") : draft(`Uno ${i + 1}`, "Uno")));
        await openHistory();
        await expectNumbers(range(40, 11));

        search("gol");
        await expectNumbers(range(35, 6));
        loadMore();
        await expectNumbers(range(35, 1));
        expect(screen.queryByText("Carregar mais")).toBeNull();
    });
});
