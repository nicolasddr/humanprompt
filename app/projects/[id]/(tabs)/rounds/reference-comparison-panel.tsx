import { cx } from '@/app/components/ui/cx'
import { QualitySwatch } from './quality-bar'
import { VIEW_GROUP_CLASS, ViewOption } from './quality-view-selector'
import type { ReferenceComparison } from './reference-comparison'
import { comparisonViewHref, type ComparisonView } from './comparison-view'
import {
  COMPARISON_ARROW,
  COMPARISON_EMPTY,
  COMPARISON_EMPTY_LEGEND,
  COMPARISON_SIDES,
  COMPARISON_VIEW_ALL,
  COMPARISON_VIEW_LABEL,
  COMPARISON_VIEW_WITHOUT_OUTLIERS,
  comparedVersions,
  comparisonHeading,
  comparisonTable,
  hasComparisonOutliers,
  noReferenceMessage,
  type ComparisonRow,
} from './reference-comparison-labels'

const cellClass = 'px-3 py-2'

const sideClass = 'inline-block min-w-12 text-right'

function Side({ text, className }: { text: string | null; className: string }) {
  if (text === null) return <span className={cx(sideClass, 'text-faint')}>{COMPARISON_EMPTY}</span>
  return <span className={cx(sideClass, className)}>{text}</span>
}

function Values({ row }: { row: ComparisonRow }) {
  return (
    <span className="inline-flex items-baseline justify-end gap-2 whitespace-nowrap">
      <Side text={row.reference} className="text-muted" />
      <span className="text-faint">{COMPARISON_ARROW}</span>
      <Side
        text={row.round}
        className={row.worse ? 'font-semibold text-amber-700' : 'font-medium text-ink'}
      />
    </span>
  )
}

function ViewSelector({ view, href }: { view: ComparisonView; href: string }) {
  return (
    <div role="group" aria-label={COMPARISON_VIEW_LABEL} className={VIEW_GROUP_CLASS}>
      <ViewOption href={comparisonViewHref(href, 'all')} active={view === 'all'}>
        {COMPARISON_VIEW_ALL}
      </ViewOption>
      <ViewOption
        href={comparisonViewHref(href, 'without-outliers')}
        active={view === 'without-outliers'}
      >
        {COMPARISON_VIEW_WITHOUT_OUTLIERS}
      </ViewOption>
    </div>
  )
}

export function ReferenceComparisonPanel({
  roundNumber,
  comparison,
  view = 'all',
  href,
}: {
  roundNumber: number
  comparison: Exclude<ReferenceComparison, { kind: 'not_phase_4' }>
  view?: ComparisonView
  href?: string
}) {
  if (comparison.kind === 'no_reference') {
    return <p className="m-0 text-[13px] text-muted">{noReferenceMessage(roundNumber)}</p>
  }

  const { reference, round } = comparison
  const selectable = href !== undefined && hasComparisonOutliers([reference, round])
  const shown = selectable ? view : 'all'
  const { groups, fewNotes } = comparisonTable(reference, round, shown)
  const versions = comparedVersions(reference, round)

  return (
    <div className="flex flex-col gap-2">
      {versions ? <p className="m-0 text-[13px] text-muted">{versions}</p> : null}
      {selectable ? <ViewSelector view={shown} href={href} /> : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px] tabular-nums">
          <thead>
            <tr>
              <td className={cx(cellClass, 'border-b border-line')} />
              <th
                scope="col"
                className={cx(cellClass, 'border-b border-line text-right align-bottom font-normal')}
              >
                <span className="flex flex-col items-end gap-0.5">
                  <span className="font-semibold whitespace-nowrap text-ink">
                    {comparisonHeading(reference.roundNumber, round.roundNumber)}
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted">{COMPARISON_SIDES}</span>
                </span>
              </th>
            </tr>
          </thead>
          {groups.map((group, index) => (
            <tbody key={group.key}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={2}
                  className={cx(
                    'px-3 pb-1 text-left text-xs font-semibold text-muted',
                    index === 0 ? 'pt-2' : 'pt-3',
                  )}
                >
                  {group.label}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.key}>
                  <th
                    scope="row"
                    className={cx(
                      cellClass,
                      'border-t border-line-soft text-left align-top font-normal',
                      row.secondary ? 'text-muted' : 'text-ink',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {row.level ? <QualitySwatch value={row.level} /> : null}
                      {row.label}
                    </span>
                  </th>
                  <td className={cx(cellClass, 'border-t border-line-soft text-right align-top')}>
                    <Values row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      {fewNotes ? <p className="m-0 text-xs text-muted">{COMPARISON_EMPTY_LEGEND}</p> : null}
    </div>
  )
}
