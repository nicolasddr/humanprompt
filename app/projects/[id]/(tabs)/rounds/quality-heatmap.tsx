import { cx } from '@/app/components/ui/cx'
import { EmptyState } from '@/app/components/ui/empty-state'
import type {
  CodebookCriterion,
  CodebookDefinition,
} from '../../pipeline/codebook'
import type { RoundObservation } from './agreement'
import type { MatrixColumn, MeasuredCell } from './agreement-matrix'
import {
  CELL_NOT_APPLICABLE_TITLE,
  CELL_UNRATED_LABEL,
  matrixVersionNote,
} from './agreement-labels'
import { HowToRead } from './how-to-read'
import { HeatTipCell } from './quality-heat-tip-cell'
import { qualityByCriterion, qualityMatrix, type Quality, type QualityPair } from './quality'
import {
  QUALITY_ALL_DEFINITIONS,
  QUALITY_HEAT_CAPTION,
  QUALITY_HEAT_LEGEND,
  QUALITY_NOT_APPLICABLE,
  QUALITY_PER_RESPONSE_LEAD,
  definitionsCoverage,
  wholeLevelText,
  wholeLevelsText,
} from './quality-labels'
import { formatWholeShare, wholeShareNumber } from './share'
import { scaleLabel } from '../evaluate/scale'

const SCALE_STEPS = [0, 0.25, 0.5, 0.75, 1]

function heatAlpha(share: number): number {
  return 0.08 + 0.92 * Math.pow(share, 1.6)
}

function heatStyle(share: number): React.CSSProperties {
  const percent = Math.round(heatAlpha(share) * 100)
  return {
    backgroundColor: `color-mix(in srgb, var(--color-quality-high) ${percent}%, transparent)`,
  }
}

function onDark(share: number): boolean {
  return heatAlpha(share) >= 0.55
}

function highOf(quality: Quality) {
  return quality.rated ? quality.levels[0] : null
}

function levelsTitle(quality: Quality): string | undefined {
  return quality.rated ? wholeLevelsText(quality.levels) : undefined
}

function levelLines(quality: Quality): string[] {
  return quality.rated ? quality.levels.map(wholeLevelText) : []
}

const NONE: ReadonlySet<string> = new Set<string>()

const cellClass = 'h-8 min-w-16 rounded-[5px] px-2 text-center align-middle tabular-nums'

function HeatCell({ cell }: { cell: MeasuredCell<QualityPair> }) {
  if (cell.state === 'not_applicable') {
    return (
      <td
        title={CELL_NOT_APPLICABLE_TITLE}
        className={cx(
          cellClass,
          'bg-[repeating-linear-gradient(45deg,var(--color-canvas),var(--color-canvas)_4px,var(--color-line)_4px,var(--color-line)_8px)]',
        )}
      >
        <span className="sr-only">{QUALITY_NOT_APPLICABLE}</span>
      </td>
    )
  }

  const high = cell.state === 'measured' ? highOf(cell.value.all) : null

  if (cell.state === 'unrated' || !high) {
    return (
      <td className={cx(cellClass, 'border border-dashed border-line-strong text-xs text-muted')}>
        {CELL_UNRATED_LABEL}
      </td>
    )
  }

  return (
    <HeatTipCell
      lines={levelLines(cell.value.all)}
      style={heatStyle(high.share)}
      className={cx(
        cellClass,
        'font-semibold',
        onDark(high.share) ? 'text-white' : high.count === 0 ? 'text-faint' : 'text-ink',
      )}
    >
      {wholeShareNumber(high.share)}
    </HeatTipCell>
  )
}

function HeatScale() {
  return (
    <span aria-hidden className="ml-1.5 inline-flex gap-0.5 align-middle">
      {SCALE_STEPS.map((share) => (
        <span
          key={share}
          style={heatStyle(share)}
          className={cx(
            'rounded px-1.5 py-px text-[10.5px] font-semibold',
            onDark(share) ? 'text-white' : 'text-ink',
          )}
        >
          {wholeShareNumber(share)}
        </span>
      ))}
    </span>
  )
}

