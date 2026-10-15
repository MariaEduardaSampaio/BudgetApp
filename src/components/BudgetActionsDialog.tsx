import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { COLORS } from "../constants/theme";
import { CAN_DOWNLOAD, downloadBudgetPdf, shareBudgetPdf } from "../services/budgetFile";
import { Budget, getBudgetTotal } from "../services/budgetService";
import { formatMoney } from "../utils/formatters";
import AppDialog from "./ui/AppDialog";
import Button from "./ui/Button";

interface Props {
    budget: Budget | null;
    title: string;
    onClose: () => void;
    /** Quando informado, mostra o botão "Novo orçamento". */
    onNewBudget?: () => void;
}

/** Opções para um orçamento já gerado: compartilhar o PDF (WhatsApp, e-mail...) ou baixar. */
export default function BudgetActionsDialog({ budget, title, onClose, onNewBudget }: Props) {
    const [busy, setBusy] = useState<"share" | "download" | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => setNotice(null), [budget]);

    if (!budget) return null;

    const run = async (action: "share" | "download") => {
        setBusy(action);
        setNotice(null);
        try {
            if (action === "share") {
                const result = await shareBudgetPdf(budget);
                if (result === "downloaded") {
                    setNotice("Este navegador não permite compartilhar arquivos, então o PDF foi baixado. Você pode anexá-lo no WhatsApp ou e-mail.");
                }
            } else {
                await downloadBudgetPdf(budget);
                setNotice("PDF baixado.");
            }
        } catch (error: any) {
            setNotice(error?.message ?? "Não foi possível gerar o PDF.");
        } finally {
            setBusy(null);
        }
    };

    return (
        <AppDialog
            visible
            icon="checkmark-circle"
            title={title}
            message={`${budget.client.name} · ${budget.vehicle.model} ${budget.vehicle.licensePlate}\nTotal: ${formatMoney(getBudgetTotal(budget))}`}
            onClose={onClose}
        >
            <Button title="Compartilhar PDF" icon="share-social" size="lg" loading={busy === "share"} onPress={() => run("share")} />
            {CAN_DOWNLOAD && (
                <Button title="Baixar PDF" icon="download-outline" variant="secondary" loading={busy === "download"} onPress={() => run("download")} />
            )}
            {notice && <Text style={styles.notice}>{notice}</Text>}
            {onNewBudget && <Button title="Novo orçamento" icon="add" variant="secondary" onPress={onNewBudget} />}
            <Button title="Fechar" variant="ghost" onPress={onClose} />
        </AppDialog>
    );
}

const styles = StyleSheet.create({
    notice: { color: COLORS.gray, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
