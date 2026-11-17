import { Section } from '@/app/components/ui/section'
import type { CodebookCriterion, CodebookDefinition } from '../../pipeline/codebook'
import type { RoundObservation } from './agreement'
import { hasQuality, qualityPair } from './quality'
import { QualityHeatmap } from './quality-heatmap'
import { QualityLine } from './quality-line'
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

  return (
    <Section id={QUALITY_SECTION_ID} className="scroll-mt-6" title={qualitySectionTitle(round)}>
      <div className="flex flex-col gap-5">
        <QualityLine pair={qualityPair(observations, excluded)} />
        <QualityHeatmap
          definitions={definitions}
          criteria={criteria}
          observations={observations}
          excluded={excluded}
          codebookVersionNumber={round.codebookVersionNumber}
        />
      </div>
    </Section>
  )
}
