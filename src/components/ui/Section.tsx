import Ionicons from "@expo/vector-icons/Ionicons";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS } from "../../constants/theme";

interface Props {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    children: ReactNode;
}

export default function Section({ title, icon, children }: Props) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconBadge}>
                    <Ionicons name={icon} size={20} color={COLORS.orange} />
                </View>
                <Text style={styles.title}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

/** Coloca campos lado a lado. */
export function Row({ children }: { children: ReactNode }) {
    return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: 16,
        paddingBottom: 6,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
    iconBadge: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.orangeSoft,
        alignItems: "center",
        justifyContent: "center",
    },
    title: { fontSize: 19, fontWeight: "800", color: COLORS.ink },
    row: { flexDirection: "row", gap: 12 },
});
