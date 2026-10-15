import { makeBudget } from "../../test-utils/budgetFactory";
import { getBudgetTotal } from "../budgetService";

describe("getBudgetTotal", () => {
    it("soma quantidade × preço de todos os itens", () => {
        expect(getBudgetTotal(makeBudget())).toBe(180 + 2 * 90.5);
    });

    it("lida com quantidades decimais", () => {
        const budget = makeBudget({ services: [{ description: "Óleo (litros)", quantity: 3.5, price: 45.9 }] });
        expect(getBudgetTotal(budget)).toBeCloseTo(160.65, 2);
    });

    it("é zero sem itens", () => {
        expect(getBudgetTotal(makeBudget({ services: [] }))).toBe(0);
    });
});
