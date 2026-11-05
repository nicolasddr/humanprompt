import { cx } from '@/app/components/ui/cx'
import type {
  CodebookCriterion,
  CodebookDefinition,
} from '../../pipeline/codebook'
import { isPerResponse } from '../../pipeline/criteria'
import type { RoundObservation } from './agreement'
import { agreementMatrix } from './agreement-matrix'
import { withoutExcluded } from './agreement-pair'
import { notApplicableNote } from './agreement-labels'
import { AgreementPair, DivergencePair } from './criterion-agreement-table'
import { DIVERGENCE_BAR_HEADER } from './divergence'

const headerClass =
  'border-b border-line px-3 py-2 text-left align-bottom text-[11px] font-semibold ' +
  'tracking-[0.06em] text-muted uppercase'

const cellClass = 'border-b border-line px-3 py-2 align-top whitespace-nowrap'

export function CriterionByDefinitionTable({
  definitions,
  criteria,
  observations,
  columnKey,
  excluded,
}: {
  definitions: CodebookDefinition[]
  criteria: CodebookCriterion[]
  observations: RoundObservation[]
  columnKey: string
  excluded: ReadonlySet<string>
}) {
  const byDefinition = criteria.filter((criterion) => !isPerResponse(criterion))
  const columnOf = (group: readonly RoundObservation[]) =>
    agreementMatrix(definitions, byDefinition, group).flatMap(({ definition, cells }) => {
      const entry = cells.find(({ column }) => column.key === columnKey)
      return definition && entry ? [{ definition, ...entry }] : []
    })
  const filtered =
    excluded.size > 0
      ? new Map(
          columnOf(withoutExcluded(observations, excluded)).map(({ definition, cell }) => [
            definition.id,
            cell,
          ]),
        )
      : null
  const rows = columnOf(observations).map((row) => ({
    ...row,
    withoutOutliers: filtered
      ? (filtered.get(row.definition.id) ?? ({ state: 'unrated' } as const))
      : null,
  }))
  const applicable = rows.filter(({ cell }) => cell.state !== 'not_applicable')
  const notApplicable = rows.length - applicable.length

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th scope="col" className={headerClass}>
                Definição
              </th>
              <th scope="col" className={cx(headerClass, 'text-right')}>
                ICR
              </th>
              <th scope="col" className={cx(headerClass, 'whitespace-nowrap')}>
                {DIVERGENCE_BAR_HEADER}
              </th>
              <td className="w-full border-b border-line" />
            </tr>
          </thead>
          <tbody>
            {applicable.map(({ definition, cell, withoutOutliers }) => (
              <tr key={definition.id}>
                <th
                  scope="row"
                  className="border-b border-line px-3 py-2 text-left align-top font-semibold whitespace-nowrap text-ink"
                >
                  {definition.title}
                </th>
                <td className={cx(cellClass, 'text-right')}>
                  <AgreementPair cell={cell} withoutOutliers={withoutOutliers} />
                </td>
                <td className={cellClass}>
                  <DivergencePair cell={cell} withoutOutliers={withoutOutliers} />
                </td>
                <td className="border-b border-line" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notApplicable > 0 && rows[0] ? (
        <p className="m-0 text-xs text-muted">
          {notApplicableNote(rows[0].column.name, notApplicable)}
        </p>
      ) : null}
    </div>
  )
}
