import { plural } from '@/lib/plural'
import { scaleLabel } from '../evaluate/scale'
import { PHASE_3, PHASE_4 } from '../../pipeline/preconditions'
import type { QualityLevel } from './quality'
import { formatShare, formatWholeShare } from './share'

export const QUALITY_LABEL = 'Qualidade'

export const QUALITY_UNRATED = 'ainda não há notas'

export const QUALITY_UNRATED_WITHOUT_OUTLIERS = 'não sobra nota depois da exclusão'

export const QUALITY_HINT =
  `A distribuição das notas desta rodada entre ${scaleLabel('high')}, ` +
  `${scaleLabel('medium')} e ${scaleLabel('low')}.`

export const QUALITY_ALL_DEFINITIONS = 'Todas'

export const QUALITY_NOT_APPLICABLE = 'não se aplica'

export const QUALITY_HEAT_CAPTION =
  `% de notas ${scaleLabel('high')} em cada definição × critério.`

export const QUALITY_VIEW_ALL = 'Todas as notas'

export function qualityViewWithoutOutliers(excluded: number): string {
  return `Sem outliers (${plural(excluded, 'avaliador fora', 'avaliadores fora')})`
}

export const QUALITY_VIEW_LABEL = 'Notas usadas na seção'

export const QUALITY_VIEW_RESULT =
  `O resultado da rodada é o de “${QUALITY_VIEW_ALL}”; sem outliers é o mesmo dado, ` +
  'só sem as notas de quem foi marcado.'

export const QUALITY_SERIES_HINT =
  `A distribuição das notas de cada rodada das Fases ${PHASE_3} e ${PHASE_4}, um ponto por rodada.`

export const QUALITY_SERIES_NOTE =
  'Um ponto por rodada, e nenhum valor que junte rodadas: cada distribuição descreve as ' +
  'versões de codebook e de prompt indicadas ao lado dela.'

export const QUALITY_SERIES_NUMBERS = 'Ver os números de cada rodada'

export { formatShare, formatWholeShare }

export function qualityTotal(total: number): string {
  return plural(total, 'nota', 'notas')
}

export function levelText(level: QualityLevel): string {
  return `${scaleLabel(level.value)} ${formatShare(level.share)} (${level.count})`
}

export function levelsText(levels: QualityLevel[]): string {
  return levels.map(levelText).join(' · ')
}

export function levelsShareText(levels: QualityLevel[]): string {
  return levels.map((level) => `${scaleLabel(level.value)} ${formatShare(level.share)}`).join(' · ')
}

export function wholeLevelText(level: QualityLevel): string {
  return `${scaleLabel(level.value)} ${formatWholeShare(level.share)} (${level.count})`
}

export function wholeLevelsText(levels: QualityLevel[]): string {
  return levels.map(wholeLevelText).join(' · ')
}

export function levelShareText(level: QualityLevel): string {
  return `${formatWholeShare(level.share)} ${scaleLabel(level.value)}`
}

export function definitionsCoverage(count: number, total: number): string {
  return `em ${count} de ${plural(total, 'definição', 'definições')}`
}
