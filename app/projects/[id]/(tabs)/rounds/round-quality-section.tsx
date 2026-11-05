import { Section } from '@/app/components/ui/section'
import type { CodebookCriterion, CodebookDefinition } from '../../pipeline/codebook'
import type { RoundObservation } from './agreement'
import { byDefinitionSummary } from './agreement-labels'
import { matrixColumns } from './agreement-matrix'
import { ByDefinition } from './by-definition'
import { CriterionQualityTable } from './criterion-quality-table'
import { hasQuality, qualityPair } from './quality'
import { QUALITY_HINT, QUALITY_POINTS } from './quality-labels'
import { QualityMatrixNotes, QualityMatrixTable } from './quality-matrix-table'
import { QualityPanel } from './quality-panel'
import { QUALITY_SECTION_ID } from './reading-guidance'
import type { AgreementRound } from './round-agreement-section'

export function qualitySectionTitle(round: AgreementRound): string {
  return round.closedAt
    ? `Qualidade na rodada ${round.roundNumber}, fechada`
    : `Qualidade na rodada ${round.roundNumber}`
}

export function roundQualitySection({
  round,
  observations,
  excluded,
  definitions,
  criteria,
}: {
  round: AgreementRound
  observations: RoundObservation[]
  excluded: ReadonlySet<string>
  definitions: CodebookDefinition[]
  criteria: CodebookCriterion[]
}) {
  if (!hasQuality(round.phase)) return null

  const matrix = (
    <QualityMatrixTable
      definitions={definitions}
      criteria={criteria}
      observations={observations}
      excluded={excluded}
      codebookVersionNumber={round.codebookVersionNumber}
    />
  )

  return (
    <Section
      id={QUALITY_SECTION_ID}
      className="scroll-mt-6"
      title={qualitySectionTitle(round)}
      hint={QUALITY_HINT}
      more={{ points: QUALITY_POINTS }}
    >
      <div className="flex flex-col gap-4">
        <QualityPanel pair={qualityPair(observations, excluded)} />

        {definitions.length > 0 && criteria.length > 0 ? (
          <>
            <CriterionQualityTable
              definitions={definitions}
              criteria={criteria}
              observations={observations}
              excluded={excluded}
            />

            <ByDefinition
              summary={byDefinitionSummary(
                definitions.length,
                matrixColumns(definitions, criteria).length,
              )}
            >
              {matrix}
            </ByDefinition>

            <QualityMatrixNotes
              criteria={criteria}
              codebookVersionNumber={round.codebookVersionNumber}
            />
          </>
        ) : (
          matrix
        )}
      </div>
    </Section>
  )
}
