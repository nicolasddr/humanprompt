import { Badge } from '@/app/components/ui/badge'
import { EmptyState } from '@/app/components/ui/empty-state'
import { PER_RESPONSE_LABEL } from '../../pipeline/criteria'
import {
  AGREEMENT_BANDS,
  AGREEMENT_SOURCE,
  BAND_REFERENCE_LABEL,
  CELL_UNRATED_LABEL,
  cellNotCalculableLabel,
  formatAlpha,
  formatCut,
} from './agreement-labels'
import type { MatrixCell } from './agreement-matrix'
import type { AgreementSeries } from './agreement-series'
import { LineSeriesChart } from './line-series-chart'

const GRID = [0, 0.5, 1]

const TICKS = [0, 0.5, AGREEMENT_BANDS.acceptable, AGREEMENT_BANDS.good, 1].map((value) => ({
  value,
  label: formatCut(value),
}))

const REFERENCE = {
  values: [AGREEMENT_BANDS.acceptable, AGREEMENT_BANDS.good],
  label:
    `${BAND_REFERENCE_LABEL} de ${AGREEMENT_SOURCE}: ` +
    `${formatCut(AGREEMENT_BANDS.acceptable)} e ${formatCut(AGREEMENT_BANDS.good)}`,
}

const CRITERION_COLORS = [
  { stroke: 'stroke-series-1', swatch: 'bg-series-1' },
  { stroke: 'stroke-series-2', swatch: 'bg-series-2' },
  { stroke: 'stroke-series-3', swatch: 'bg-series-3' },
  { stroke: 'stroke-series-4', swatch: 'bg-series-4' },
  { stroke: 'stroke-series-5', swatch: 'bg-series-5' },
] as const

function alphaOf(cell: MatrixCell | null): number | null {
  return cell?.state === 'calculated' && cell.agreement.calculable
    ? cell.agreement.alpha
    : null
}

function cellText(cell: MatrixCell | null): string | null {
  if (!cell || cell.state === 'not_applicable') return null
  if (cell.state === 'unrated') return CELL_UNRATED_LABEL
  return cell.agreement.calculable
    ? formatAlpha(cell.agreement.alpha)
    : cellNotCalculableLabel(cell.agreement.reason)
}

function roundLabel(series: AgreementSeries, index: number): string {
  const round = series.rounds[index]
  const values = series.criteria.flatMap(({ column, points }) => {
    const text = cellText(points[index].cell)
    return text ? [`${column.name} ${text}`] : []
  })
  return values.length > 0
    ? `Rodada ${round.roundNumber}: ${values.join(', ')}`
    : `Rodada ${round.roundNumber}: sem critério avaliado`
}

export function AgreementSeriesChart({ series }: { series: AgreementSeries }) {
  const { rounds, criteria } = series

  if (rounds.length === 0) {
    return (
      <EmptyState>
        Nenhuma rodada ainda. A série começa na primeira rodada, e cada rodada rende um
        ponto sobre a versão de codebook que ela fixou.
      </EmptyState>
    )
  }

  return (
    <LineSeriesChart
      points={rounds}
      grid={GRID}
      ticks={TICKS}
      reference={REFERENCE}
      lines={criteria.map(({ key, column, points }, index) => {
        const color = CRITERION_COLORS[index % CRITERION_COLORS.length]
        return {
          key,
          label: (
            <span className="flex items-center gap-1.5">
              {column.name}
              {column.isGeneral ? <Badge tone="neutral">Geral</Badge> : null}
              {column.isPerResponse ? (
                <Badge tone="neutral">{PER_RESPONSE_LABEL}</Badge>
              ) : null}
            </span>
          ),
          strokeClass: color.stroke,
          swatchClass: color.swatch,
          values: points.map((point) => alphaOf(point.cell)),
        }
      })}
      pointLabel={(index) => roundLabel(series, index)}
    />
  )
}
