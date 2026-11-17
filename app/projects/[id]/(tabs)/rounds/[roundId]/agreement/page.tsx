import { notFound } from 'next/navigation'
import { requireUserId } from '@/lib/supabase/server'
import { transaction } from '@/lib/db'
import { loadCodebookVersion } from '../../../../pipeline/codebook'
import { PHASE_4 } from '../../../../pipeline/preconditions'
import { listEvaluatorEffort, loadRoundObservations } from '../../agreement'
import { excludedMemberIds, loadRoundOutliers } from '../../outliers'
import { loadEvaluatorParticipation } from '../../participation'
import { participationBefore } from '../../participation-labels'
import { requireReviewAccess } from '../../review-access'
import { loadRoundHeader, roundHeaderTitle } from '../../round-header'
import { roundAgreementSection } from '../../round-agreement-section'
import { roundQualitySection } from '../../round-quality-section'
import { hasQuality } from '../../quality'
import { ReadingShortcuts, readingShortcuts, withCriterion } from '../../reading-shortcuts'
import { parseQualityView, withQualityView } from '../../quality-view'
import { BackLink } from '@/app/components/ui/shell'

export default async function RoundAgreementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; roundId: string }>
  searchParams: Promise<{ criterio?: string; qualidade?: string | string[] }>
}) {
  const { id, roundId } = await params
  const query = await searchParams
  const userId = await requireUserId()

  const view = await transaction(async (tx) => {
    const access = await requireReviewAccess(id, userId, tx)
    if (!access.isAdmin) notFound()

    const projectId = access.project.id
    const header = await loadRoundHeader(projectId, roundId, tx)
    if (!header) notFound()

    const { round } = header
    const codebook = await loadCodebookVersion(projectId, round.codebookVersionId, tx)

    return {
      header,
      observations: await loadRoundObservations(round.id, tx),
      outliers: await loadRoundOutliers(round.id, tx),
      effort: await listEvaluatorEffort(round.id, projectId, tx),
      participation:
        round.phase === PHASE_4 ? await loadEvaluatorParticipation(projectId, tx) : null,
      definitions: codebook?.definitions ?? [],
      criteria: codebook?.criteria ?? [],
    }
  })

  const { header, observations, outliers, effort, participation } = view
  const { round } = header
  const roundHref = `/projects/${id}/rounds/${roundId}`
  const agreementHref = `${roundHref}/agreement`
  const qualityView = parseQualityView(query.qualidade)

  return (
    <>
      <div className="mt-6">
        <BackLink href={`/projects/${id}/rounds`}>Voltar às rodadas</BackLink>
      </div>

      {roundHeaderTitle(header)}

      <ReadingShortcuts
        links={readingShortcuts({
          agreement: true,
          quality: hasQuality(round.phase),
          review: roundHref,
        })}
      />

      {roundAgreementSection({
        round,
        observations,
        outliers,
        effort,
        definitions: view.definitions,
        criteria: view.criteria,
        ...(query.criterio ? { criterion: query.criterio } : {}),
        href: withQualityView(agreementHref, qualityView),
        ...(participation
          ? { participation: participationBefore(participation, round.roundNumber) }
          : {}),
      })}

      {roundQualitySection({
        round,
        observations,
        excluded: excludedMemberIds(outliers),
        definitions: view.definitions,
        criteria: view.criteria,
        view: qualityView,
        href: withCriterion(agreementHref, query.criterio ?? null),
      })}
    </>
  )
}
