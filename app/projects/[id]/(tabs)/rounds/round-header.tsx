import type { DbExecutor } from '@/lib/db'
import { PageTitle } from '@/app/components/ui/shell'
import { InfoTooltip } from '@/app/components/ui/tooltip'
import { formatDate } from '@/app/notifications/labels'
import { listRounds, type RoundSummary } from './rounds'
import { previousRoundOf, roundChanges, type RoundChanges } from './round-changes'
import { RoundChangeNotice } from './round-changes-note'

export type RoundHeader = { round: RoundSummary; changes: RoundChanges | null }

export async function loadRoundHeader(
  projectId: string,
  roundId: string,
  tx: DbExecutor,
): Promise<RoundHeader | null> {
  const rounds = await listRounds(projectId, tx)
  const round = rounds.find((candidate) => candidate.id === roundId)
  if (!round) return null
  return { round, changes: roundChanges(round, previousRoundOf(rounds, round)) }
}

export function roundHeaderDetails(round: RoundSummary): string {
  const versions = `Fase ${round.phase} · Codebook v${round.codebookVersionNumber} · Prompt v${round.promptVersionNumber}`
  return round.closedAt ? `${versions}\nFechada em ${formatDate(round.closedAt)}` : versions
}

export function roundHeaderTitle(header: RoundHeader) {
  const { round, changes } = header

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <PageTitle>Rodada {round.roundNumber}</PageTitle>
        <InfoTooltip text={roundHeaderDetails(round)} />
      </div>
      {changes ? <RoundChangeNotice changes={changes} /> : null}
    </div>
  )
}
