import { parseQuantity } from "./formatters";

export interface ServiceItem {
    description: string;
    quantity: string;
    price: string;
}

export interface MissingField {
    /** Identifica o campo na tela (ex.: "phone", "service-0-price") para destacá-lo. */
    key: string;
    label: string;
}

/** Retorna os campos faltando ou inválidos (lista vazia quando está tudo certo). */
export const getMissingFields = (
    name: string,
    phone: string,
    brand: string,
    model: string,
    licensePlate: string,
    year: string,
    services: ServiceItem[]
): MissingField[] => {
    const missing: MissingField[] = [];

    if (!name.trim()) missing.push({ key: 'name', label: 'Nome do cliente' });
    if (phone.replace(/\D/g, '').length < 10) missing.push({ key: 'phone', label: 'Telefone' });
    if (!brand.trim()) missing.push({ key: 'brand', label: 'Marca' });
    if (!model.trim()) missing.push({ key: 'model', label: 'Modelo' });
    if (licensePlate.length < 8) missing.push({ key: 'licensePlate', label: 'Placa' });
    if (!/^\d{4}$/.test(year)) missing.push({ key: 'year', label: 'Ano' });

    services.forEach((s, i) => {
        if (!s.description.trim()) missing.push({ key: `service-${i}-description`, label: `Descrição do item ${i + 1}` });
        if (parseQuantity(s.quantity) <= 0) missing.push({ key: `service-${i}-quantity`, label: `Quantidade do item ${i + 1}` });
        if (!s.price) missing.push({ key: `service-${i}-price`, label: `Preço do item ${i + 1}` });
    });

    return missing;
};
