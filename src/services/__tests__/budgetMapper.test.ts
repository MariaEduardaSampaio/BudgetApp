import { BudgetRow, rowToBudget } from "../budgetMapper";

const row = (overrides: Partial<BudgetRow> = {}): BudgetRow => ({
    id: "5b0f1a2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b",
    number: 12,
    client_name: "Cliente Teste",
    client_phone: "(31) 98765-4321",
    client_address: "Rua Teste, 10",
    vehicle_brand: "Fiat",
    vehicle_model: "Uno",
    vehicle_plate: "ABC1D23",
    vehicle_color: "Prata",
    vehicle_year: 2010,
    budget_date: "2026-10-14T15:00:00+00:00",
    expires_at: null,
    created_at: "2026-10-14T15:00:00+00:00",
    updated_at: null,
    budget_items: [
        { position: 0, description: "Troca de óleo", quantity: 1, unit_price: 180 },
        { position: 1, description: "Pastilha", quantity: 2, unit_price: 90.5 },
    ],
    ...overrides,
});

describe("rowToBudget", () => {
    it("converte as colunas do banco para o formato do app", () => {
        expect(rowToBudget(row())).toEqual({
            id: "5b0f1a2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b",
            number: 12,
            createdAt: "2026-10-14T15:00:00+00:00",
            updatedAt: undefined,
            client: { name: "Cliente Teste", phone: "(31) 98765-4321", address: "Rua Teste, 10" },
            vehicle: { brand: "Fiat", model: "Uno", licensePlate: "ABC1D23", color: "Prata", year: 2010 },
            services: [
                { description: "Troca de óleo", quantity: 1, price: 180 },
                { description: "Pastilha", quantity: 2, price: 90.5 },
            ],
            date: "2026-10-14T15:00:00+00:00",
            expiresAt: null,
        });
    });

    it("ordena os itens pela posição, mesmo que venham fora de ordem", () => {
        const budget = rowToBudget(
            row({
                budget_items: [
                    { position: 2, description: "C", quantity: 1, unit_price: 1 },
                    { position: 0, description: "A", quantity: 1, unit_price: 1 },
                    { position: 1, description: "B", quantity: 1, unit_price: 1 },
                ],
            })
        );
        expect(budget.services.map((s) => s.description)).toEqual(["A", "B", "C"]);
    });

    it("converte valores numéricos que chegam como texto", () => {
        const budget = rowToBudget(row({ budget_items: [{ position: 0, description: "Óleo", quantity: "3.50", unit_price: "45.90" }] }));
        expect(budget.services[0]).toEqual({ description: "Óleo", quantity: 3.5, price: 45.9 });
    });

    it("troca campos opcionais nulos por texto vazio e mantém a data de edição", () => {
        const budget = rowToBudget(row({ client_address: null, vehicle_color: null, updated_at: "2026-10-20T09:00:00+00:00" }));
        expect(budget.client.address).toBe("");
        expect(budget.vehicle.color).toBe("");
        expect(budget.updatedAt).toBe("2026-10-20T09:00:00+00:00");
    });
});
