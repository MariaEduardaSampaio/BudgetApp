// src/services/budgetService.ts

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

export interface BudgetPayload {
    client: Client;
    vehicle: Vehicle;
    services: Service[];
    date: Date;
    expiresAt?: Date | null;
}

const API_BASE_URL = "http://192.168.0.10:5000"; // Troque pelo IP/URL da sua API

export const generateBudgetPdf = async (payload: BudgetPayload): Promise<Uint8Array> => {
    const response = await fetch(`${API_BASE_URL}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Erro ao gerar PDF: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
};
