import { buildBudgetSearchFilter } from "../budgetSearch";

describe("buildBudgetSearchFilter", () => {
    it("não filtra quando a busca está vazia", () => {
        expect(buildBudgetSearchFilter("")).toBeNull();
        expect(buildBudgetSearchFilter("   ")).toBeNull();
    });

    it("procura por nome, modelo e placa", () => {
        expect(buildBudgetSearchFilter("joão")).toBe("client_name.ilike.*joão*,vehicle_model.ilike.*joão*");
        expect(buildBudgetSearchFilter("gol")).toBe("client_name.ilike.*gol*,vehicle_model.ilike.*gol*,vehicle_plate.ilike.*GOL*");
    });

    it("acha placa antiga mesmo digitada sem hífen", () => {
        expect(buildBudgetSearchFilter("abc1234")).toContain("vehicle_plate.ilike.*ABC*1234*");
        expect(buildBudgetSearchFilter("ABC-1234")).toContain("vehicle_plate.ilike.*ABC*1234*");
    });

    it("acha pelo número do orçamento, com ou sem zeros à esquerda", () => {
        expect(buildBudgetSearchFilter("0007")).toContain("number.eq.7");
        expect(buildBudgetSearchFilter("7")).toContain("number.eq.7");
    });

    it("remove caracteres que quebrariam ou alterariam o filtro", () => {
        const filter = buildBudgetSearchFilter("a,b(c)\"d*e%f\\g")!;
        expect(filter).not.toMatch(/[()"\\%]/);
        expect(filter.split(",")).toHaveLength(3); // nome, modelo, placa — sem vírgulas extras
    });

    it("só caracteres especiais vira busca vazia", () => {
        expect(buildBudgetSearchFilter(",()*")).toBeNull();
    });
});
