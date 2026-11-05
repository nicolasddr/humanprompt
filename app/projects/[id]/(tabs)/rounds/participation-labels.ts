import { participationLabel, type RoundMark, type RoundTag } from '../../round-usage'

export const PARTICIPATED_BEFORE = 'Já avaliou antes'

export function participationBefore(
  participation: ReadonlyMap<string, readonly RoundTag[]>,
  roundNumber: number,
): Record<string, RoundMark> {
  const labels: Record<string, RoundMark> = {}

  for (const [memberId, tags] of participation) {
    const full = participationLabel(tags.filter((tag) => tag.roundNumber < roundNumber))
    if (full) labels[memberId] = { short: PARTICIPATED_BEFORE, full }
  }

  return labels
}
