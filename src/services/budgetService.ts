export interface Client {
    name: string;
    phone: string;
    address?: string;
}

export interface Vehicle {
    brand: string;
    model: string;
    licensePlate: string;
    color?: string;
    year: number;
}

export interface Service {
    description: string;
    quantity: number;
    price: number;
}

export interface Budget {
    id: string;
    /** Número sequencial do orçamento na oficina (Nº 0001, 0002...). */
    number: number;
    createdAt: string;
    updatedAt?: string;
    client: Client;
    vehicle: Vehicle;
    services: Service[];
    date: string;
    expiresAt: string | null;
}

/**
 * Dados enviados para salvar. Sem `id` cria um orçamento novo; com `id` atualiza.
 * Número e datas de criação/edição são definidos pelo banco.
 */
export type BudgetDraft = Omit<Budget, "id" | "number" | "createdAt" | "updatedAt"> & {
    id?: string;
    /** Só usado ao importar orçamentos antigos, para manter a data original. */
    createdAt?: string;
};

export const getBudgetTotal = (budget: Pick<Budget, "services">): number =>
    budget.services.reduce((sum, s) => sum + s.quantity * s.price, 0);
