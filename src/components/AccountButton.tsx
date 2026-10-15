import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS } from "../constants/theme";
import { useAuth } from "../hooks/useAuth";
import { friendlyError } from "../utils/errors";
import AppDialog from "./ui/AppDialog";
import Button from "./ui/Button";

/** Botão "Conta" do cabeçalho: mostra o e-mail logado, trocar senha e sair. */
export default function AccountButton() {
    const router = useRouter();
    const { session, signOut } = useAuth();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const changePassword = () => {
        setOpen(false);
        router.push("/reset-password");
    };

    const logout = async () => {
        try {
            await signOut();
        } catch (e) {
            setError(friendlyError(e));
        }
    };

    return (
        <>
            <Pressable onPress={() => setOpen(true)} style={styles.button} hitSlop={8} accessibilityRole="button" accessibilityLabel="Conta">
                <Ionicons name="person-circle-outline" size={24} color={COLORS.white} />
                <Text style={styles.text}>Conta</Text>
            </Pressable>

            <AppDialog
                visible={open}
                icon="person-circle-outline"
                title="Sua conta"
                message={[session?.user.email, error].filter(Boolean).join("\n")}
                onClose={() => setOpen(false)}
            >
                <Button title="Trocar senha" icon="key-outline" variant="secondary" onPress={changePassword} />
                <Button title="Sair" icon="log-out-outline" variant="dark" onPress={logout} />
                <Button title="Fechar" variant="ghost" onPress={() => setOpen(false)} />
            </AppDialog>
        </>
    );
}

const styles = StyleSheet.create({
    button: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16 },
    text: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
});
