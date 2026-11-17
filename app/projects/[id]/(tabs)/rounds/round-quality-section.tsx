import { Section } from '@/app/components/ui/section'
import type { CodebookCriterion, CodebookDefinition } from '../../pipeline/codebook'
import type { RoundObservation } from './agreement'
import { withoutExcluded } from './agreement-pair'
import { hasQuality, qualityOf } from './quality'
import { QualityHeatmap } from './quality-heatmap'
import { QUALITY_UNRATED, QUALITY_UNRATED_WITHOUT_OUTLIERS } from './quality-labels'
import { QualityLine } from './quality-line'
import type { QualityView } from './quality-view'
import { QualityViewSelector } from './quality-view-selector'
import { QUALITY_SECTION_ID } from './reading-guidance'
import type { AgreementRound } from './round-agreement-section'

export function qualitySectionTitle(round: AgreementRound): string {
  return `Qualidade - Rodada ${round.roundNumber}`
}

export function roundQualitySection({
  round,
  observations,
  excluded,
  definitions,
  criteria,
  view,
  href,
}: {
  round: AgreementRound
  observations: RoundObservation[]
  excluded: ReadonlySet<string>
  definitions: CodebookDefinition[]
  criteria: CodebookCriterion[]
  view: QualityView
  href: string
}) {
  if (!hasQuality(round.phase)) return null

  const hasOutliers = excluded.size > 0
  const withoutOutliers = hasOutliers && view === 'without-outliers'
  const shown = withoutOutliers ? withoutExcluded(observations, excluded) : observations

  return (
    <Section id={QUALITY_SECTION_ID} className="scroll-mt-6" title={qualitySectionTitle(round)}>
      <div className="flex flex-col gap-5">
        {hasOutliers ? (
          <QualityViewSelector
            view={withoutOutliers ? 'without-outliers' : 'all'}
            excluded={excluded.size}
            href={href}
          />
        ) : null}
        <QualityLine
          quality={qualityOf(shown)}
          unrated={withoutOutliers ? QUALITY_UNRATED_WITHOUT_OUTLIERS : QUALITY_UNRATED}
        />
        <QualityHeatmap
          definitions={definitions}
          criteria={criteria}
          observations={shown}
          codebookVersionNumber={round.codebookVersionNumber}
        />
      </div>
    </Section>
  )
}
