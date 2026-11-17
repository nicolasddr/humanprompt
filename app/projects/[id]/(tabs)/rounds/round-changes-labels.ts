import { QUALITY_LABEL } from './quality-labels'

export const CODEBOOK_AND_PROMPT_NOTICE =
  'O codebook e o prompt mudaram juntos em relação à rodada anterior: uma diferença ' +
  `no ICR ou na ${QUALITY_LABEL} desta rodada não se atribui a um nem ao outro.`

export const CODEBOOK_AND_PROMPT_WITH_INPUT_NOTICE =
  'Além da forma de montar a entrada, mudou também a versão de codebook, a de prompt ' +
  `ou as duas: uma diferença no ICR ou na ${QUALITY_LABEL} desta rodada não se ` +
  'atribui a um nem ao outro, nem só à forma de montar a entrada.'
