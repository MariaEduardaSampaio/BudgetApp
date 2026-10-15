import { getMissingFields, getPlateType, ServiceItem } from "../validators";

const validService: ServiceItem = { description: "Troca de óleo", quantity: "1", price: "R$ 180,00" };

const validForm = {
    name: "Cliente Teste",
    phone: "(31) 98765-4321",
    brand: "Fiat",
    model: "Uno",
    licensePlate: "ABC1D23",
    year: "2014",
    services: [validService],
};

const check = (overrides: Partial<typeof validForm> = {}) => {
    const f = { ...validForm, ...overrides };
    return getMissingFields(f.name, f.phone, f.brand, f.model, f.licensePlate, f.year, f.services);
};

const messageFor = (overrides: Partial<typeof validForm>, key: string) =>
    check(overrides).find((field) => field.key === key)?.message;

describe("getMissingFields", () => {
    it("não aponta nada quando o formulário está completo", () => {
        expect(check()).toEqual([]);
    });

    it("aponta todos os campos obrigatórios vazios", () => {
        const keys = check({
            name: "",
            phone: "",
            brand: "",
            model: "",
            licensePlate: "",
            year: "",
            services: [{ description: "", quantity: "1", price: "" }],
        }).map((f) => f.key);

        expect(keys).toEqual([
            "name",
            "phone",
            "brand",
            "model",
            "licensePlate",
            "year",
            "service-0-description",
            "service-0-price",
        ]);
    });

    it("considera vazio um campo só com espaços", () => {
        expect(messageFor({ name: "   " }, "name")).toBe("Preencha este campo");
    });

    it("diferencia telefone vazio de incompleto", () => {
        expect(messageFor({ phone: "" }, "phone")).toBe("Preencha este campo");
        expect(messageFor({ phone: "(31) 9876" }, "phone")).toBe("Telefone incompleto");
    });

    it("aceita telefone fixo (10 dígitos)", () => {
        expect(messageFor({ phone: "(31) 3333-4444" }, "phone")).toBeUndefined();
    });

    describe("placa", () => {
        it.each(["ABC-1234", "ABC1D23"])("aceita %p", (plate) => {
            expect(messageFor({ licensePlate: plate }, "licensePlate")).toBeUndefined();
        });

        it.each(["ABC1D2", "ABC-123", "ABC-1D23", "AB-1234"])("recusa %p como incompleta/inválida", (plate) => {
            expect(messageFor({ licensePlate: plate }, "licensePlate")).toBe("Placa incompleta. Ex.: ABC-1234 ou ABC1D23");
        });
    });

    describe("ano", () => {
        const nextYear = new Date().getFullYear() + 1;

        it("aceita do 1900 até o ano que vem", () => {
            expect(messageFor({ year: "1900" }, "year")).toBeUndefined();
            expect(messageFor({ year: String(nextYear) }, "year")).toBeUndefined();
        });

        it.each(["1899", String(nextYear + 1), "201"])("recusa %p", (year) => {
            expect(messageFor({ year }, "year")).toBe("Ano inválido");
        });
    });

    it("exige quantidade maior que zero", () => {
        const services = [{ ...validService, quantity: "0" }];
        expect(messageFor({ services }, "service-0-quantity")).toBe("Informe a quantidade");
    });

    it("identifica qual item da lista tem problema", () => {
        const services = [validService, { description: "", quantity: "1", price: "R$ 10,00" }];
        expect(check({ services })).toEqual([
            { key: "service-1-description", label: "Descrição do item 2", message: "Preencha este campo" },
        ]);
    });
});

describe("getPlateType", () => {
    it("reconhece os dois formatos", () => {
        expect(getPlateType("ABC-1234")).toBe("antiga");
        expect(getPlateType("ABC1D23")).toBe("mercosul");
    });

    it("devolve null para placas incompletas ou inválidas", () => {
        expect(getPlateType("")).toBeNull();
        expect(getPlateType("ABC1234")).toBeNull(); // antiga sem hífen não é o formato salvo
        expect(getPlateType("ABC-1D23")).toBeNull();
    });
});
