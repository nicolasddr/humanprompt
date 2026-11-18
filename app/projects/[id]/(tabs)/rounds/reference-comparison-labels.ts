import { SCALE, scaleLabel, type ScaleValue } from '../evaluate/scale'
import { PHASE_3 } from '../../pipeline/preconditions'
import { formatAlpha } from './agreement-labels'
import { columnIdentity, type MatrixCell } from './agreement-matrix'
import type { Quality } from './quality'
import { QUALITY_LABEL, QUALITY_VIEW_ALL, formatWholeShare } from './quality-labels'
import type { ComparedRound } from './reference-comparison'
import type { ComparisonView } from './comparison-view'

export const REFERENCE_COMPARISON_TITLE = 'Comparação com a rodada de referência'

export const REFERENCE_COMPARISON_HELP =
  'A rodada de referência é a que validou as versões de codebook e de prompt que a Fase 4 ' +
  'testa.'

export const COMPARISON_AGREEMENT_GROUP = 'ICR'

export const COMPARISON_QUALITY_GROUP = QUALITY_LABEL

export const COMPARISON_TOTAL_ROW = 'Notas'

export const COMPARISON_EMPTY = '—'

export const COMPARISON_EMPTY_LEGEND = `${COMPARISON_EMPTY} poucas notas para calcular o ICR.`

export const COMPARISON_ARROW = '→'

export const COMPARISON_SIDES = `referência ${COMPARISON_ARROW} esta`

export const COMPARISON_VIEW_LABEL = 'Notas usadas na comparação'

export const COMPARISON_VIEW_ALL = QUALITY_VIEW_ALL

export const COMPARISON_VIEW_WITHOUT_OUTLIERS = 'Sem outliers'

export const ALPHA_WORSE_DROP = 0.05

export const SHARE_WORSE_POINTS = 10

export function comparisonHeading(referenceNumber: number, roundNumber: number): string {
  return `Rodada ${referenceNumber} ${COMPARISON_ARROW} Rodada ${roundNumber}`
}

export type ComparisonRow = {
  key: string
  label: string
  level?: ScaleValue
  secondary: boolean
  reference: string | null
  round: string | null
  worse: boolean
}

export type ComparisonGroup = { key: string; label: string; rows: ComparisonRow[] }

export type ComparisonTable = { groups: ComparisonGroup[]; fewNotes: boolean }

type Versions = { codebookVersionNumber: number; promptVersionNumber: number }

function versionsText(round: Versions): string {
  return `Codebook v${round.codebookVersionNumber} · Prompt v${round.promptVersionNumber}`
}

export function comparedVersions(
  reference: Versions & { roundNumber: number },
  round: Versions & { roundNumber: number },
): string | null {
  if (versionsText(reference) === versionsText(round)) return null
  return [reference, round]
    .map((side) => `Rodada ${side.roundNumber}: ${versionsText(side)}`)
    .join(' · ')
}

export function hasComparisonOutliers(sides: readonly ComparedRound[]): boolean {
  return sides.some(
    (side) =>
      (side.quality?.withoutOutliers ?? null) !== null ||
      side.agreement.some((row) => row.withoutOutliers !== null),
  )
}

type Alpha = { text: string | null; value: number | null; few: boolean }

function alphaOf(cell: MatrixCell | null): Alpha {
  if (cell === null) return { text: null, value: null, few: false }
  if (cell.state !== 'calculated' || !cell.agreement.calculable) {
    return { text: null, value: null, few: true }
  }
  const text = formatAlpha(cell.agreement.alpha)
  return { text, value: Number(text.replace(',', '.')), few: false }
}

function alphaWorse(reference: number | null, round: number | null): boolean {
  if (reference === null || round === null) return false
  return Math.round((reference - round) * 1000) >= Math.round(ALPHA_WORSE_DROP * 1000)
}

function agreementGroup(sides: readonly ComparedRound[], view: ComparisonView) {
  const criteria = new Map<string, string>()
  for (const side of sides) {
    for (const { column } of side.agreement) {
      const identity = columnIdentity(column)
      if (!criteria.has(identity)) criteria.set(identity, column.name)
    }
  }

  let fewNotes = false
  const rows = [...criteria].map(([identity, name]): ComparisonRow => {
    const [reference, round] = sides.map((side) => {
      const match = side.agreement.find((row) => columnIdentity(row.column) === identity)
      if (!match) return alphaOf(null)
      return alphaOf(view === 'without-outliers' ? (match.withoutOutliers ?? match.cell) : match.cell)
    })
    fewNotes ||= reference.few || round.few
    return {
      key: `agreement-${identity}`,
      label: name,
      secondary: false,
      reference: reference.text,
      round: round.text,
      worse: alphaWorse(reference.value, round.value),
    }
  })

  return { rows, fewNotes }
}

function qualityOf(side: ComparedRound, view: ComparisonView): Quality | null {
  if (!side.quality) return null
  return view === 'without-outliers'
    ? (side.quality.withoutOutliers ?? side.quality.all)
    : side.quality.all
}

function shareOf(quality: Quality | null, value: ScaleValue): number | null {
  if (!quality?.rated) return null
  const level = quality.levels.find((candidate) => candidate.value === value)
  return level ? level.share : null
}

function wholePoints(share: number): number {
  return Number(formatWholeShare(share).replace('%', ''))
}

function levelWorse(value: ScaleValue, reference: number | null, round: number | null): boolean {
  if (reference === null || round === null) return false
  const drop = wholePoints(reference) - wholePoints(round)
  if (value === 'high') return drop >= SHARE_WORSE_POINTS
  if (value === 'low') return -drop >= SHARE_WORSE_POINTS
  return false
}

function totalOf(quality: Quality | null): string | null {
  return quality?.rated ? String(quality.total) : null
}

function qualityGroup(sides: readonly ComparedRound[], view: ComparisonView): ComparisonRow[] {
  const [reference, round] = sides.map((side) => qualityOf(side, view))

  const levels = SCALE.map((value): ComparisonRow => {
    const before = shareOf(reference, value)
    const after = shareOf(round, value)
    return {
      key: value,
      label: scaleLabel(value),
      level: value,
      secondary: false,
      reference: before === null ? null : formatWholeShare(before),
      round: after === null ? null : formatWholeShare(after),
      worse: levelWorse(value, before, after),
    }
  })

  return [
    ...levels,
    {
      key: 'total',
      label: COMPARISON_TOTAL_ROW,
      secondary: true,
      reference: totalOf(reference),
      round: totalOf(round),
      worse: false,
    },
  ]
}

export function comparisonTable(
  reference: ComparedRound,
  round: ComparedRound,
  view: ComparisonView = 'all',
): ComparisonTable {
  const sides = [reference, round]
  const agreement = agreementGroup(sides, view)

  return {
    groups: [
      ...(agreement.rows.length > 0
        ? [{ key: 'agreement', label: COMPARISON_AGREEMENT_GROUP, rows: agreement.rows }]
        : []),
      { key: 'quality', label: COMPARISON_QUALITY_GROUP, rows: qualityGroup(sides, view) },
    ],
    fewNotes: agreement.fewNotes,
  }
}

export function noReferenceMessage(roundNumber: number): string {
  return (
    `Não há rodada fechada da Fase ${PHASE_3} antes da rodada ${roundNumber}, e por isso não ` +
    'há com o que comparar.'
  )
}
