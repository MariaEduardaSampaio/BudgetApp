import { View, Text, TextInput, Pressable, StyleSheet, Dimensions } from "react-native";
const { width } = Dimensions.get("window");

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
}

export default function ServicesList({ services, onChange, onAdd, onRemove }: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Serviços</Text>
            {services.map((service, index) => (
                <View key={index} style={styles.serviceBox}>
                    <Text style={styles.label}>Descrição *</Text>
                    <TextInput style={styles.input} value={service.description} onChangeText={(v) => onChange(index, "description", v)} />
                    <Text style={styles.label}>Quantidade *</Text>
                    <TextInput style={styles.input} value={service.quantity} onChangeText={(v) => onChange(index, "quantity", v)} keyboardType="numeric" />
                    <Text style={styles.label}>Preço *</Text>
                    <TextInput style={styles.input} value={service.price} onChangeText={(v) => onChange(index, "price", v)} keyboardType="numeric" />
                    {services.length > 1 && (
                        <Pressable style={styles.removeButton} onPress={() => onRemove(index)}>
                            <Text style={styles.removeButtonText}>Remover</Text>
                        </Pressable>
                    )}
                </View>
            ))}
            <Pressable style={styles.addButton} onPress={onAdd}>
                <Text style={styles.addButtonText}>+ Adicionar Serviço</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 20 },
    title: { fontSize: width * 0.05, fontWeight: "bold", marginBottom: 10 },
    serviceBox: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 15 },
    label: { fontSize: width * 0.04, marginBottom: 5 },
    input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5, marginBottom: 10 },
    removeButton: { backgroundColor: "#ff4d4d", padding: 10, borderRadius: 5, alignItems: "center" },
    removeButtonText: { color: "#fff", fontWeight: "bold" },
    addButton: { backgroundColor: "#28a745", padding: 12, borderRadius: 8, alignItems: "center" },
    addButtonText: { color: "#fff", fontWeight: "bold" }
});
