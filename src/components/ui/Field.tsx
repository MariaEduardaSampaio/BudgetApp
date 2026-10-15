import { useState } from "react";
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { COLORS, RADIUS } from "../../constants/theme";

interface Props extends TextInputProps {
    label: string;
    required?: boolean;
    error?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
}

export default function Field({ label, required, error, containerStyle, style, onFocus, onBlur, ...inputProps }: Props) {
    const [focused, setFocused] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            <Text style={[styles.label, error && styles.labelError]}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
                placeholderTextColor="#A3A3A3"
                {...inputProps}
                onFocus={(e) => { setFocused(true); onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); onBlur?.(e); }}
                style={[
                    styles.input,
                    inputProps.multiline && styles.multiline,
                    focused && styles.inputFocused,
                    error && styles.inputError,
                    style,
                ]}
            />
            {error && <Text style={styles.errorText}>Preencha este campo</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 14 },
    label: { fontSize: 15, fontWeight: "600", color: COLORS.ink, marginBottom: 6 },
    labelError: { color: COLORS.danger },
    required: { color: COLORS.orange },
    input: {
        minHeight: 50,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.white,
        paddingHorizontal: 14,
        fontSize: 16,
        color: COLORS.ink,
    },
    multiline: { minHeight: 64, paddingTop: 12, textAlignVertical: "top" },
    inputFocused: { borderColor: COLORS.orange },
    inputError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerSoft },
    errorText: { color: COLORS.danger, fontSize: 13, marginTop: 4 },
});
