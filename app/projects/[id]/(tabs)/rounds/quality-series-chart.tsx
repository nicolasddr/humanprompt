import { Badge } from '@/app/components/ui/badge'
import { Disclosure } from '@/app/components/ui/disclosure'
import { formatDate } from '@/app/notifications/labels'
import { SCALE, scaleLabel, type ScaleValue } from '../evaluate/scale'
import type { Quality } from './quality'
import { QualityValue } from './quality-panel'
import {
  QUALITY_SERIES_NUMBERS,
  QUALITY_UNRATED,
  QUALITY_UNRATED_WITHOUT_OUTLIERS,
  levelsText,
  qualityTotal,
} from './quality-labels'
import type { QualitySeriesPoint } from './quality-series'
import { AGREEMENT_WITHOUT_OUTLIERS_LABEL } from './agreement-labels'
import { LineSeriesChart } from './line-series-chart'
import { formatShare } from './share'

const GRID = [0, 0.25, 0.5, 0.75, 1]

const TICKS = [0, 0.5, 1].map((value) => ({ value, label: formatShare(value) }))

const LINE_COLOR: Record<ScaleValue, { stroke: string; swatch: string }> = {
  high: { stroke: 'stroke-quality-high', swatch: 'bg-quality-high' },
  medium: { stroke: 'stroke-quality-medium', swatch: 'bg-quality-medium' },
  low: { stroke: 'stroke-quality-low', swatch: 'bg-quality-low' },
}

function levelOf(quality: Quality, value: ScaleValue) {
  if (!quality.rated) return null
  return quality.levels.find((level) => level.value === value) ?? null
}

function shareOf(quality: Quality, value: ScaleValue): number | null {
  return levelOf(quality, value)?.share ?? null
}

function shareText(quality: Quality, value: ScaleValue): string | null {
  const level = levelOf(quality, value)
  return level ? `${formatShare(level.share)} (${level.count})` : null
}

function pointNotes(point: QualitySeriesPoint): string[] {
  const { all, withoutOutliers } = point.pair
  const notes = [all.rated ? qualityTotal(all.total) : QUALITY_UNRATED]
  if (withoutOutliers) {
    notes.push(
      `${AGREEMENT_WITHOUT_OUTLIERS_LABEL}: ` +
        qualityText(withoutOutliers, QUALITY_UNRATED_WITHOUT_OUTLIERS),
    )
  }
  return notes
}

function qualityText(quality: Quality, unrated: string): string {
  return quality.rated
    ? `${levelsText(quality.levels)} · ${qualityTotal(quality.total)}`
    : unrated
}

function pointLabel(point: QualitySeriesPoint): string {
  const { all, withoutOutliers } = point.pair
  const label = `Rodada ${point.roundNumber}: ${qualityText(all, QUALITY_UNRATED)}`
  return withoutOutliers
    ? `${label}, ${AGREEMENT_WITHOUT_OUTLIERS_LABEL}: ` +
        qualityText(withoutOutliers, QUALITY_UNRATED_WITHOUT_OUTLIERS)
    : label
}

function PointStatus({ point }: { point: QualitySeriesPoint }) {
  return point.closedAt ? (
    <span>fechada em {formatDate(point.closedAt)}</span>
  ) : (
    <Badge tone="info">Aberta</Badge>
  )
}

export function QualitySeriesChart({ points }: { points: readonly QualitySeriesPoint[] }) {
  return (
    <div className="flex flex-col gap-3">
      <LineSeriesChart
        points={points}
        grid={GRID}
        ticks={TICKS}
        lines={SCALE.map((value) => ({
          key: value,
          label: scaleLabel(value),
          name: scaleLabel(value),
          strokeClass: LINE_COLOR[value].stroke,
          swatchClass: LINE_COLOR[value].swatch,
          values: points.map((point) => shareOf(point.pair.all, value)),
          texts: points.map((point) => shareText(point.pair.all, value)),
        }))}
        pointLabel={(index) => pointLabel(points[index])}
        pointNotes={(index) => pointNotes(points[index])}
      />

      <Disclosure summary={QUALITY_SERIES_NUMBERS}>
        <ul className="m-0 mt-2 flex list-none flex-col gap-2.5 p-0">
          {points.map((point) => (
            <li key={point.roundId}>
              <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                <span className="font-semibold text-ink">Rodada {point.roundNumber}</span>
                <span>
                  Codebook v{point.codebookVersionNumber} · Prompt v{point.promptVersionNumber}{' '}
                  · Fase {point.phase}
                </span>
                <PointStatus point={point} />
              </p>
              <QualityValue pair={point.pair} />
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  )
}
