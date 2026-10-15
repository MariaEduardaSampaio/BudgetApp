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
    /** Mensagem exibida embaixo do campo. */
    message: string;
}

const OLD_PLATE = /^[A-Z]{3}-\d{4}$/;
const MERCOSUL_PLATE = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export type PlateType = "antiga" | "mercosul";

export const getPlateType = (plate: string): PlateType | null =>
    OLD_PLATE.test(plate) ? "antiga" : MERCOSUL_PLATE.test(plate) ? "mercosul" : null;

const EMPTY = "Preencha este campo";

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
    const add = (key: string, label: string, message = EMPTY) => missing.push({ key, label, message });

    if (!name.trim()) add('name', 'Nome do cliente');

    const phoneDigits = phone.replace(/\D/g, '').length;
    if (phoneDigits === 0) add('phone', 'Telefone');
    else if (phoneDigits < 10) add('phone', 'Telefone', 'Telefone incompleto');

    if (!brand.trim()) add('brand', 'Marca');
    if (!model.trim()) add('model', 'Modelo');

    if (!licensePlate) add('licensePlate', 'Placa');
    else if (!getPlateType(licensePlate)) add('licensePlate', 'Placa', 'Placa incompleta. Ex.: ABC-1234 ou ABC1D23');

    const yearNumber = Number(year);
    if (!year) add('year', 'Ano');
    else if (!/^\d{4}$/.test(year) || yearNumber < 1900 || yearNumber > new Date().getFullYear() + 1) {
        add('year', 'Ano', 'Ano inválido');
    }

    services.forEach((s, i) => {
        if (!s.description.trim()) add(`service-${i}-description`, `Descrição do item ${i + 1}`);
        if (parseQuantity(s.quantity) <= 0) add(`service-${i}-quantity`, `Quantidade do item ${i + 1}`, 'Informe a quantidade');
        if (!s.price) add(`service-${i}-price`, `Preço do item ${i + 1}`);
    });

    return missing;
};
