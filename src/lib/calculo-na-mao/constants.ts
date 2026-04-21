/**
 * Constantes globais do módulo Cálculo na Mão.
 * Manter sincronizado com a tabela de emolumentos do cartório.
 */

export const PRECO_FOLHA = 13.91;
export const LIMITE_ITCD_25 = 440_000;
export const CERTIDOES_PADRAO = 400;
export const HONORARIOS_PADRAO = 700;

// Valores de registro divergem historicamente entre Escrituras e Doação.
// Confirmar com Pedro antes de consolidar.
export const ESCRITURA_REGISTRO_BASE = 496.74;
export const ESCRITURA_REGISTRO_REDUZIDO = 248.37;
export const DOACAO_REGISTRO_BASE = 335.52;
export const DOACAO_REGISTRO_REDUZIDO = 168.26;

// Renúncia de usufruto: valor fixo de registro (sem ITCD).
export const RENUNCIA_USUFRUTO_REGISTRO = 500;