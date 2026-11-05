import { agreementProfile, type AgreementProfile } from '@/lib/agreement'
import type { RoundObservation } from './agreement'
import type { RoundSummary } from './rounds'

export type ConcordancePoint = {
  roundId: string
  roundNumber: number
  phase: number
  codebookVersionNumber: number
  closedAt: string | null
  profile: AgreementProfile | null
}

export function concordanceSeries(
  rounds: readonly RoundSummary[],
  observations: ReadonlyMap<string, readonly RoundObservation[]>,
): ConcordancePoint[] {
  return rounds.map((round) => ({
    roundId: round.id,
    roundNumber: round.roundNumber,
    phase: round.phase,
    codebookVersionNumber: round.codebookVersionNumber,
    closedAt: round.closedAt,
    profile: agreementProfile(observations.get(round.id) ?? []),
  }))
}