function ColumnHeader({
  column,
  definitions,
}: {
  column: MatrixColumn<CodebookCriterion>
  definitions: number
}) {
  const coverage = column.criteria.size
  return (
    <th
      scope="col"
      className="px-0.5 pb-1 text-center align-bottom text-xs font-semibold text-label"
    >
      <span className="block whitespace-nowrap">{column.name}</span>
      {!column.isGeneral && coverage < definitions ? (
        <span className="mx-auto block max-w-20 text-[11px] leading-tight font-normal text-muted">
          {definitionsCoverage(coverage, definitions)}
        </span>
      ) : null}
    </th>
  )
}

function PerResponseValue({
  column,
  cell,
}: {
  column: MatrixColumn<CodebookCriterion>
  cell: MeasuredCell<QualityPair>
}) {
  const high = cell.state === 'measured' ? highOf(cell.value.all) : null

  return (
    <span title={cell.state === 'measured' ? levelsTitle(cell.value.all) : undefined}>
      {column.name}{' '}
      {high ? (
        <span className={cx(high.count === 0 && 'text-faint')}>
          <span className="font-semibold">{formatWholeShare(high.share)}</span>{' '}
          {scaleLabel(high.value)}
        </span>
      ) : (
        <span className="text-muted">{CELL_UNRATED_LABEL}</span>
      )}
    </span>
  )
}

export function QualityHeatmap({
  definitions,
  criteria,
  observations,
  codebookVersionNumber,
}: {
  definitions: CodebookDefinition[]
  criteria: CodebookCriterion[]
  observations: RoundObservation[]
  codebookVersionNumber: number
}) {
  if (definitions.length === 0 || criteria.length === 0) {
    return (
      <EmptyState>
        A versão de codebook que esta rodada fixou (Codebook v{codebookVersionNumber})
        não tem definição e critério para cruzar, então não há matriz para montar.
      </EmptyState>
    )
  }

  const totals = qualityByCriterion(definitions, criteria, observations, NONE)
  const heatTotals = totals.filter(({ column }) => !column.isPerResponse)
  const perResponse = totals.filter(({ column }) => column.isPerResponse)
  const rows = qualityMatrix(definitions, criteria, observations, NONE).flatMap((row) =>
    row.definition
      ? [
          {
            definition: row.definition,
            cells: row.cells.filter(({ column }) => !column.isPerResponse),
          },
        ]
      : [],
  )

  return (
    <div className="flex flex-col gap-3">
      {heatTotals.length > 0 ? (
        <>
          <p className="m-0 text-xs text-muted">
            {QUALITY_HEAT_CAPTION}
            <HeatScale />
          </p>

          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-[3px] text-[13px]">
              <thead>
                <tr>
                  <td />
                  {heatTotals.map(({ column }) => (
                    <ColumnHeader
                      key={column.key}
                      column={column}
                      definitions={definitions.length}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th
                    scope="row"
                    className="pr-3 text-left font-bold whitespace-nowrap text-ink"
                  >
                    {QUALITY_ALL_DEFINITIONS}
                  </th>
                  {heatTotals.map(({ column, cell }) => (
                    <HeatCell key={column.key} cell={cell} />
                  ))}
                </tr>
                {rows.map(({ definition, cells }) => (
                  <tr key={definition.id}>
                    <th
                      scope="row"
                      className="pr-3 text-left font-semibold whitespace-nowrap text-label"
                    >
                      {definition.title}
                    </th>
                    {cells.map(({ column, cell }) => (
                      <HeatCell key={column.key} cell={cell} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {perResponse.length > 0 ? (
        <p className="m-0 text-sm text-label tabular-nums">
          {QUALITY_PER_RESPONSE_LEAD}{' '}
          {perResponse.map(({ column, cell }, index) => (
            <span key={column.key}>
              {index > 0 ? <span className="text-faint"> · </span> : null}
              <PerResponseValue column={column} cell={cell} />
            </span>
          ))}
        </p>
      ) : null}

      <HowToRead paragraphs={[matrixVersionNote(codebookVersionNumber), QUALITY_HEAT_LEGEND]} />
    </div>
  )
}
