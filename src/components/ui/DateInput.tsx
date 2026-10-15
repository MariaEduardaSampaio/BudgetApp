import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { COLORS, RADIUS } from "../../constants/theme";
import { formatDate } from "../../utils/formatters";

interface Props {
    value: Date;
    onChange: (date: Date) => void;
}

export default function DateInput({ value, onChange }: Props) {
    if (Platform.OS === "ios") {
        return (
            <DateTimePicker
                value={value}
                mode="date"
                display="compact"
                locale="pt-BR"
                accentColor={COLORS.orange}
                style={styles.iosPicker}
                onChange={(_, selected) => selected && onChange(selected)}
            />
        );
    }

    const openPicker = () => {
        DateTimePickerAndroid.open({
            value,
            mode: "date",
            onChange: (event, selected) => {
                if (event.type === "set" && selected) onChange(selected);
            },
        });
    };

    return (
        <Pressable style={styles.input} onPress={openPicker}>
            <Text style={styles.text}>{formatDate(value)}</Text>
            <Ionicons name="calendar-outline" size={20} color={COLORS.orange} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    input: {
        minHeight: 50,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.white,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    text: { fontSize: 16, color: COLORS.ink },
    iosPicker: { alignSelf: "flex-start" },
});
