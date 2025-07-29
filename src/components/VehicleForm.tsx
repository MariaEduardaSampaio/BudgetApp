import { View, Text, TextInput, Pressable, StyleSheet, Dimensions } from "react-native";
const { width } = Dimensions.get("window");

interface Props {
    brand: string;
    model: string;
    licensePlate: string;
    color: string;
    year: string;
    onBrandChange: (v: string) => void;
    onModelChange: (v: string) => void;
    onLicenseChange: (v: string) => void;
    onColorChange: (v: string) => void;
    onYearChange: (v: string) => void;
}

export default function VehicleForm({
    brand, model, licensePlate, color, year,
    onBrandChange, onModelChange, onLicenseChange, onColorChange, onYearChange
}: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Informações do Veículo</Text>
            <Text style={styles.label}>Marca *</Text>
            <TextInput style={styles.input} value={brand} onChangeText={onBrandChange} />
            <Text style={styles.label}>Modelo *</Text>
            <TextInput style={styles.input} value={model} onChangeText={onModelChange} />
            <Text style={styles.label}>Placa *</Text>
            <TextInput style={styles.input} value={licensePlate} onChangeText={onLicenseChange} />
            <Text style={styles.label}>Cor</Text>
            <TextInput style={styles.input} value={color} onChangeText={onColorChange} />
            <Text style={styles.label}>Ano *</Text>
            <TextInput style={styles.input} value={year} onChangeText={onYearChange} keyboardType="numeric" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 20 },
    title: { fontSize: width * 0.05, fontWeight: "bold", marginBottom: 10 },
    label: { fontSize: width * 0.04, marginBottom: 5 },
    input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5, marginBottom: 10 }
});
