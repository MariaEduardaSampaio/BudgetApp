import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatMoney,
    formatPhone,
    formatPlate,
    formatQuantity,
    parseCurrency,
    parseQuantity,
} from "../formatters";

// O Intl usa um espaço especial (não separável) em "R$ 10,00"; normalizamos para comparar.
const plain = (text: string) => text.replace(/\s/g, " ");

describe("formatCurrency", () => {
    it("trata os dígitos digitados como centavos", () => {
        expect(plain(formatCurrency("18000"))).toBe("R$ 180,00");
        expect(plain(formatCurrency("5"))).toBe("R$ 0,05");
    });

    it("reformata um valor já formatado quando o usuário continua digitando", () => {
        expect(plain(formatCurrency("R$ 1.234,567"))).toBe("R$ 12.345,67");
    });

    it("mostra R$ 0,00 quando o campo é apagado", () => {
        expect(plain(formatCurrency(""))).toBe("R$ 0,00");
    });
});

describe("parseCurrency", () => {
    it("converte o texto em reais para número", () => {
        expect(parseCurrency("R$ 1.234,56")).toBe(1234.56);
        expect(parseCurrency(formatCurrency("9050"))).toBe(90.5);
    });

    it("devolve 0 para texto vazio", () => {
        expect(parseCurrency("")).toBe(0);
    });
});

describe("formatQuantity", () => {
    it.each([
        ["2", "2"],
        ["1,5", "1,5"],
        ["1.5", "1,5"],
        ["1,333", "1,33"],
        ["1,2,3", "1,23"],
        ["abc1x,5", "1,5"],
        [",5", "0,5"],
        ["", ""],
    ])("%p vira %p (no máximo 2 casas, como o banco guarda)", (typed, expected) => {
        expect(formatQuantity(typed)).toBe(expected);
    });
});

describe("parseQuantity", () => {
    it("aceita vírgula ou ponto como decimal", () => {
        expect(parseQuantity("1,5")).toBe(1.5);
        expect(parseQuantity("2.5")).toBe(2.5);
        expect(parseQuantity("3")).toBe(3);
    });

    it("devolve 0 para valores inválidos", () => {
        expect(parseQuantity("")).toBe(0);
        expect(parseQuantity("abc")).toBe(0);
    });
});

describe("formatMoney", () => {
    it("formata em reais com separador de milhar", () => {
        expect(plain(formatMoney(1234.5))).toBe("R$ 1.234,50");
        expect(plain(formatMoney(0))).toBe("R$ 0,00");
    });
});

describe("formatPhone", () => {
    it("formata celular com 11 dígitos", () => {
        expect(formatPhone("31987654321")).toBe("(31) 98765-4321");
    });

    it("formata fixo com 10 dígitos", () => {
        expect(formatPhone("3133334444")).toBe("(31) 3333-4444");
    });

    it("ignora caracteres que não são números e o excesso de dígitos", () => {
        expect(formatPhone("(31) 98765-4321 999")).toBe("(31) 98765-4321");
    });
});

describe("formatPlate", () => {
    it.each([
        ["abc1234", "ABC-1234"],
        ["ABC-1234", "ABC-1234"],
        ["abc1d23", "ABC1D23"],
        ["abc 1d23", "ABC1D23"],
    ])("formata %p como %p", (input, expected) => {
        expect(formatPlate(input)).toBe(expected);
    });

    it("converte placas salvas no formato antigo do app (ABC-1D23) para o padrão Mercosul", () => {
        expect(formatPlate("ABC-1D23")).toBe("ABC1D23");
    });

    it("descarta caracteres fora da posição permitida", () => {
        expect(formatPlate("1abc2345")).toBe("ABC-2345"); // número no início
        expect(formatPlate("abcd1234")).toBe("ABC-1234"); // letra onde deveria haver número
        expect(formatPlate("abc1d2x3")).toBe("ABC1D23"); // letra no final
    });

    it("limita a 7 caracteres", () => {
        expect(formatPlate("abc12345")).toBe("ABC-1234");
    });

    it("só coloca o hífen depois de saber o formato (5º caractere)", () => {
        expect(formatPlate("abc1")).toBe("ABC1");
        expect(formatPlate("abc12")).toBe("ABC-12");
        expect(formatPlate("abc1d")).toBe("ABC1D");
    });
});

describe("formatDate / formatDateTime", () => {
    it("formata datas no padrão brasileiro", () => {
        expect(formatDate(new Date(2026, 0, 5))).toBe("05/01/2026");
        expect(formatDate(new Date(2026, 9, 14, 12).toISOString())).toBe("14/10/2026");
    });

    it("usa o horário local, sem virar o dia à noite", () => {
        const lateNight = new Date(2026, 9, 14, 23, 30).toISOString(); // já é dia 15 em UTC
        expect(formatDate(lateNight)).toBe("14/10/2026");
        expect(formatDateTime(lateNight)).toBe("14/10/2026 23:30");
    });
});
