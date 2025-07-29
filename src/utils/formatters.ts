/** Formata número para moeda BRL (R$ xx,xx) */
export const formatCurrency = (value: string): string => {
    let numeric = value.replace(/\D/g, '');
    let number = parseFloat(numeric) / 100;
    if (isNaN(number)) number = 0;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/** Formata string para telefone (99) 99999-9999 */
export const formatPhone = (value: string): string => {
    let numeric = value.replace(/\D/g, '').slice(0, 11);
    if (numeric.length <= 10) {
        return numeric.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return numeric.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
};

/** Formata string para placa AAA-9A99 */
export const formatPlate = (value: string): string => {
    let formatted = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (formatted.length <= 3) return formatted;
    if (formatted.length <= 4) return formatted.replace(/^([A-Z]{3})([0-9A-Z]{0,1})$/, '$1-$2');
    return formatted.replace(/^([A-Z]{3})([0-9][A-Z0-9]{1})([0-9]{0,2})$/, '$1-$2$3');
};
