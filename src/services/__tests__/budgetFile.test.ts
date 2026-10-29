import { makeBudget } from "../../test-utils/budgetFactory";
import { downloadBudgetPdf, shareBudgetPdf, viewBudgetPdf } from "../budgetFile";
import { getBudgetFileName } from "../budgetPdf";

// O jsdom não tem URL.createObjectURL nem Web Share: simulamos o navegador.
const budget = makeBudget();
let downloads: string[];

beforeEach(() => {
    downloads = [];
    URL.createObjectURL = jest.fn(() => "blob:pdf");
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push(this.download);
    });
    Object.assign(navigator, { canShare: undefined, share: undefined });
});

afterEach(() => jest.restoreAllMocks());

describe("compartilhar", () => {
    it("usa o menu de compartilhar com o arquivo .pdf quando o navegador suporta", async () => {
        const share = jest.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { canShare: () => true, share });

        await expect(shareBudgetPdf(budget)).resolves.toBe("done");
        const [{ files }] = share.mock.calls[0];
        expect(files[0].name).toBe(getBudgetFileName(budget));
        expect(files[0].type).toBe("application/pdf");
        expect(downloads).toEqual([]);
    });

    it("baixa o PDF quando o navegador não sabe compartilhar arquivos", async () => {
        await expect(shareBudgetPdf(budget)).resolves.toBe("downloaded");
        expect(downloads).toEqual([getBudgetFileName(budget)]);
    });

    it("baixa o PDF quando o navegador bloqueia o compartilhamento", async () => {
        const blocked = Object.assign(new Error("blocked"), { name: "NotAllowedError" });
        Object.assign(navigator, { canShare: () => true, share: jest.fn().mockRejectedValue(blocked) });

        await expect(shareBudgetPdf(budget)).resolves.toBe("downloaded");
        expect(downloads).toEqual([getBudgetFileName(budget)]);
    });

    it("não baixa nada quando a pessoa cancela o compartilhamento", async () => {
        const cancelled = Object.assign(new Error("cancel"), { name: "AbortError" });
        Object.assign(navigator, { canShare: () => true, share: jest.fn().mockRejectedValue(cancelled) });

        await expect(shareBudgetPdf(budget)).resolves.toBe("done");
        expect(downloads).toEqual([]);
    });
});

describe("baixar e visualizar", () => {
    it("baixar usa o nome de arquivo do orçamento", async () => {
        await downloadBudgetPdf(budget);
        expect(downloads).toEqual(["Orcamento_0007_ABC1234_2026-10-14.pdf"]);
    });

    it("visualizar abre o PDF numa nova aba", async () => {
        const open = jest.spyOn(window, "open").mockReturnValue({} as Window);
        await expect(viewBudgetPdf(budget)).resolves.toBe("done");
        expect(open).toHaveBeenCalledWith("blob:pdf", "_blank");
        expect(downloads).toEqual([]);
    });

    it("visualizar baixa o PDF quando o navegador bloqueia a nova aba", async () => {
        jest.spyOn(window, "open").mockReturnValue(null);
        await expect(viewBudgetPdf(budget)).resolves.toBe("downloaded");
        expect(downloads).toEqual([getBudgetFileName(budget)]);
    });
});
