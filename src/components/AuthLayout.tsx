import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { WORKSHOP } from "../constants/workshop";

interface Props {
    title: string;
    subtitle?: string;
    children: ReactNode;
    /** Texto pequeno abaixo do cartão. */
    footer?: ReactNode;
}

/** Fundo escuro com a marca da oficina e um cartão branco: usado no login e nas telas de senha. */
export default function AuthLayout({ title, subtitle, children, footer }: Props) {
    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
                <View style={styles.logo}>
                    <Ionicons name="car-sport" size={34} color={COLORS.ink} />
                </View>
                <Text style={styles.brandName}>{WORKSHOP.shortName}</Text>
                <Text style={styles.brandTagline}>Orçamentos</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                {children}
            </View>

            {footer}
        </ScrollView>
    );
}

/** Caixa de mensagem dentro do cartão (erro ou sucesso). */
export function AuthMessage({ type, children }: { type: "error" | "success"; children: ReactNode }) {
    const isError = type === "error";
    return (
        <View style={[styles.message, isError ? styles.messageError : styles.messageSuccess]}>
            <Ionicons name={isError ? "alert-circle" : "checkmark-circle"} size={20} color={isError ? COLORS.danger : "#1E7A3D"} />
            <Text style={[styles.messageText, { color: isError ? COLORS.danger : "#1E5C33" }]}>{children}</Text>
        </View>
    );
}

/** Link de texto (ex.: "Esqueci minha senha"). */
export function AuthLink({ title, onPress, light }: { title: string; onPress: () => void; light?: boolean }) {
    return (
        <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link" style={styles.link}>
            <Text style={[styles.linkText, light && { color: "#D4D4D4" }]}>{title}</Text>
        </Pressable>
    );
}

/** Botão "Mostrar senha / Esconder senha". */
export function ShowPasswordToggle({ visible, onToggle, plural }: { visible: boolean; onToggle: () => void; plural?: boolean }) {
    const word = plural ? "senhas" : "senha";
    return (
        <Pressable onPress={onToggle} style={styles.toggle} hitSlop={8} accessibilityRole="button">
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.gray} />
            <Text style={styles.toggleText}>{visible ? `Esconder ${word}` : `Mostrar ${word}`}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.ink },
    content: { flexGrow: 1, justifyContent: "center", padding: 20, width: "100%", maxWidth: 440, alignSelf: "center" },
    brand: { alignItems: "center", marginBottom: 28 },
    logo: {
        width: 72,
        height: 72,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.orange,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    brandName: { color: COLORS.white, fontSize: 26, fontWeight: "800" },
    brandTagline: { color: "#BDBDBD", fontSize: 16, marginTop: 2 },
    card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 20 },
    title: { fontSize: 22, fontWeight: "800", color: COLORS.ink, marginBottom: 6 },
    subtitle: { fontSize: 15, color: COLORS.gray, lineHeight: 21, marginBottom: 16 },
    message: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: RADIUS.sm, padding: 12, marginBottom: 14 },
    messageError: { backgroundColor: COLORS.dangerSoft },
    messageSuccess: { backgroundColor: "#E7F6EC" },
    messageText: { fontSize: 15, flex: 1, lineHeight: 21 },
    link: { alignSelf: "center", paddingVertical: 10 },
    linkText: { color: COLORS.orange, fontSize: 15, fontWeight: "700" },
    toggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 16 },
    toggleText: { color: COLORS.gray, fontSize: 14, fontWeight: "600" },
});
