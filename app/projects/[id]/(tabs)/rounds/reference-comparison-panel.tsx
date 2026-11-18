import { cx } from '@/app/components/ui/cx'
import { QualitySwatch } from './quality-bar'
import { VIEW_GROUP_CLASS, ViewOption } from './quality-view-selector'
import type { ReferenceComparison } from './reference-comparison'
import { comparisonViewHref, type ComparisonView } from './comparison-view'
import {
  COMPARISON_EMPTY,
  COMPARISON_VIEW_ALL,
  COMPARISON_VIEW_LABEL,
  COMPARISON_VIEW_WITHOUT_OUTLIERS,
  comparedVersions,
  comparisonRoundHeading,
  comparisonTable,
  hasComparisonOutliers,
  noReferenceMessage,
} from './reference-comparison-labels'

const cellClass = 'border-b border-line px-3 py-2'

const valueClass = cx(cellClass, 'w-24 text-right whitespace-nowrap')

function Value({ text, className }: { text: string | null; className: string }) {
  return (
    <td className={cx(valueClass, text === null ? 'text-faint' : className)}>
      {text ?? COMPARISON_EMPTY}
    </td>
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
  const { groups } = comparisonTable(reference, round, shown)
  const versions = comparedVersions(reference, round)

  return (
    <div className="flex flex-col gap-2">
      {versions ? <p className="m-0 text-[13px] text-muted">{versions}</p> : null}
      {selectable ? <ViewSelector view={shown} href={href} /> : null}
      <div className="overflow-x-auto">
        <table className="min-w-80 border-collapse text-[13px] tabular-nums">
          <thead>
            <tr>
              <td className={cellClass} />
              {[reference, round].map((side) => (
                <th
                  key={side.id}
                  scope="col"
                  className={cx(valueClass, 'align-bottom font-semibold text-ink')}
                >
                  {comparisonRoundHeading(side.roundNumber)}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.key}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={3}
                  className={cx(cellClass, 'pt-4 pb-1 text-left text-xs font-semibold text-accent-fg')}
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
                      'text-left font-normal whitespace-nowrap',
                      row.secondary ? 'text-muted' : 'text-ink',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {row.level ? <QualitySwatch value={row.level} /> : null}
                      {row.label}
                    </span>
                  </th>
                  <Value text={row.reference} className="text-muted" />
                  <Value
                    text={row.round}
                    className={row.worse ? 'font-semibold text-amber-700' : 'font-medium text-ink'}
                  />
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}
