import { fireEvent, render, screen } from "@testing-library/react";
import DatesForm from "../DatesForm";

jest.mock("@expo/vector-icons/Ionicons", () => jest.requireActual("../../test-utils/fakeIcons").fakeIoniconsModule);

const renderForm = (date = new Date(2026, 9, 14, 23, 30), validityDays: number | null = 15) => {
    const props = { date, validityDays, onDateChange: jest.fn(), onValidityChange: jest.fn() };
    const { container } = render(<DatesForm {...props} />);
    return { props, dateInput: container.querySelector<HTMLInputElement>('input[type="date"]')! };
};

describe("DatesForm", () => {
    it("mostra a data do orçamento no dia local (um orçamento feito à noite não vira o dia seguinte)", () => {
        expect(renderForm().dateInput.value).toBe("2026-10-14");
    });

    it("trocar a data devolve o dia escolhido ao meio-dia", () => {
        const { props, dateInput } = renderForm();
        fireEvent.change(dateInput, { target: { value: "2026-10-20" } });
        expect(props.onDateChange).toHaveBeenCalledWith(new Date(2026, 9, 20, 12));
    });

    it("apagar a data não muda nada", () => {
        const { props, dateInput } = renderForm();
        fireEvent.change(dateInput, { target: { value: "" } });
        expect(props.onDateChange).not.toHaveBeenCalled();
    });

    it("informa para leitores de tela qual validade está escolhida", () => {
        renderForm(undefined, null);
        const selected = screen.getAllByRole("radio").filter((radio) => radio.getAttribute("aria-checked") === "true");
        expect(selected.map((radio) => radio.textContent)).toEqual(["Sem validade"]);
    });

    it.each([
        ["7 dias", 7],
        ["30 dias", 30],
        ["Sem validade", null],
    ])("tocar em '%s' escolhe %p", (label, days) => {
        const { props } = renderForm();
        fireEvent.click(screen.getByText(label));
        expect(props.onValidityChange).toHaveBeenCalledWith(days);
    });
});
