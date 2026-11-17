import Link from '@/app/components/app-link'
import { EmptyState } from '@/app/components/ui/empty-state'
import { phaseRuns } from './agreement-series'
import { isOpen, type RoundSummary } from './rounds'

const linkClass = 'text-[13px] font-medium text-brand hover:text-brand-hover'

function versionsText(round: RoundSummary): string {
  return `Codebook v${round.codebookVersionNumber} · Prompt v${round.promptVersionNumber}`
}

export function RoundList({
  projectId,
  rounds,
}: {
  projectId: string
  rounds: RoundSummary[]
}) {
  if (rounds.length === 0) {
    return (
      <EmptyState>
        Nenhuma rodada ainda. A primeira rodada congela a versão vigente do codebook e a
        do prompt, e é a partir dela que o projeto passa a produzir dado de pesquisa.
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {[...phaseRuns(rounds)].reverse().map((run) => (
        <section key={run.points[0].id} className="flex flex-col gap-2">
          <h3 className="m-0 text-[13px] font-semibold text-label">Fase {run.phase}</h3>
          <ul className="m-0 list-none rounded-xl border border-line bg-surface p-0">
            {[...run.points].reverse().map((round) => (
              <li
                key={round.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-line px-4 py-[11px] first:border-t-0"
              >
                <span className="min-w-[84px] text-sm font-semibold text-ink">
                  Rodada {round.roundNumber}
                </span>
                <span className="text-[13px] text-muted">{versionsText(round)}</span>
                {isOpen(round) ? (
                  <span className="ml-auto text-[13px] text-muted">Aberta</span>
                ) : (
                  <span className="ml-auto flex flex-none gap-3.5">
                    <Link
                      href={`/projects/${projectId}/rounds/${round.id}/agreement`}
                      className={linkClass}
                    >
                      Analisar
                    </Link>
                    <Link href={`/projects/${projectId}/rounds/${round.id}`} className={linkClass}>
                      Revisar discordâncias
                    </Link>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
