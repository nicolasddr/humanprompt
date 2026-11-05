import { describe, it, expect } from 'vitest'
import { concordanceSeries } from '@/app/projects/[id]/(tabs)/rounds/concordance-series'
import type { RoundObservation } from '@/app/projects/[id]/(tabs)/rounds/agreement'
import type { RoundSummary } from '@/app/projects/[id]/(tabs)/rounds/rounds'
import { scaleRank, type ScaleValue } from '@/app/projects/[id]/(tabs)/evaluate/scale'

function round(id: string, roundNumber: number, phase: number): RoundSummary {
  return {
    id,
    roundNumber,
    status: 'closed',
    phase,
    createdAt: '2026-01-01T00:00:00.000Z',
    closedAt: '2026-01-02T00:00:00.000Z',
    authorName: 'Ana Pesquisadora',
    codebookVersionId: 'cv1',
    codebookVersionNumber: 1,
    promptVersionNumber: 1,
  }
}

function score(
  responseId: string,
  criterionId: string,
  raterId: string,
  value: ScaleValue,
): RoundObservation {
  return {
    unitId: `${responseId}:d1:${criterionId}`,
    raterId,
    value: scaleRank(value),
    responseId,
    definitionId: 'd1',
    criterionId,
    projectMemberId: raterId,
  }
}

describe('concordanceSeries — um ponto por rodada com as parcelas de notas iguais, adjacente e extrema', () => {
  it('junta os critérios da rodada num perfil só, sem misturar rodadas', () => {
    const observations = new Map<string, RoundObservation[]>([
      [
        'a',
        [
          score('r1', 'c1', 'A', 'high'),
          score('r1', 'c1', 'B', 'high'),
          score('r1', 'c2', 'A', 'high'),
          score('r1', 'c2', 'B', 'medium'),
          score('r2', 'c1', 'A', 'high'),
          score('r2', 'c1', 'B', 'low'),
          score('r2', 'c2', 'A', 'low'),
          score('r2', 'c2', 'B', 'low'),
        ],
      ],
      ['b', [score('r1', 'c1', 'A', 'medium'), score('r1', 'c1', 'B', 'medium')]],
    ])

    const points = concordanceSeries([round('a', 1, 2), round('b', 2, 3)], observations)

    expect(points.map((point) => [point.roundNumber, point.phase])).toEqual([
      [1, 2],
      [2, 3],
    ])
    expect(points[0].profile).toMatchObject({ equal: 0.5, adjacent: 0.25, extreme: 0.25 })
    expect(points[1].profile).toMatchObject({ equal: 1, adjacent: 0, extreme: 0 })
  })

  it('a rodada sem célula com duas notas fica sem perfil', () => {
    const observations = new Map([['a', [score('r1', 'c1', 'A', 'high')]]])

    const points = concordanceSeries([round('a', 1, 2), round('b', 2, 2)], observations)

    expect(points.map((point) => point.profile)).toEqual([null, null])
  })
})
