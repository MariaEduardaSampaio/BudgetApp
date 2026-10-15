import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { COLORS, RADIUS } from "../../constants/theme";

type Variant = "primary" | "secondary" | "dark" | "ghost" | "danger";

interface Props {
    title: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    variant?: Variant;
    size?: "md" | "lg";
    loading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<Variant, { bg: string; pressed: string; text: string; border?: string }> = {
    primary: { bg: COLORS.orange, pressed: COLORS.orangePressed, text: COLORS.white },
    secondary: { bg: COLORS.white, pressed: COLORS.light, text: COLORS.ink, border: COLORS.ink },
    dark: { bg: COLORS.ink, pressed: "#2E2E2E", text: COLORS.white },
    ghost: { bg: "transparent", pressed: COLORS.light, text: COLORS.gray },
    danger: { bg: COLORS.dangerSoft, pressed: "#F9D7D3", text: COLORS.danger },
};

export default function Button({ title, onPress, icon, variant = "primary", size = "md", loading, disabled, style }: Props) {
    const colors = VARIANTS[variant];
    const isDisabled = disabled || loading;

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            accessibilityRole="button"
            style={({ pressed }) => [
                styles.base,
                size === "lg" && styles.large,
                { backgroundColor: pressed ? colors.pressed : colors.bg },
                colors.border && { borderWidth: 1.5, borderColor: colors.border },
                isDisabled && styles.disabled,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={colors.text} />
            ) : (
                <>
                    {icon && <Ionicons name={icon} size={size === "lg" ? 22 : 19} color={colors.text} />}
                    <Text style={[styles.text, size === "lg" && styles.largeText, { color: colors.text }]}>{title}</Text>
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        minHeight: 48,
        paddingHorizontal: 16,
        borderRadius: RADIUS.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    large: { minHeight: 56, paddingHorizontal: 20 },
    disabled: { opacity: 0.6 },
    text: { fontSize: 16, fontWeight: "700" },
    largeText: { fontSize: 17 },
});
