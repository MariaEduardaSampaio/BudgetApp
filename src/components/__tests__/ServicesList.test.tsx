import { fireEvent, render, screen } from "@testing-library/react";
import { MAX_SERVICES } from "../../hooks/useBudgetForm";
import ServicesList from "../ServicesList";

jest.mock("@expo/vector-icons/Ionicons", () => jest.requireActual("../../test-utils/fakeIcons").fakeIoniconsModule);

const item = (description = "Item", quantity = "1", price = "R$ 10,00") => ({ description, quantity, price });

const renderList = (services = [item()]) => {
    const props = { services, onChange: jest.fn(), onAdd: jest.fn(), onRemove: jest.fn(), errorFor: () => undefined };
    render(<ServicesList {...props} />);
    return props;
};

describe("ServicesList", () => {
    it("não mostra Remover quando há um só item", () => {
        renderList([item()]);
        expect(screen.queryByText("Remover")).toBeNull();
    });

    it("Remover item 2 remove o segundo item (índice 1)", () => {
        const props = renderList([item("A"), item("B")]);
        fireEvent.click(screen.getByLabelText("Remover item 2"));
        expect(props.onRemove).toHaveBeenCalledWith(1);
    });

    it("mostra o subtotal de cada item (1,5 × R$ 90,50 = R$ 135,75)", () => {
        renderList([item("Fluido", "1,5", "R$ 90,50")]);
        expect(screen.getByText(/R\$ 135,75/)).toBeTruthy();
    });

    it(`no limite de ${MAX_SERVICES} itens esconde Adicionar e avisa o limite`, () => {
        renderList(Array.from({ length: MAX_SERVICES }, () => item()));
        expect(screen.queryByText("Adicionar serviço ou peça")).toBeNull();
        expect(screen.getByText(`Limite de ${MAX_SERVICES} itens por orçamento.`)).toBeTruthy();
    });

    it("abaixo do limite, Adicionar pede um item novo", () => {
        const props = renderList(Array.from({ length: MAX_SERVICES - 1 }, () => item()));
        fireEvent.click(screen.getByText("Adicionar serviço ou peça"));
        expect(props.onAdd).toHaveBeenCalledTimes(1);
    });
});
