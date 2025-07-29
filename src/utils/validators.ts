import { Alert } from "react-native";

export interface ServiceItem {
    description: string;
    quantity: string;
    price: string;
}

export const validateFields = (
    name: string,
    phone: string,
    brand: string,
    model: string,
    licensePlate: string,
    year: string,
    services: ServiceItem[]
): boolean => {
    const missing: string[] = [];

    if (!name) missing.push('Nome do Cliente');
    if (!phone || phone.replace(/\D/g, '').length < 10) missing.push('Telefone válido');
    if (!brand) missing.push('Marca');
    if (!model) missing.push('Modelo');
    if (!licensePlate || licensePlate.length < 8) missing.push('Placa válida');
    if (!year) missing.push('Ano');

    services.forEach((s, i) => {
        if (!s.description) missing.push(`Descrição do serviço ${i + 1}`);
        if (!s.quantity) missing.push(`Quantidade do serviço ${i + 1}`);
        if (!s.price) missing.push(`Preço do serviço ${i + 1}`);
    });

    if (missing.length > 0) {
        Alert.alert('Campos obrigatórios', `Preencha: ${missing.join(', ')}`);
        return false;
    }

    return true;
};
