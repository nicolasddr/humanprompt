import { divergenceLabel } from './divergence'

export const CONCORDANCE_SERIES_TITLE = 'Concordância por rodada'

export const CONCORDANCE_SERIES_HINT =
  'A parcela dos pares com notas iguais, em divergência adjacente e em divergência ' +
  'extrema, um ponto por rodada, em ordem cronológica.'

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
