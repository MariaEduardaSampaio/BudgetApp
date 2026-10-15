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

/** Número do orçamento com 4 dígitos: 7 → "0007" */
export const formatBudgetNumber = (value: number): string => String(value).padStart(4, '0');

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

/**
 * Máscara de placa: aceita só o formato antigo (ABC-1234) ou o Mercosul (ABC1D23).
 * Caracteres que não cabem na posição (ex.: número nas 3 primeiras) são descartados.
 */
export const formatPlate = (value: string): string => {
    const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let plate = '';
    for (const char of chars) {
        const isLetter = /[A-Z]/.test(char);
        const position = plate.length;
        // Posições: 0-2 letras, 3 número, 4 número (antiga) ou letra (Mercosul), 5-6 números
        const fits = position < 3 ? isLetter : position === 4 ? true : !isLetter;
        if (fits) plate += char;
        if (plate.length === 7) break;
    }
    // O 5º caractere define o formato: número = antiga (com hífen), letra = Mercosul.
    if (plate.length >= 5 && /\d/.test(plate[4])) return `${plate.slice(0, 3)}-${plate.slice(3)}`;
    return plate;
};
