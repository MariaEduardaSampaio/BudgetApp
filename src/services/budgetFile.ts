import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { buildBudgetPdf, getBudgetFileName } from "./budgetPdf";
import type { Budget } from "./budgetService";

/** No celular o menu de compartilhar já oferece "Salvar em arquivos", então não há botão de download. */
export const CAN_DOWNLOAD = false;

export type FileResult = "done" | "downloaded";

/** Gera o arquivo PDF no aparelho e devolve o caminho. */
export const saveBudgetPdf = async (budget: Budget): Promise<string> => {
    const dataUri = buildBudgetPdf(budget).output("datauristring");
    const fileUri = `${FileSystem.cacheDirectory}${getBudgetFileName(budget)}`;
    await FileSystem.writeAsStringAsync(fileUri, dataUri.split(",")[1], {
        encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
};

/** Abre o menu do sistema com o PDF anexado (WhatsApp, e-mail, Drive, salvar...). */
export const shareBudgetPdf = async (budget: Budget): Promise<FileResult> => {
    if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Compartilhamento não disponível neste aparelho.");
    }
    const fileUri = await saveBudgetPdf(budget);
    await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "Enviar orçamento",
    });
    return "done";
};

/** No celular, o menu do sistema mostra a prévia do PDF (iOS) ou oferece abrir num leitor de PDF (Android). */
export const viewBudgetPdf = shareBudgetPdf;

export const downloadBudgetPdf = async (_budget: Budget): Promise<void> => {
    throw new Error("Use o botão Compartilhar para salvar o PDF.");
};
