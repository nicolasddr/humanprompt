import { plural } from '@/lib/plural'
import { scaleLabel } from '../evaluate/scale'
import { PHASE_3, PHASE_4 } from '../../pipeline/preconditions'
import type { QualityLevel } from './quality'
import { formatShare, formatWholeShare } from './share'
import { CELL_NOT_APPLICABLE_TITLE, CELL_UNRATED_LABEL } from './agreement-labels'

export const QUALITY_LABEL = 'Qualidade'

export const QUALITY_UNRATED = 'ainda não há notas'

export const QUALITY_UNRATED_WITHOUT_OUTLIERS = 'não sobra nota depois da exclusão'

export const QUALITY_HINT =
  `A distribuição das notas desta rodada entre ${scaleLabel('high')}, ` +
  `${scaleLabel('medium')} e ${scaleLabel('low')}.`

export const QUALITY_ALL_DEFINITIONS = 'Todas'

export const QUALITY_NOT_APPLICABLE = 'não se aplica'

export const QUALITY_PER_RESPONSE_LEAD = 'Avaliados por resposta:'

export const QUALITY_HEAT_CAPTION =
  `% de notas ${scaleLabel('high')} em cada definição × critério. ` +
  `Quanto mais escuro, mais ${scaleLabel('high')}.`

export const QUALITY_VIEW_ALL = 'Todas as notas'

export function qualityViewWithoutOutliers(excluded: number): string {
  return `Sem outliers (${plural(excluded, 'avaliador fora', 'avaliadores fora')})`
}

export const QUALITY_VIEW_LABEL = 'Notas usadas na seção'

export const QUALITY_VIEW_RESULT =
  `O resultado da rodada é o de “${QUALITY_VIEW_ALL}”; sem outliers é o mesmo dado, ` +
  'só sem as notas de quem foi marcado.'

export const QUALITY_HEAT_LEGEND =
  `Cada célula traz a porcentagem de notas ${scaleLabel('high')} daquela definição × ` +
  'critério, e o fundo fica mais escuro quanto maior ela é; a distribuição entre ' +
  `${scaleLabel('high')}, ${scaleLabel('medium')} e ${scaleLabel('low')}, com as ` +
  'contagens, aparece ao passar o mouse na célula. ' +
  `A linha “${QUALITY_ALL_DEFINITIONS}” junta as notas do critério em todas as definições ` +
  'que o têm, e a porcentagem sai desse total, e não da média das células. ' +
  `A célula hachurada é de ${CELL_NOT_APPLICABLE_TITLE}, que não se aplica a esta; ` +
  `“${CELL_UNRATED_LABEL}” é célula que existe no codebook e que ninguém avaliou ainda, ` +
  'e não vale 0%. Os critérios por resposta julgam a resposta inteira, sem definição, e ' +
  'ficam na frase abaixo da grade. ' +
  'Com avaliador marcado como outlier, o seletor no topo da seção escolhe entre ' +
  `“${QUALITY_VIEW_ALL}” e as notas sem os outliers, e a seção inteira, do resumo à ` +
  'grade, segue a escolha.'

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
