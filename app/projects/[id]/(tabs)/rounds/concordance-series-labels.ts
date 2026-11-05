import { AGREEMENT_ALL_LABEL } from './agreement-labels'
import { divergenceLabel } from './divergence'

export const CONCORDANCE_SERIES_TITLE = 'Concordância por rodada'

export const CONCORDANCE_SERIES_HINT =
  'A parcela dos pares com notas iguais, em divergência adjacente e em divergência ' +
  'extrema, um ponto por rodada, em ordem cronológica.'

export const CONCORDANCE_SERIES_POINTS: readonly string[] = [
  'Cada ponto junta todas as células avaliadas da rodada, de todos os critérios: o par ' +
    'é sempre de notas na mesma resposta e na mesma célula, e a parcela sai do total da ' +
    'rodada, e não da média dos critérios.',
  `O ponto é sempre o valor ${AGREEMENT_ALL_LABEL}, porque cada rodada tem o seu próprio ` +
    'conjunto de outliers marcados. O valor sem os marcados aparece na página da rodada.',
  'A rodada em que nenhuma célula tem duas notas fica sem ponto, e a linha passa direto ' +
    'por ela.',
  'A ferramenta não fixa um alvo para essas parcelas: a confiabilidade (α), logo acima, ' +
    'é que desconta o acaso.',
]

export const CONCORDANCE_LINES = [
  { key: 'equal', label: 'Notas iguais' },
  { key: 'adjacent', label: divergenceLabel('adjacent') },
  { key: 'extreme', label: divergenceLabel('extreme') },
] as const

export function concordancePointLabel(
  roundNumber: number,
  shares: readonly { label: string; value: string }[],
): string {
  return (
    `Rodada ${roundNumber}: ` +
    shares.map(({ label, value }) => `${value} ${label.toLowerCase()}`).join(', ')
  )
}
