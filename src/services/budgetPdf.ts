import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { COLORS } from "../constants/theme";
import { WORKSHOP } from "../constants/workshop";
import { formatBudgetNumber, formatDate, formatDateTime, formatMoney } from "../utils/formatters";
import { Budget, getBudgetTotal } from "./budgetService";

const PAGE_MARGIN = 14;
const CONTENT_TOP = 44;
const FOOTER_SPACE = 20;

// As fontes padrão do PDF não têm o espaço especial que o Intl usa em "R$ 10,00".
const clean = (text: string): string => text.replace(/[  ]/g, " ");
const money = (value: number) => clean(formatMoney(value));

export const getBudgetFileName = (budget: Budget): string => {
    const plate = budget.vehicle.licensePlate.replace(/[^A-Z0-9]/gi, "");
    const day = formatDate(budget.date).split("/").reverse().join("-");
    return `Orcamento_${formatBudgetNumber(budget.number)}_${plate}_${day}.pdf`;
};

const drawHeader = (doc: jsPDF) => {
    const width = doc.internal.pageSize.getWidth();
    const center = width / 2;

    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(COLORS.ink);
    doc.text(WORKSHOP.name, center, 16, { align: "center" });

    const ownerLine = [WORKSHOP.cnpj && `CNPJ: ${WORKSHOP.cnpj}`, WORKSHOP.owner && `Responsável: ${WORKSHOP.owner}`]
        .filter(Boolean)
        .join("  ·  ");
    const phoneLine = WORKSHOP.phones.length ? `Fone(s): ${WORKSHOP.phones.join(" / ")}` : "";

    doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(COLORS.gray);
    [WORKSHOP.address, ownerLine, phoneLine]
        .filter(Boolean)
        .forEach((line, i) => doc.text(line, center, 22.5 + i * 4.8, { align: "center" }));

    doc.setFillColor(COLORS.orange).rect(PAGE_MARGIN, 36, width - PAGE_MARGIN * 2, 1, "F");
};

const drawFooter = (doc: jsPDF, budget: Budget, page: number, pages: number) => {
    const width = doc.internal.pageSize.getWidth();
    const y = doc.internal.pageSize.getHeight() - 10;

    doc.setDrawColor(COLORS.border).setLineWidth(0.3).line(PAGE_MARGIN, y - 5, width - PAGE_MARGIN, y - 5);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(COLORS.gray);
    doc.text(`Gerado em: ${formatDateTime(budget.updatedAt ?? budget.createdAt)}`, PAGE_MARGIN, y);
    doc.text(`Página ${page} de ${pages}`, width / 2, y, { align: "center" });
    if (budget.expiresAt) {
        doc.text(`Orçamento válido até: ${formatDate(budget.expiresAt)}`, width - PAGE_MARGIN, y, { align: "right" });
    }
};

const drawSectionTitle = (doc: jsPDF, title: string, y: number): number => {
    const width = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold").setFontSize(11.5).setTextColor(COLORS.ink);
    doc.text(title, PAGE_MARGIN, y);
    doc.setDrawColor(COLORS.ink).setLineWidth(0.4).line(PAGE_MARGIN, y + 2, width - PAGE_MARGIN, y + 2);
    return y + 8;
};

/** Escreve "Rótulo: valor" com quebra de linha; devolve a altura usada. */
const drawField = (doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number): number => {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(COLORS.ink);
    const labelText = `${label}: `;
    const labelWidth = doc.getTextWidth(labelText);
    doc.text(labelText, x, y);

    doc.setFont("helvetica", "normal");
    const lines: string[] = doc.splitTextToSize(value || "—", Math.max(maxWidth - labelWidth, 10));
    doc.text(lines, x + labelWidth, y);
    return lines.length * 4.6;
};

