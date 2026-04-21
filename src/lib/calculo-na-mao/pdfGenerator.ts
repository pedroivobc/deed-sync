import jsPDF from "jspdf";
import { formatCurrency } from "./currency";

export interface PdfItem {
  label: string;
  valor: number | string;
}

export interface PdfParams {
  titulo: string;
  subtipo?: string;
  base?: number;
  itens: PdfItem[];
  total: number;
  responsavel?: { nome: string; telefone?: string; email?: string };
  cliente?: { nome: string; documento?: string };
  inscricao?: string;
  endereco?: string;
}

/**
 * Gera o PDF padrão Clemente Assessoria (sempre tema claro / impressão).
 * Não usa cores hex hard-coded fora do PDF — o documento de impressão
 * mantém paleta fixa preto/dourado por brand consistency.
 */
export function generateClementePDF(params: PdfParams): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const mL = 20;
  const mR = 20;
  const cW = pageW - mL - mR;

  let y = 20;

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text("Clemente Assessoria", pageW / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  const today = new Date().toLocaleDateString("pt-BR");
  doc.text(`Documento gerado em ${today}`, pageW / 2, y, { align: "center" });
  y += 8;

  // Linha dourada
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.8);
  doc.line(mL, y, pageW - mR, y);
  y += 8;

  // Título do cálculo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(params.titulo, mL, y);
  y += 6;

  if (params.subtipo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(params.subtipo, mL, y);
    y += 6;
  }

  // Cliente / Imóvel (opcional)
  const meta: string[] = [];
  if (params.cliente?.nome) meta.push(`Cliente: ${params.cliente.nome}`);
  if (params.inscricao) meta.push(`Inscrição: ${params.inscricao}`);
  if (params.endereco) meta.push(`Endereço: ${params.endereco}`);
  if (meta.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    meta.forEach((line) => {
      doc.text(line, mL, y);
      y += 5;
    });
    y += 2;
  }

  // Tabela de itens
  const rowH = 9;
  const labelX = mL + 3;
  const valueX = pageW - mR - 3;

  const drawRow = (
    label: string,
    value: string,
    bg: [number, number, number],
    fg: [number, number, number],
    bold = false,
  ) => {
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(mL, y, cW, rowH, "F");
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(fg[0], fg[1], fg[2]);
    doc.text(label, labelX, y + 6);
    doc.text(value, valueX, y + 6, { align: "right" });
    y += rowH;
  };

  if (params.base !== undefined) {
    drawRow("Base de Cálculo", formatCurrency(params.base), [26, 26, 26], [255, 255, 255], true);
  }

  params.itens.forEach((item, i) => {
    const bege = i % 2 === 0;
    const value = typeof item.valor === "number" ? formatCurrency(item.valor) : item.valor;
    drawRow(
      item.label,
      value,
      bege ? [254, 249, 240] : [255, 255, 255],
      [40, 40, 40],
      false,
    );
  });

  // Total destacado
  drawRow("TOTAL", formatCurrency(params.total), [212, 175, 55], [20, 20, 20], true);

  // Rodapé
  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(mL, y, pageW - mR, y);
  y += 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(
    "Valores estimados. Sujeitos a alteração após análise documental pelo cartório.",
    pageW / 2,
    y,
    { align: "center" },
  );
  y += 4;

  if (params.responsavel) {
    const r = params.responsavel;
    const linha = [r.nome, r.telefone, r.email].filter(Boolean).join("  •  ");
    doc.text(linha, pageW / 2, y, { align: "center" });
  }

  return doc.output("blob");
}

/** Helper utilitário: dispara o download direto do navegador. */
export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}