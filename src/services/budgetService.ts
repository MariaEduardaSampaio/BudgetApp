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
    createdAt: string;
    client: Client;
    vehicle: Vehicle;
    services: Service[];
    date: string;
    expiresAt: string | null;
}

export const getBudgetTotal = (budget: Budget): number =>
    budget.services.reduce((sum, s) => sum + s.quantity * s.price, 0);
