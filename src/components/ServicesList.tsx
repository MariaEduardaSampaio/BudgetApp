import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { formatMoney, parseCurrency, parseQuantity } from "../utils/formatters";
import Field from "./ui/Field";
import Section, { Row } from "./ui/Section";

interface Service {
    description: string;
    quantity: string;
    price: string;
}

interface Props {
    services: Service[];
    onChange: (index: number, field: "description" | "quantity" | "price", value: string) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
    errorFor: (key: string) => string | undefined;
}

export default function ServicesList({ services, onChange, onAdd, onRemove, errorFor }: Props) {
    return (
        <Section title="Serviços e peças" icon="construct-outline">
            {services.map((service, index) => (
                <View key={index} style={styles.item}>
                    <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle}>Item {index + 1}</Text>
                        {services.length > 1 && (
                            <Pressable
                                onPress={() => onRemove(index)}
                                hitSlop={10}
                                accessibilityLabel={`Remover item ${index + 1}`}
                                style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.6 }]}
                            >
                                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                                <Text style={styles.removeText}>Remover</Text>
                            </Pressable>
                        )}
                    </View>
                    <Field
                        label="Descrição"
                        required
                        multiline
                        value={service.description}
                        onChangeText={(v) => onChange(index, "description", v)}
                        error={errorFor(`service-${index}-description`)}
                        placeholder="Ex.: Troca de óleo e filtro"
                    />
                    <Row>
                        <Field
                            containerStyle={{ flex: 2 }}
                            label="Qtd."
                            required
                            value={service.quantity}
                            onChangeText={(v) => onChange(index, "quantity", v)}
                            error={errorFor(`service-${index}-quantity`)}
                            keyboardType="decimal-pad"
                        />
                        <Field
                            containerStyle={{ flex: 3 }}
                            label="Preço unitário"
                            required
                            value={service.price}
                            onChangeText={(v) => onChange(index, "price", v)}
                            error={errorFor(`service-${index}-price`)}
                            placeholder="R$ 0,00"
                            keyboardType="numeric"
                        />
                    </Row>
                    <Text style={styles.subtotal}>
                        Subtotal: <Text style={styles.subtotalValue}>{formatMoney(parseQuantity(service.quantity) * parseCurrency(service.price))}</Text>
                    </Text>
                </View>
            ))}
            <Pressable onPress={onAdd} style={({ pressed }) => [styles.addButton, pressed && { backgroundColor: COLORS.orangeSoft }]}>
                <Ionicons name="add-circle-outline" size={22} color={COLORS.orange} />
                <Text style={styles.addButtonText}>Adicionar serviço ou peça</Text>
            </Pressable>
        </Section>
    );
}

const styles = StyleSheet.create({
    item: {
        backgroundColor: COLORS.light,
        borderRadius: RADIUS.md,
        padding: 14,
        paddingBottom: 12,
        marginBottom: 12,
    },
    itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    itemTitle: { fontSize: 14, fontWeight: "800", color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.5 },
    removeButton: { flexDirection: "row", alignItems: "center", gap: 4 },
    removeText: { color: COLORS.danger, fontWeight: "600", fontSize: 14 },
    subtotal: { textAlign: "right", color: COLORS.gray, fontSize: 15 },
    subtotalValue: { color: COLORS.ink, fontWeight: "700" },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 52,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: COLORS.orange,
        borderRadius: RADIUS.md,
        marginBottom: 10,
    },
    addButtonText: { color: COLORS.orange, fontWeight: "700", fontSize: 16 },
});
