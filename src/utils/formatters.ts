/** Formata número para moeda BRL (R$ xx,xx) */
export const formatCurrency = (value: string): string => {
    let numeric = value.replace(/\D/g, '');
    let number = parseFloat(numeric) / 100;
    if (isNaN(number)) number = 0;
    return formatMoney(number);
};

/** Converte "R$ 1.234,56" de volta para 1234.56 */
export const parseCurrency = (value: string): number =>
    parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

/** Converte quantidade digitada ("1,5" ou "2") para número */
export const parseQuantity = (value: string): number =>
    parseFloat(value.replace(',', '.')) || 0;

export const formatMoney = (value: number): string =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata data ISO ou Date para dd/mm/aaaa */
export const formatDate = (value: string | Date): string => {
    const date = typeof value === 'string' ? new Date(value) : value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

/** Formata data ISO para dd/mm/aaaa hh:mm */
export const formatDateTime = (value: string): string => {
    const date = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
