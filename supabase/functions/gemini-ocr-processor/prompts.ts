// Prompts especializados para extração via Gemini.
// Todos retornam JSON estrito; cada extração inclui um objeto `confidence_scores`
// com chaves equivalentes aos campos extraídos: "high" | "medium" | "low" | "none".

const COMMON_RULES = `
REGRAS GERAIS:
1. Datas no formato ISO YYYY-MM-DD.
2. CPF formato XXX.XXX.XXX-XX, CNPJ formato XX.XXX.XXX/XXXX-XX.
3. Se um campo não for encontrado/ilegível, retorne null.
4. Nomes em CAIXA ALTA devem voltar em Title Case (ex: "João da Silva").
5. confidence_scores por campo: "high" (100% certo), "medium" (razoavelmente certo),
   "low" (difícil de ler), "none" (não encontrado).
6. Em "observacoes" indique problemas (corte, borrão, página faltando, baixa qualidade).
7. Retorne APENAS o JSON, sem markdown nem texto adicional.
`;

export const RG_PROMPT = `Você é especialista em extração de RG brasileiro.
Extraia os campos abaixo e retorne JSON válido com esta estrutura:

{
  "nome_completo": string|null,
  "rg": string|null,
  "cpf": string|null,
  "data_nascimento": "YYYY-MM-DD"|null,
  "orgao_emissor": string|null,
  "uf_emissor": string|null,
  "data_emissao": "YYYY-MM-DD"|null,
  "naturalidade": string|null,
  "nacionalidade": string|null,
  "filiacao_pai": string|null,
  "filiacao_mae": string|null,
  "confidence_scores": {
    "nome_completo": "high|medium|low|none",
    "rg": "high|medium|low|none",
    "cpf": "high|medium|low|none",
    "data_nascimento": "high|medium|low|none",
    "orgao_emissor": "high|medium|low|none",
    "uf_emissor": "high|medium|low|none",
    "data_emissao": "high|medium|low|none",
    "naturalidade": "high|medium|low|none",
    "nacionalidade": "high|medium|low|none",
    "filiacao_pai": "high|medium|low|none",
    "filiacao_mae": "high|medium|low|none"
  },
  "observacoes": string|null
}
${COMMON_RULES}`;

export const CPF_PROMPT = `Você é especialista em extração de comprovante de inscrição no CPF.
Retorne JSON:
{
  "nome_completo": string|null,
  "cpf": string|null,
  "data_nascimento": "YYYY-MM-DD"|null,
  "data_inscricao": "YYYY-MM-DD"|null,
  "situacao": string|null,
  "confidence_scores": {
    "nome_completo": "high|medium|low|none",
    "cpf": "high|medium|low|none",
    "data_nascimento": "high|medium|low|none",
    "data_inscricao": "high|medium|low|none",
    "situacao": "high|medium|low|none"
  },
  "observacoes": string|null
}
${COMMON_RULES}`;

export const CNH_PROMPT = `Você é especialista em CNH brasileira.
Retorne JSON:
{
  "nome_completo": string|null,
  "cpf": string|null,
  "numero_cnh": string|null,
  "data_nascimento": "YYYY-MM-DD"|null,
  "data_primeira_habilitacao": "YYYY-MM-DD"|null,
  "data_emissao": "YYYY-MM-DD"|null,
  "validade": "YYYY-MM-DD"|null,
  "categoria": string|null,
  "local_emissao": string|null,
  "uf_emissao": string|null,
  "filiacao_pai": string|null,
  "filiacao_mae": string|null,
  "numero_rg": string|null,
  "orgao_emissor_rg": string|null,
  "confidence_scores": {
    "nome_completo": "high|medium|low|none",
    "cpf": "high|medium|low|none",
    "numero_cnh": "high|medium|low|none",
    "data_nascimento": "high|medium|low|none",
    "data_primeira_habilitacao": "high|medium|low|none",
    "data_emissao": "high|medium|low|none",
    "validade": "high|medium|low|none",
    "categoria": "high|medium|low|none",
    "local_emissao": "high|medium|low|none",
    "uf_emissao": "high|medium|low|none",
    "filiacao_pai": "high|medium|low|none",
    "filiacao_mae": "high|medium|low|none",
    "numero_rg": "high|medium|low|none",
    "orgao_emissor_rg": "high|medium|low|none"
  },
  "observacoes": string|null
}
Categoria normalmente "A","B","AB","C","D","E" ou combinações.
${COMMON_RULES}`;