/** Monta o PDF do orçamento seguindo o modelo da oficina. Funciona no celular e no navegador. */
export const buildBudgetPdf = (budget: Budget): jsPDF => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const width = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = width - PAGE_MARGIN * 2;
    const { client, vehicle } = budget;

    let y = CONTENT_TOP;

    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(COLORS.orange);
    doc.text(`ORÇAMENTO Nº ${formatBudgetNumber(budget.number)}`, PAGE_MARGIN, y);
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(COLORS.gray);
    doc.text(`Data: ${formatDate(budget.date)}`, width - PAGE_MARGIN, y, { align: "right" });
    y += 9;

    // Cliente
    y = drawSectionTitle(doc, "Cliente", y);
    const half = contentWidth / 2;
    const nameHeight = drawField(doc, "Nome", client.name, PAGE_MARGIN, y, half - 4);
    drawField(doc, "Telefone", client.phone, PAGE_MARGIN + half, y, half);
    y += nameHeight;
    if (client.address) y += drawField(doc, "Endereço", client.address, PAGE_MARGIN, y, contentWidth);
    y += 4;

    // Veículo
    y = drawSectionTitle(doc, "Veículo", y);
    const vehicleFields: [string, string, number][] = [
        ["Marca", vehicle.brand, 0.22],
        ["Modelo", vehicle.model, 0.28],
        ["Ano", String(vehicle.year), 0.14],
        ["Cor", vehicle.color || "—", 0.16],
        ["Placa", vehicle.licensePlate, 0.2],
    ];
    let x = PAGE_MARGIN;
    let tallest = 0;
    for (const [label, value, share] of vehicleFields) {
        const columnWidth = contentWidth * share;
        tallest = Math.max(tallest, drawField(doc, label, value, x, y, columnWidth - 3));
        x += columnWidth;
    }
    y += tallest + 4;

    // Detalhamento
    y = drawSectionTitle(doc, "Detalhamento", y);
    autoTable(doc, {
        startY: y - 2,
        margin: { top: CONTENT_TOP, bottom: FOOTER_SPACE, left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [["Qtd.", "Descrição", "Preço Unitário", "Total"]],
        body: budget.services.map((s) => [
            s.quantity.toLocaleString("pt-BR"),
            s.description,
            money(s.price),
            money(s.quantity * s.price),
        ]),
        theme: "plain",
        styles: { font: "helvetica", fontSize: 9.5, textColor: COLORS.ink, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, valign: "middle" },
        headStyles: { fillColor: COLORS.ink, textColor: COLORS.white, fontStyle: "bold" },
        alternateRowStyles: { fillColor: COLORS.light },
        columnStyles: {
            0: { halign: "center", cellWidth: 16 },
            1: { halign: "left" },
            2: { halign: "right", cellWidth: 34 },
            3: { halign: "right", cellWidth: 34 },
        },
        didParseCell: (data) => {
            if (data.section === "head" && data.column.index !== 1) {
                data.cell.styles.halign = data.column.index === 0 ? "center" : "right";
            }
        },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // Total + assinatura precisam de ~50mm; se não couber, vão para a próxima página.
    if (y + 50 > pageHeight - FOOTER_SPACE) {
        doc.addPage();
        y = CONTENT_TOP + 4;
    }

    const totalText = `VALOR TOTAL DO SERVIÇO:  ${money(getBudgetTotal(budget))}`;
    doc.setFont("helvetica", "bold").setFontSize(12.5);
    const boxWidth = doc.getTextWidth(totalText) + 12;
    doc.setFillColor(COLORS.orange).roundedRect(width - PAGE_MARGIN - boxWidth, y, boxWidth, 11, 1.5, 1.5, "F");
    doc.setTextColor(COLORS.white).text(totalText, width - PAGE_MARGIN - 6, y + 7.4, { align: "right" });

    y += 32;
    const signatureWidth = 90;
    doc.setDrawColor(COLORS.ink).setLineWidth(0.3).line((width - signatureWidth) / 2, y, (width + signatureWidth) / 2, y);
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(COLORS.ink);
    doc.text(WORKSHOP.signature, width / 2, y + 5, { align: "center" });
    doc.setFont("helvetica", "italic").setTextColor(COLORS.gray);
    doc.text("Assinatura", width / 2, y + 10, { align: "center" });

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        drawHeader(doc);
        drawFooter(doc, budget, page, pages);
    }

    return doc;
};
