import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { downloadBudgetPdf, FileResult, shareBudgetPdf, viewBudgetPdf } from "../services/budgetFile";
import type { Budget } from "../services/budgetService";

type Action = "view" | "download" | "share";

const ACTIONS: { key: Action; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "view", label: "Visualizar", icon: "eye-outline" },
    { key: "download", label: "Baixar", icon: "download-outline" },
    { key: "share", label: "Compartilhar", icon: "share-social-outline" },
];

const FALLBACK_NOTICE: Record<Action, string> = {
    view: "O navegador bloqueou a nova aba, então o PDF foi baixado.",
    download: "PDF baixado.",
    share: "Este navegador não permite compartilhar arquivos, então o PDF foi baixado. Você pode anexá-lo no WhatsApp ou e-mail.",
};

/** Botões lado a lado para o PDF de um orçamento: Visualizar, Baixar e Compartilhar. */
export default function BudgetActions({ budget }: { budget: Budget }) {
    const [busy, setBusy] = useState<Action | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // O PDF é gerado de forma síncrona logo no início de cada função, ainda dentro do clique:
    // assim o navegador permite abrir nova aba / compartilhar.
    const run = async (action: Action) => {
        setBusy(action);
        setNotice(null);
        try {
            let result: FileResult | void;
            if (action === "view") result = await viewBudgetPdf(budget);
            else if (action === "download") result = await downloadBudgetPdf(budget);
            else result = await shareBudgetPdf(budget);
            if (result === "downloaded" || action === "download") setNotice(FALLBACK_NOTICE[action]);
        } catch (error: any) {
            setNotice(error?.message ?? "Não foi possível gerar o PDF.");
        } finally {
            setBusy(null);
        }
    };

    return (
        <View>
            <View style={styles.row}>
                {ACTIONS.map(({ key, label, icon }) => {
                    const primary = key === "share";
                    const color = primary ? COLORS.white : COLORS.ink;
                    return (
                        <Pressable
                            key={key}
                            accessibilityRole="button"
                            accessibilityLabel={`${label} PDF`}
                            disabled={busy !== null}
                            onPress={() => run(key)}
                            style={({ pressed }) => [
                                styles.tile,
                                primary ? styles.tilePrimary : styles.tileOutline,
                                pressed && (primary ? { backgroundColor: COLORS.orangePressed } : { backgroundColor: COLORS.light }),
                            ]}
                        >
                            {busy === key ? <ActivityIndicator color={color} /> : <Ionicons name={icon} size={22} color={primary ? COLORS.white : COLORS.orange} />}
                            <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>
            {notice && <Text style={styles.notice}>{notice}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", gap: 8 },
    tile: {
        flex: 1,
        minHeight: 64,
        borderRadius: RADIUS.md,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 2,
    },
    tileOutline: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border },
    tilePrimary: { backgroundColor: COLORS.orange },
    label: { fontSize: 13, fontWeight: "700" },
    notice: { color: COLORS.gray, fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 10 },
});
