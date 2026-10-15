import { createElement } from "react";
import { COLORS, RADIUS } from "../../constants/theme";

interface Props {
    value: Date;
    onChange: (date: Date) => void;
}

const toInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** No navegador usa o <input type="date"> nativo, que já abre um calendário. */
export default function DateInput({ value, onChange }: Props) {
    return createElement("input", {
        type: "date",
        value: toInputValue(value),
        onChange: (event: { target: { value: string } }) => {
            if (!event.target.value) return;
            const [year, month, day] = event.target.value.split("-").map(Number);
            onChange(new Date(year, month - 1, day, 12));
        },
        style: {
            height: 50,
            boxSizing: "border-box",
            border: `1.5px solid ${COLORS.border}`,
            borderRadius: RADIUS.sm,
            padding: "0 14px",
            fontSize: 16,
            color: COLORS.ink,
            fontFamily: "inherit",
            accentColor: COLORS.orange,
            backgroundColor: COLORS.white,
        },
    });
}
