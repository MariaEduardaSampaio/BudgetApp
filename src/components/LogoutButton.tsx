import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS } from "../constants/theme";
import { useAuth } from "../hooks/useAuth";
import { friendlyError } from "../utils/errors";
import AppDialog from "./ui/AppDialog";
import Button from "./ui/Button";

/** Botão "Sair" do cabeçalho, com confirmação. */
export default function LogoutButton() {
    const { session, signOut } = useAuth();
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const logout = async () => {
        try {
            await signOut();
        } catch (e) {
            setError(friendlyError(e));
        }
    };

    return (
        <>
            <Pressable onPress={() => setConfirming(true)} style={styles.button} hitSlop={8} accessibilityRole="button" accessibilityLabel="Sair da conta">
                <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
                <Text style={styles.text}>Sair</Text>
            </Pressable>

            <AppDialog
                visible={confirming}
                icon="log-out-outline"
                title="Sair da conta?"
                message={[session?.user.email, error].filter(Boolean).join("\n")}
                onClose={() => setConfirming(false)}
            >
                <Button title="Sair" icon="log-out-outline" variant="dark" onPress={logout} />
                <Button title="Cancelar" variant="ghost" onPress={() => setConfirming(false)} />
            </AppDialog>
        </>
    );
}

const styles = StyleSheet.create({
    button: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16 },
    text: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
});
