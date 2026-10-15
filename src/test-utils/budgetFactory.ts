import type { Budget } from "../services/budgetService";

/** Orçamento válido para testes; sobrescreva só o que importa em cada caso. */
export const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
    id: "5b0f1a2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b",
    number: 7,
    createdAt: new Date(2026, 9, 14, 21, 8).toISOString(),
    client: { name: "Cliente Teste", phone: "(31) 98765-4321", address: "Rua Teste, 10" },
    vehicle: { brand: "Volkswagen", model: "Gol", licensePlate: "ABC-1234", color: "Prata", year: 2014 },
    services: [
        { description: "Troca de oleo e filtro", quantity: 1, price: 180 },
        { description: "Pastilha de freio", quantity: 2, price: 90.5 },
    ],
    date: new Date(2026, 9, 14, 12, 0).toISOString(),
    expiresAt: new Date(2026, 9, 29, 12, 0).toISOString(),
    ...overrides,
});
