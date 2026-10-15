import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS } from "../../constants/theme";

interface Props {
    visible: boolean;
    title: string;
    message?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    onClose: () => void;
    children?: ReactNode;
}

/** Diálogo que funciona igual no celular e no navegador (o Alert do React Native não aparece na web). */
export default function AppDialog({ visible, title, message, icon, iconColor = COLORS.orange, onClose, children }: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={() => {}}>
                    {icon && (
                        <View style={[styles.iconCircle, { backgroundColor: `${iconColor}1A` }]}>
                            <Ionicons name={icon} size={30} color={iconColor} />
                        </View>
                    )}
                    <Text style={styles.title}>{title}</Text>
                    {message ? <Text style={styles.message}>{message}</Text> : null}
                    <View style={styles.actions}>{children}</View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(24,24,24,0.55)",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
    },
    card: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: 20,
        alignItems: "center",
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    title: { fontSize: 20, fontWeight: "800", color: COLORS.ink, textAlign: "center" },
    message: { fontSize: 16, color: COLORS.gray, textAlign: "center", marginTop: 8, lineHeight: 22 },
    actions: { alignSelf: "stretch", gap: 10, marginTop: 20 },
});