export const COMPROVANTE_RESIDENCIA_PROMPT = `Você é especialista em comprovantes de residência (luz, água, telefone, internet, gás, fatura).
Retorne JSON:
{
  "tipo_comprovante": "luz|agua|telefone|internet|gas|fatura_cartao|outro",
  "titular_nome": string|null,
  "titular_cpf_cnpj": string|null,
  "endereco_completo": {
    "logradouro": string|null,
    "numero": string|null,
    "complemento": string|null,
    "bairro": string|null,
    "cidade": string|null,
    "uf": string|null,
    "cep": string|null
  },
  "data_emissao": "YYYY-MM-DD"|null,
  "data_vencimento": "YYYY-MM-DD"|null,
  "valor": number|null,
  "mes_referencia": string|null,
  "empresa_emissora": string|null,
  "alerta_idade": boolean|null,
  "confidence_scores": {
    "tipo_comprovante": "high|medium|low|none",
    "titular_nome": "high|medium|low|none",
    "titular_cpf_cnpj": "high|medium|low|none",
    "endereco_completo": "high|medium|low|none",
    "data_emissao": "high|medium|low|none",
    "data_vencimento": "high|medium|low|none",
    "valor": "high|medium|low|none",
    "mes_referencia": "high|medium|low|none",
    "empresa_emissora": "high|medium|low|none"
  },
  "observacoes": string|null
}
REGRA: se data_emissao > 90 dias atrás, alerta_idade = true.
${COMMON_RULES}`;

export const CONTRATO_SOCIAL_PROMPT = `Você é especialista em contrato social de PJ brasileira.
Retorne JSON:
{
  "razao_social": string|null,
  "nome_fantasia": string|null,
  "cnpj": string|null,
  "nire": string|null,
  "data_constituicao": "YYYY-MM-DD"|null,
  "data_ultima_alteracao": "YYYY-MM-DD"|null,
  "endereco_completo": {
    "logradouro": string|null,
    "numero": string|null,
    "complemento": string|null,
    "bairro": string|null,
    "cidade": string|null,
    "uf": string|null,
    "cep": string|null
  },
  "capital_social": number|null,
  "capital_social_integralizado": number|null,
  "objeto_social": string|null,
  "socios": [
    {
      "nome": string,
      "cpf": string|null,
      "participacao_percentual": number|null,
      "participacao_valor": number|null,
      "cargo": string|null,
      "administrador": boolean
    }
  ],
  "junta_comercial_estado": string|null,
  "confidence_scores": {
    "razao_social": "high|medium|low|none",
    "nome_fantasia": "high|medium|low|none",
    "cnpj": "high|medium|low|none",
    "nire": "high|medium|low|none",
    "data_constituicao": "high|medium|low|none",
    "data_ultima_alteracao": "high|medium|low|none",
    "endereco_completo": "high|medium|low|none",
    "capital_social": "high|medium|low|none",
    "objeto_social": "high|medium|low|none",
    "socios": "high|medium|low|none",
    "junta_comercial_estado": "high|medium|low|none"
  },
  "observacoes": string|null
}
REGRAS ESPECIAIS:
- Capital em número decimal (sem R$).
- Identifique TODOS os sócios.
- Se múltiplas alterações, use a mais recente.
- Indicar se é 1ª/2ª alteração ou consolidação em "observacoes".
${COMMON_RULES}`;

export const CERTIDAO_JUNTA_PROMPT = `Você é especialista em Certidão Simplificada da Junta Comercial.
Retorne JSON:
{
  "razao_social": string|null,
  "nome_fantasia": string|null,
  "cnpj": string|null,
  "nire": string|null,
  "data_emissao": "YYYY-MM-DD"|null,
  "numero_certidao": string|null,
  "junta_comercial_estado": string|null,
  "data_validade": "YYYY-MM-DD"|null,
  "situacao_cadastral": string|null,
  "tipo_empresa": string|null,
  "capital_social": number|null,
  "administradores": [
    { "nome": string, "cpf": string|null, "cargo": string|null }
  ],
  "endereco_sede": string|null,
  "confidence_scores": {
    "razao_social": "high|medium|low|none",
    "cnpj": "high|medium|low|none",
    "nire": "high|medium|low|none",
    "data_emissao": "high|medium|low|none",
    "numero_certidao": "high|medium|low|none",
    "junta_comercial_estado": "high|medium|low|none",
    "data_validade": "high|medium|low|none",
    "situacao_cadastral": "high|medium|low|none",
    "tipo_empresa": "high|medium|low|none",
    "capital_social": "high|medium|low|none",
    "administradores": "high|medium|low|none",
    "endereco_sede": "high|medium|low|none"
  },
  "observacoes": string|null
}
Validade padrão de 30 dias. Se não houver data_validade explícita, calcule data_emissao + 30 dias.
${COMMON_RULES}`;

export const GENERIC_PROMPT = `Analise o documento e extraia o máximo de campos identificáveis.
Retorne JSON: { "campos": { "<chave>": "<valor>" }, "confidence_scores": { "<chave>": "high|medium|low|none" }, "observacoes": string|null }
${COMMON_RULES}`;

export function getPromptByType(type: string): string {
  switch (type) {
    case "rg": return RG_PROMPT;
    case "cpf": return CPF_PROMPT;
    case "cnh": return CNH_PROMPT;
    case "comprovante_residencia": return COMPROVANTE_RESIDENCIA_PROMPT;
    case "contrato_social":
    case "alteracao_contratual":
      return CONTRATO_SOCIAL_PROMPT;
    case "certidao_junta": return CERTIDAO_JUNTA_PROMPT;
    default: return GENERIC_PROMPT;
  }
}
