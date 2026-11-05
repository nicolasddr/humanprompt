import { EmptyState } from '@/app/components/ui/empty-state'
import type { ConcordancePoint } from './concordance-series'
import { CONCORDANCE_LINES, concordancePointLabel } from './concordance-series-labels'
import { DIVERGENCE_SEGMENT_CLASS } from './divergence-bar'
import { LineSeriesChart } from './line-series-chart'
import { formatShare } from './share'

const GRID = [0, 0.25, 0.5, 0.75, 1]

const TICKS = [0, 0.5, 1].map((value) => ({ value, label: formatShare(value) }))

const LINE_STROKE = {
  equal: 'stroke-faint',
  adjacent: 'stroke-warning',
  extreme: 'stroke-danger',
} as const

function sharesOf(point: ConcordancePoint) {
  const profile = point.profile
  if (!profile) return null
  return CONCORDANCE_LINES.map(({ key, label }) => ({
    label,
    value: formatShare(profile[key]),
  }))
}

function pointLabel(point: ConcordancePoint): string {
  const shares = sharesOf(point)
  return shares
    ? concordancePointLabel(point.roundNumber, shares)
    : `Rodada ${point.roundNumber}: sem pares de notas`
}

export function ConcordanceSeriesChart({ points }: { points: readonly ConcordancePoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyState>
        Nenhuma rodada ainda. A série começa na primeira rodada, com um ponto por rodada.
      </EmptyState>
    )
  }

  return (
    <LineSeriesChart
      points={points}
      grid={GRID}
      ticks={TICKS}
      lines={CONCORDANCE_LINES.map(({ key, label }) => ({
        key,
        label,
        strokeClass: LINE_STROKE[key],
        swatchClass: DIVERGENCE_SEGMENT_CLASS[key],
        values: points.map((point) => point.profile?.[key] ?? null),
      }))}
      pointLabel={(index) => pointLabel(points[index])}
    />
  )
}
