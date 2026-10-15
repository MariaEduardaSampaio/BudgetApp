import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import DateInput from "./ui/DateInput";
import Section from "./ui/Section";

const VALIDITY_OPTIONS: { label: string; days: number | null }[] = [
    { label: "7 dias", days: 7 },
    { label: "15 dias", days: 15 },
    { label: "30 dias", days: 30 },
    { label: "Sem validade", days: null },
];

interface Props {
    date: Date;
    validityDays: number | null;
    onDateChange: (d: Date) => void;
    onValidityChange: (days: number | null) => void;
}

export default function DatesForm({ date, validityDays, onDateChange, onValidityChange }: Props) {
    return (
        <Section title="Data e validade" icon="calendar-outline">
            <Text style={styles.label}>Data do orçamento</Text>
            <View style={styles.dateWrapper}>
                <DateInput value={date} onChange={onDateChange} />
            </View>

            <Text style={styles.label}>Validade</Text>
            <View style={styles.chips}>
                {VALIDITY_OPTIONS.map((option) => {
                    const selected = option.days === validityDays;
                    return (
                        <Pressable
                            key={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            style={[styles.chip, selected && styles.chipSelected]}
                            onPress={() => onValidityChange(option.days)}
                        >
                            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </Section>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 15, fontWeight: "600", color: COLORS.ink, marginBottom: 6 },
    dateWrapper: { marginBottom: 14 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    chip: {
        minHeight: 44,
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.pill,
        paddingHorizontal: 16,
    },
    chipSelected: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
    chipText: { color: COLORS.ink, fontSize: 15, fontWeight: "600" },
    chipTextSelected: { color: COLORS.white },
});
