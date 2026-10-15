import { buildBudgetPdf, getBudgetFileName } from "./budgetPdf";
import type { Budget } from "./budgetService";

export type FileResult = "done" | "downloaded";

const toFile = (budget: Budget): File =>
    new File([buildBudgetPdf(budget).output("blob")], getBudgetFileName(budget), { type: "application/pdf" });

const triggerDownload = (file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Abre o PDF numa nova aba para visualizar.
 * Se o navegador bloquear a aba, o PDF é baixado.
 */
export const viewBudgetPdf = async (budget: Budget): Promise<FileResult> => {
    const file = toFile(budget);
    const url = URL.createObjectURL(file);
    const opened = window.open(url, "_blank");
    if (!opened) {
        URL.revokeObjectURL(url);
        triggerDownload(file);
        return "downloaded";
    }
    // A aba precisa do endereço enquanto carrega o PDF; libera a memória depois de um tempo.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "done";
};

export const downloadBudgetPdf = async (budget: Budget): Promise<void> => {
    triggerDownload(toFile(budget));
};

/**
 * Compartilha o arquivo PDF pelo menu do sistema (Web Share API).
 * Navegadores sem suporte a compartilhar arquivos recebem o download do PDF.
 * O PDF é gerado de forma síncrona para manter o "clique" do usuário válido para o navigator.share.
 */
export const shareBudgetPdf = async (budget: Budget): Promise<FileResult> => {
    const file = toFile(budget);

    if (navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: "Orçamento", text: `Orçamento - ${budget.client.name}` });
            return "done";
        } catch (error: any) {
            if (error?.name === "AbortError") return "done";
            // NotAllowedError etc.: cai para o download.
        }
    }

    triggerDownload(file);
    return "downloaded";
};
