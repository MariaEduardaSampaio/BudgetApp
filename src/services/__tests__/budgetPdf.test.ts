import { makeBudget } from "../../test-utils/budgetFactory";
import { buildBudgetPdf, getBudgetFileName } from "../budgetPdf";
import type { Service } from "../budgetService";

// O PDF é gerado sem compressão, então os textos aparecem legíveis no conteúdo do arquivo.
const pdfText = (budget = makeBudget()) => buildBudgetPdf(budget).output();

const manyServices = (count: number): Service[] =>
    Array.from({ length: count }, (_, i) => ({ description: `Servico ${i + 1}`, quantity: 1, price: 100 }));

describe("getBudgetFileName", () => {
    it("usa o número, a placa sem hífen e a data do orçamento", () => {
        expect(getBudgetFileName(makeBudget())).toBe("Orcamento_0007_ABC1234_2026-10-14.pdf");
    });

    it("usa a data local (um orçamento feito à noite não vira o dia seguinte)", () => {
        const budget = makeBudget({ date: new Date(2026, 9, 14, 23, 30).toISOString() });
        expect(getBudgetFileName(budget)).toBe("Orcamento_0007_ABC1234_2026-10-14.pdf");
    });
});

describe("buildBudgetPdf", () => {
    it("inclui o número, os dados do cliente, do veículo e dos itens", () => {
        const text = pdfText();
        expect(text).toContain("ORÇAMENTO Nº 0007");
        expect(text).toContain("Cliente Teste");
        expect(text).toContain("ABC-1234");
        expect(text).toContain("Troca de oleo e filtro");
        expect(text).toContain("Pastilha de freio");
    });

    it("mostra o total com o valor correto (180 + 2 × 90,50)", () => {
        expect(pdfText()).toContain("R$ 361,00");
    });

    it("cabe em uma página quando há poucos itens", () => {
        expect(buildBudgetPdf(makeBudget()).getNumberOfPages()).toBe(1);
    });

    it("quebra em várias páginas e numera todas quando há muitos itens", () => {
        const doc = buildBudgetPdf(makeBudget({ services: manyServices(60) }));
        const pages = doc.getNumberOfPages();

        expect(pages).toBeGreaterThan(1);
        const text = doc.output();
        for (let page = 1; page <= pages; page++) {
            expect(text).toContain(`${page} de ${pages}`);
        }
        expect(text).toContain("Servico 60");
    });

    it("só mostra a validade quando ela existe", () => {
        expect(pdfText(makeBudget())).toContain("29/10/2026");
        expect(pdfText(makeBudget({ expiresAt: null }))).not.toContain("29/10/2026");
    });

    it("usa a data da última edição em 'Gerado em'", () => {
        const edited = makeBudget({ updatedAt: new Date(2026, 9, 20, 9, 15).toISOString() });
        expect(pdfText(edited)).toContain("20/10/2026 09:15");
    });
});
