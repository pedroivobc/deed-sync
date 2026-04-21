import { useMutation } from "@tanstack/react-query";
import { callOcr, fileToBase64 } from "@/lib/ocr";

export interface IptuExtraction {
  inscricao_imobiliaria: string | null;
  endereco_completo: string | null;
  proprietario_nome: string | null;
  proprietario_cpf_cnpj: string | null;
  exercicio: number | null;
  terreno: {
    area_isotima: string | null;
    valor_venal: number | null;
    valor_m2: number | null;
    area_m2: number | null;
  };
  edificacao: {
    tipo: string | null;
    padrao: string | null;
    valor_venal: number | null;
    valor_m2: number | null;
    area_construida_m2: number | null;
  };
  valor_venal_total: number | null;
  confidence_scores?: Record<string, "high" | "medium" | "low" | "none">;
  observacoes?: string | null;
}

/** Faz OCR de um carnê de IPTU PJF e devolve dados estruturados. */
export function useExtractIptu() {
  return useMutation({
    mutationFn: async (file: File): Promise<IptuExtraction> => {
      if (file.type !== "application/pdf") {
        throw new Error("Envie um arquivo PDF do IPTU.");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Arquivo excede 10MB.");
      }
      const base64 = await fileToBase64(file);
      const result = await callOcr<IptuExtraction>("extract_document", {
        file_base64: base64,
        mime_type: file.type,
        file_name: file.name,
        file_size: file.size,
        document_type: "iptu_pjf",
      });
      if (!result.ok || !result.extracted) {
        throw new Error(result.error ?? "Falha ao extrair dados do IPTU.");
      }
      return result.extracted as IptuExtraction;
    },
  });
}