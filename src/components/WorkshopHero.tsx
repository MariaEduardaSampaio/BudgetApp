import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { WORKSHOP } from "../constants/workshop";

/** Cartão com a identidade da oficina, no topo da tela inicial. */
export default function WorkshopHero() {
    const phones = WORKSHOP.phones.map((p) => p.replace(/^\+55\s*/, "")).join("  ·  ");

    return (
        <View style={styles.card}>
            <View style={styles.top}>
                <View style={styles.logo}>
                    <Ionicons name="car-sport" size={28} color={COLORS.ink} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{WORKSHOP.shortName}</Text>
                    <Text style={styles.tagline}>{WORKSHOP.tagline}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {WORKSHOP.address ? (
                <View style={styles.line}>
                    <Ionicons name="location-outline" size={16} color={COLORS.orange} />
                    <Text style={styles.lineText}>{WORKSHOP.address}</Text>
                </View>
            ) : null}
            {phones ? (
                <View style={styles.line}>
                    <Ionicons name="call-outline" size={16} color={COLORS.orange} />
                    <Text style={styles.lineText}>{phones}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.ink,
        borderRadius: RADIUS.lg,
        padding: 18,
        marginBottom: 16,
        overflow: "hidden",
    },
    top: { flexDirection: "row", alignItems: "center", gap: 14 },
    logo: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.orange,
        alignItems: "center",
        justifyContent: "center",
    },
    name: { color: COLORS.white, fontSize: 22, fontWeight: "800" },
    tagline: { color: "#BDBDBD", fontSize: 15, marginTop: 2 },
    divider: { height: 1, backgroundColor: "#2E2E2E", marginVertical: 14 },
    line: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
    lineText: { color: "#D4D4D4", fontSize: 14, flex: 1, lineHeight: 19 },
});
