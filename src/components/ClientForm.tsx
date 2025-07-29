import { View, Text, TextInput, StyleSheet, Dimensions } from "react-native";
const { width } = Dimensions.get("window");

interface Props {
    name: string;
    phone: string;
    address: string;
    onNameChange: (v: string) => void;
    onPhoneChange: (v: string) => void;
    onAddressChange: (v: string) => void;
}

export default function ClientForm({ name, phone, address, onNameChange, onPhoneChange, onAddressChange }: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Informações do Cliente</Text>
            <Text style={styles.label}>Nome *</Text>
            <TextInput style={styles.input} value={name} onChangeText={onNameChange} />
            <Text style={styles.label}>Telefone *</Text>
            <TextInput style={styles.input} value={phone} onChangeText={onPhoneChange} keyboardType="phone-pad" />
            <Text style={styles.label}>Endereço</Text>
            <TextInput style={styles.input} value={address} onChangeText={onAddressChange} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 20 },
    title: { fontSize: width * 0.05, fontWeight: "bold", marginBottom: 10 },
    label: { fontSize: width * 0.04, marginBottom: 5 },
    input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5, marginBottom: 10 }
});
