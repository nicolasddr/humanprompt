import type { ReactNode } from 'react'
import { cx } from '@/app/components/ui/cx'
import { phaseRuns } from './agreement-series'

const CHART_SIZE = 100

type LinePoint = { roundId: string; roundNumber: number; phase: number }

export type SeriesLine = {
  key: string
  label: ReactNode
  strokeClass: string
  swatchClass: string
  values: readonly (number | null)[]
}

export type SeriesTick = { value: number; label: string }

export type SeriesReference = { values: readonly number[]; label: string }

function yOf(value: number): number {
  return CHART_SIZE - Math.max(0, Math.min(1, value)) * CHART_SIZE
}

export function LineSeriesChart<T extends LinePoint>({
  points,
  lines,
  grid,
  ticks,
  reference,
  pointLabel,
}: {
  points: readonly T[]
  lines: readonly SeriesLine[]
  grid: readonly number[]
  ticks: readonly SeriesTick[]
  reference?: SeriesReference
  pointLabel: (index: number) => string
}) {
  const slot = CHART_SIZE / points.length
  const xOf = (index: number) => index * slot + slot / 2
  const runs = phaseRuns(points)
  const boundaries: number[] = []
  for (const run of runs.slice(0, -1)) {
    boundaries.push((boundaries.at(-1) ?? 0) + run.points.length)
  }

  const polyline = (values: readonly (number | null)[]) =>
    values
      .flatMap((value, index) => (value === null ? [] : [`${xOf(index)},${yOf(value)}`]))
      .join(' ')

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="flex gap-2">
        <div aria-hidden className="relative h-40 w-9 shrink-0 text-xs text-muted tabular-nums">
          {ticks.map((tick) => (
            <span
              key={tick.value}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${yOf(tick.value)}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <svg
            role="img"
            aria-label={points.map((_, index) => pointLabel(index)).join('; ')}
            viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
            preserveAspectRatio="none"
            className="h-40 w-full overflow-visible"
          >
            {grid.map((value) => (
              <line
                key={value}
                x1={0}
                x2={CHART_SIZE}
                y1={yOf(value)}
                y2={yOf(value)}
                vectorEffect="non-scaling-stroke"
                className={value === 0 ? 'stroke-line-strong' : 'stroke-line'}
              />
            ))}

            {reference?.values.map((value) => (
              <line
                key={`reference-${value}`}
                x1={0}
                x2={CHART_SIZE}
                y1={yOf(value)}
                y2={yOf(value)}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
                className="stroke-faint"
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

            {lines.map((line) => (
              <polyline
                key={line.key}
                points={polyline(line.values)}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className={line.strokeClass}
              />
            ))}

            {points.map((point, index) => {
              const dots = lines.flatMap((line) => {
                const value = line.values[index]
                return value === null ? [] : [{ line, value }]
              })
              if (dots.length === 0) return null

              return (
                <g key={point.roundId}>
                  <title>{pointLabel(index)}</title>
                  {dots.map(({ line, value }) => (
                    <path
                      key={line.key}
                      d={`M ${xOf(index)} ${yOf(value)} l 0 0`}
                      strokeWidth={8}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      className={line.strokeClass}
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

      <figcaption className="flex flex-wrap items-center gap-x-[22px] gap-y-1.5 text-xs text-muted">
        {lines.map((line) => (
          <span key={line.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cx('inline-block h-0.5 w-4 rounded-full', line.swatchClass)}
            />
            {line.label}
          </span>
        ))}
        {reference ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-faint" />
            {reference.label}
          </span>
        ) : null}
      </figcaption>
    </figure>
  )
}
