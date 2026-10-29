import { fireEvent, screen } from "@testing-library/react";

/** O que a pessoa digita no formulário de orçamento (como digitaria, sem máscara). */
export interface FormData {
    name: string;
    phone: string;
    address?: string;
    brand: string;
    model: string;
    plate: string;
    year: string;
    color?: string;
    /** price em centavos digitados ("18000" = R$ 180,00), como no campo de verdade. */
    items: { description: string; quantity?: string; price: string }[];
}

/** Só os campos obrigatórios. */
export const VALID_FORM: FormData = {
    name: "Cliente Teste",
    phone: "31987654321",
    brand: "Fiat",
    model: "Uno",
    plate: "ABC1D23",
    year: "2010",
    items: [{ description: "Troca de óleo", price: "18000" }],
};

const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });
const input = (placeholder: string, index = 0) => screen.getAllByPlaceholderText(placeholder)[index];

/** Campo "Qtd." do item: não tem placeholder, é o campo logo antes do preço. */
const quantityInput = (index: number) => {
    const fields = Array.from(document.querySelectorAll<HTMLElement>("input, textarea"));
    return fields[fields.indexOf(input("R$ 0,00", index)) - 1];
};

/** Digita nos campos pelo placeholder (os rótulos não estão ligados aos campos). */
export function fillBudgetForm(data: Partial<FormData>) {
    if (data.name !== undefined) type(input("Nome do cliente"), data.name);
    if (data.phone !== undefined) type(input("(31) 99999-9999"), data.phone);
    if (data.address !== undefined) type(input("Rua, número, bairro"), data.address);
    if (data.brand !== undefined) type(input("Fiat"), data.brand);
    if (data.model !== undefined) type(input("Uno"), data.model);
    if (data.plate !== undefined) type(input("ABC1D23"), data.plate);
    if (data.year !== undefined) type(input("2015"), data.year);
    if (data.color !== undefined) type(input("Prata"), data.color);

    data.items?.forEach((item, index) => {
        if (screen.getAllByPlaceholderText("R$ 0,00").length <= index) fireEvent.click(screen.getByText("Adicionar serviço ou peça"));
        type(input("Ex.: Troca de óleo e filtro", index), item.description);
        if (item.quantity !== undefined) type(quantityInput(index), item.quantity);
        type(input("R$ 0,00", index), item.price);
    });
}

/**
 * Clica no botão com esse texto (o mesmo texto pode aparecer também como título, ex.: "Entrar").
 * O Button mostra só o spinner enquanto carrega, então o texto some durante o salvamento.
 */
export const pressButton = (title: string) => {
    const buttons = screen.getAllByText(title).map((text) => text.closest<HTMLElement>("[role=button]")).filter(Boolean);
    if (buttons.length !== 1) throw new Error(`Esperava 1 botão "${title}", achei ${buttons.length}.`);
    fireEvent.click(buttons[0]!);
};
