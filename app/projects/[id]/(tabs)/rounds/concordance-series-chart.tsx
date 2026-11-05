import { EmptyState } from '@/app/components/ui/empty-state'
import { cx } from '@/app/components/ui/cx'
import { phaseRuns } from './agreement-series'
import type { ConcordancePoint } from './concordance-series'
import { CONCORDANCE_LINES, concordancePointLabel } from './concordance-series-labels'
import { DIVERGENCE_SEGMENT_CLASS } from './divergence-bar'
import { formatShare } from './share'

const CHART_SIZE = 100

const GRID = [0, 0.25, 0.5, 0.75, 1]

const AXIS = [0, 0.5, 1]

const LINE_STROKE = {
  equal: 'stroke-faint',
  adjacent: 'stroke-warning',
  extreme: 'stroke-danger',
} as const

type LineKey = keyof typeof LINE_STROKE

function yOf(share: number): number {
  return CHART_SIZE - Math.max(0, Math.min(1, share)) * CHART_SIZE
}

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

  const slot = CHART_SIZE / points.length
  const xOf = (index: number) => index * slot + slot / 2
  const runs = phaseRuns(points)
  const boundaries: number[] = []
  for (const run of runs.slice(0, -1)) {
    boundaries.push((boundaries.at(-1) ?? 0) + run.points.length)
  }

  const line = (key: LineKey) =>
    points
      .flatMap((point, index) =>
        point.profile ? [`${xOf(index)},${yOf(point.profile[key])}`] : [],
      )
      .join(' ')

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="flex gap-2">
        <div aria-hidden className="relative h-40 w-9 shrink-0 text-xs text-muted tabular-nums">
          {AXIS.map((share) => (
            <span
              key={share}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${yOf(share)}%` }}
            >
              {formatShare(share)}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <svg
            role="img"
            aria-label={points.map(pointLabel).join('; ')}
            viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
            preserveAspectRatio="none"
            className="h-40 w-full overflow-visible"
          >
            {GRID.map((share) => (
              <line
                key={share}
                x1={0}
                x2={CHART_SIZE}
                y1={yOf(share)}
                y2={yOf(share)}
                vectorEffect="non-scaling-stroke"
                className={share === 0 ? 'stroke-line-strong' : 'stroke-line'}
              />
            ))}

            {boundaries.map((index) => (
              <line
                key={`phase-${index}`}
                x1={index * slot}
                x2={index * slot}
                y1={0}
                y2={CHART_SIZE}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
                className="stroke-line-strong"
              />
            ))}

            {CONCORDANCE_LINES.map(({ key }) => (
              <polyline
                key={key}
                points={line(key)}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className={LINE_STROKE[key]}
              />
            ))}

            {points.map((point, index) => {
              const profile = point.profile
              if (!profile) return null

              return (
                <g key={point.roundId}>
                  <title>{pointLabel(point)}</title>
                  {CONCORDANCE_LINES.map(({ key }) => (
                    <path
                      key={key}
                      d={`M ${xOf(index)} ${yOf(profile[key])} l 0 0`}
                      strokeWidth={8}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      className={LINE_STROKE[key]}
                    />
                  ))}
                </g>
              )
            })}
          </svg>

          <div aria-hidden className="flex w-full text-xs text-muted tabular-nums">
            {points.map((point) => (
              <span key={point.roundId} className="min-w-0 flex-1 text-center">
                R{point.roundNumber}
              </span>
            ))}
          </div>

          <div aria-hidden className="flex w-full text-xs text-faint">
            {runs.map((run) => (
              <span
                key={run.points[0].roundId}
                className="min-w-0 text-center"
                style={{ flex: run.points.length }}
              >
                Fase {run.phase}
              </span>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="flex flex-wrap gap-x-[22px] gap-y-1.5 text-xs text-muted">
        {CONCORDANCE_LINES.map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cx('inline-block h-0.5 w-4 rounded-full', DIVERGENCE_SEGMENT_CLASS[key])}
            />
            {label}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
