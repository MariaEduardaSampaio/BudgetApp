import type { Budget } from "./budgetService";

/** Linha da tabela budget_items, como vem do Supabase. */
interface BudgetItemRow {
    position: number;
    description: string;
    quantity: number | string;
    unit_price: number | string;
}

/** Linha da tabela budgets com os itens embutidos (select "*, budget_items(*)"). */
export interface BudgetRow {
    id: string;
    number: number;
    client_name: string;
    client_phone: string;
    client_address: string | null;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate: string;
    vehicle_color: string | null;
    vehicle_year: number;
    budget_date: string;
    expires_at: string | null;
    created_at: string;
    updated_at: string | null;
    budget_items: BudgetItemRow[];
}

/** Converte a linha do banco (snake_case, colunas planas) para o formato usado no app. */
export const rowToBudget = (row: BudgetRow): Budget => ({
    id: row.id,
    number: row.number,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    client: {
        name: row.client_name,
        phone: row.client_phone,
        address: row.client_address ?? "",
    },
    vehicle: {
        brand: row.vehicle_brand,
        model: row.vehicle_model,
        licensePlate: row.vehicle_plate,
        color: row.vehicle_color ?? "",
        year: row.vehicle_year,
    },
    services: [...row.budget_items]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            price: Number(item.unit_price),
        })),
    date: row.budget_date,
    expiresAt: row.expires_at,
});
