import { describe, it, expect } from 'vitest'
import {
  COMPARISON_AGREEMENT_GROUP,
  COMPARISON_EMPTY,
  COMPARISON_QUALITY_GROUP,
  COMPARISON_TOTAL_ROW,
  REFERENCE_COMPARISON_HELP,
  comparedVersions,
  comparisonHeading,
  comparisonTable,
  hasComparisonOutliers,
  type ComparisonTable,
} from '@/app/projects/[id]/(tabs)/rounds/reference-comparison-labels'
import type { ComparedRound } from '@/app/projects/[id]/(tabs)/rounds/reference-comparison'
import type { RoundAgreements } from '@/app/projects/[id]/(tabs)/rounds/agreement-matrix'
import type { Quality, QualityPair } from '@/app/projects/[id]/(tabs)/rounds/quality'
import { scaleLabel } from '@/app/projects/[id]/(tabs)/evaluate/scale'
import { ROUND_CLOSED } from '@/app/projects/[id]/(tabs)/rounds/round-status'
import { PHASE_3, PHASE_4 } from '@/app/projects/[id]/pipeline/preconditions'
import type { Agreement } from '@/lib/agreement'

function calculable(alpha: number): Agreement {
  return { calculable: true, alpha, units: 10, raters: 3 }
}

const NOT_CALCULABLE: Agreement = {
  calculable: false,
  reason: 'few_evaluators',
  units: 4,
  raters: 1,
}

type Kind = 'general' | 'per_response'

function criterion(
  name: string,
  all: Agreement | null,
  withoutOutliers: Agreement | null = null,
  kind: Kind = 'general',
): RoundAgreements[number] {
  const cell = (agreement: Agreement | null) =>
    agreement
      ? ({ state: 'calculated', agreement, profile: null } as const)
      : ({ state: 'unrated' } as const)
  return {
    column: {
      key: `${kind}-${name}`,
      name,
      isGeneral: kind === 'general',
      isPerResponse: kind === 'per_response',
      criteria: new Map(),
    },
    cell: cell(all),
    withoutOutliers: withoutOutliers ? cell(withoutOutliers) : null,
  }
}

function rated(high: number, medium: number, low: number): Quality {
  const total = high + medium + low
  return {
    rated: true,
    total,
    levels: [
      { value: 'high', count: high, share: high / total },
      { value: 'medium', count: medium, share: medium / total },
      { value: 'low', count: low, share: low / total },
    ],
  }
}

function side(
  roundNumber: number,
  phase: number,
  {
    all = calculable(0.741),
    withoutOutliers = null,
    agreement = [criterion('Clareza', all, withoutOutliers)],
    quality = { all: rated(25, 10, 5), withoutOutliers: null, excluded: 0 },
    status = ROUND_CLOSED,
  }: {
    all?: Agreement
    withoutOutliers?: Agreement | null
    agreement?: RoundAgreements
    quality?: QualityPair | null
    status?: string
  } = {},
): ComparedRound {
  return {
    id: `r${roundNumber}`,
    roundNumber,
    phase,
    status,
    closedAt: status === ROUND_CLOSED ? '2026-09-28T12:00:00.000Z' : null,
    codebookVersionNumber: 4,
    promptVersionNumber: 3,
    agreement,
    quality,
  }
}

function rows(table: ComparisonTable): [string, string, string][] {
  return table.groups.flatMap((group) =>
    group.rows.map(
      (row): [string, string, string] => [
        row.label,
        row.reference ?? COMPARISON_EMPTY,
        row.round ?? COMPARISON_EMPTY,
      ],
    ),
  )
}

function worse(table: ComparisonTable): string[] {
  return table.groups.flatMap((group) =>
    group.rows.filter((row) => row.worse).map((row) => row.label),
  )
}

describe('app/projects/[id]/rounds/reference-comparison-labels — comparisonTable', () => {
  it('dois grupos, ICR com o nome do critério e Qualidade com % inteira, sem contagem', () => {
    const reference = side(4, PHASE_3)
    const round = side(6, PHASE_4, {
      all: calculable(0.688),
      quality: { all: rated(16, 11, 5), withoutOutliers: null, excluded: 0 },
    })

    const table = comparisonTable(reference, round)
    expect(table.groups.map((group) => group.label)).toEqual([
      COMPARISON_AGREEMENT_GROUP,
      COMPARISON_QUALITY_GROUP,
    ])
    expect(rows(table)).toEqual([
      ['Clareza', '0,741', '0,688'],
      [scaleLabel('high'), '63%', '50%'],
      [scaleLabel('medium'), '25%', '34%'],
      [scaleLabel('low'), '13%', '16%'],
      [COMPARISON_TOTAL_ROW, '40', '32'],
    ])
    expect(table.fewNotes).toBe(false)
  })

  it('as linhas de Alto, Médio e Baixo levam o nível, e só Notas fica em segundo plano', () => {
    const table = comparisonTable(side(4, PHASE_3), side(6, PHASE_4))
    const all = table.groups.flatMap((group) => group.rows)

    expect(all.map((row) => row.level ?? null)).toEqual([null, 'high', 'medium', 'low', null])
    expect(all.map((row) => row.secondary)).toEqual([false, false, false, false, true])
  })

  it('sem outliers troca todos os números, e o lado sem outlier repete os de todas as notas', () => {
    const reference = side(4, PHASE_3, {
      withoutOutliers: calculable(0.802),
      quality: { all: rated(25, 10, 5), withoutOutliers: rated(20, 8, 2), excluded: 1 },
    })
    const round = side(6, PHASE_4, { all: calculable(0.688) })

    expect(hasComparisonOutliers([reference, round])).toBe(true)
    expect(rows(comparisonTable(reference, round, 'without-outliers'))).toEqual([
      ['Clareza', '0,802', '0,688'],
      [scaleLabel('high'), '67%', '63%'],
      [scaleLabel('medium'), '27%', '25%'],
      [scaleLabel('low'), '7%', '13%'],
      [COMPARISON_TOTAL_ROW, '30', '40'],
    ])
    expect(rows(comparisonTable(reference, round, 'all'))[0]).toEqual(['Clareza', '0,741', '0,688'])
  })

  it('sem outlier em nenhuma das rodadas, não há o que alternar', () => {
    expect(hasComparisonOutliers([side(4, PHASE_3), side(6, PHASE_4)])).toBe(false)
  })

  it('ICR não calculável ou sem nota vira traço e liga a legenda; Qualidade sem nota vira traço', () => {
    const reference = side(4, PHASE_3, {
      all: NOT_CALCULABLE,
      quality: { all: { rated: false, total: 0 }, withoutOutliers: null, excluded: 0 },
    })
    const round = side(6, PHASE_4)

    const table = comparisonTable(reference, round)
    expect(rows(table)).toEqual([
      ['Clareza', COMPARISON_EMPTY, '0,741'],
      [scaleLabel('high'), COMPARISON_EMPTY, '63%'],
      [scaleLabel('medium'), COMPARISON_EMPTY, '25%'],
      [scaleLabel('low'), COMPARISON_EMPTY, '13%'],
      [COMPARISON_TOTAL_ROW, COMPARISON_EMPTY, '40'],
    ])
    expect(table.fewNotes).toBe(true)
  })

  it('um lado sem Qualidade mostra o traço nas linhas de Qualidade', () => {
    const table = comparisonTable(side(4, PHASE_3, { quality: null }), side(6, PHASE_4))
    expect(rows(table).slice(1).map((row) => row[1])).toEqual([
      COMPARISON_EMPTY,
      COMPARISON_EMPTY,
      COMPARISON_EMPTY,
      COMPARISON_EMPTY,
    ])
    expect(table.fewNotes).toBe(false)
  })
})

describe('app/projects/[id]/rounds/reference-comparison-labels — ICR por critério', () => {
  it('uma linha por critério, ligada por nome e tipo, com o traço do lado que não tem o critério', () => {
    const reference = side(4, PHASE_3, {
      agreement: [
        criterion('Relevance', calculable(-0.031)),
        criterion('Diversity', calculable(0.548), null, 'per_response'),
      ],
    })
    const round = side(6, PHASE_4, {
      agreement: [
        criterion('Relevance', calculable(0.702)),
        criterion('Diversity', calculable(0.611)),
        criterion('Fluência', null, null, 'per_response'),
      ],
    })

    const table = comparisonTable(reference, round)
    expect(rows(table).slice(0, 4)).toEqual([
      ['Relevance', '-0,031', '0,702'],
      ['Diversity', '0,548', COMPARISON_EMPTY],
      ['Diversity', COMPARISON_EMPTY, '0,611'],
      ['Fluência', COMPARISON_EMPTY, COMPARISON_EMPTY],
    ])
    expect(table.fewNotes).toBe(true)
  })

  it('critério ausente num dos lados não liga a legenda de poucas notas', () => {
    const reference = side(4, PHASE_3, { agreement: [criterion('Relevance', calculable(0.5))] })
    const round = side(6, PHASE_4, {
      agreement: [criterion('Relevance', calculable(0.5)), criterion('Tone', calculable(0.7))],
    })
    expect(comparisonTable(reference, round).fewNotes).toBe(false)
  })

  it('sem critério em nenhum lado, o grupo do ICR some', () => {
    const table = comparisonTable(
      side(4, PHASE_3, { agreement: [] }),
      side(6, PHASE_4, { agreement: [] }),
    )
    expect(table.groups.map((group) => group.label)).toEqual([COMPARISON_QUALITY_GROUP])
  })
})

describe('app/projects/[id]/rounds/reference-comparison-labels — piora', () => {
  function pair(reference: number, round: number) {
    return comparisonTable(
      side(4, PHASE_3, { agreement: [criterion('Clareza', calculable(reference))] }),
      side(6, PHASE_4, { agreement: [criterion('Clareza', calculable(round))] }),
    )
  }

  it('o α piora quando cai 0,05 ou mais, pelos números da tela', () => {
    expect(worse(pair(0.584, 0.534))).toEqual(['Clareza'])
    expect(worse(pair(0.584, 0.535))).toEqual([])
    expect(worse(pair(0.5844, 0.5336))).toEqual(['Clareza'])
    expect(worse(pair(0.584, 0.7))).toEqual([])
  })

  it('sem α de um dos lados, não há piora', () => {
    const table = comparisonTable(
      side(4, PHASE_3, { agreement: [criterion('Clareza', calculable(0.8))] }),
      side(6, PHASE_4, { agreement: [criterion('Clareza', NOT_CALCULABLE)] }),
    )
    expect(worse(table)).toEqual([])
  })

  function quality(reference: Quality, round: Quality) {
    return comparisonTable(
      side(4, PHASE_3, { quality: { all: reference, withoutOutliers: null, excluded: 0 } }),
      side(6, PHASE_4, { quality: { all: round, withoutOutliers: null, excluded: 0 } }),
    )
  }

  it('Alto piora quando cai 10 pontos ou mais, e Baixo quando sobe 10 ou mais', () => {
    expect(worse(quality(rated(74, 19, 7), rated(64, 19, 17)))).toEqual([
      scaleLabel('high'),
      scaleLabel('low'),
    ])
    expect(worse(quality(rated(74, 19, 7), rated(65, 19, 16)))).toEqual([])
  })

  it('Médio e Notas nunca pioram', () => {
    expect(worse(quality(rated(20, 60, 20), rated(8, 4, 4)))).toEqual([])
  })

  it('a regra usa as % inteiras da tela', () => {
    expect(worse(quality(rated(745, 255, 0), rated(645, 355, 0)))).toEqual([scaleLabel('high')])
    expect(worse(quality(rated(744, 256, 0), rated(646, 354, 0)))).toEqual([])
  })
})

describe('app/projects/[id]/rounds/reference-comparison-labels — cabeçalho', () => {
  it('o cabeçalho vai da referência para a rodada atual', () => {
    expect(comparisonHeading(4, 6)).toBe('Rodada 4 → Rodada 6')
  })

  it('com as mesmas versões nas duas rodadas, nada aparece', () => {
    expect(comparedVersions(side(4, PHASE_3), side(6, PHASE_4))).toBeNull()
  })

  it('com versões diferentes, cada rodada aparece com as suas', () => {
    const round = { ...side(6, PHASE_4), codebookVersionNumber: 5 }
    expect(comparedVersions(side(4, PHASE_3), round)).toBe(
      'Rodada 4: Codebook v4 · Prompt v3 · Rodada 6: Codebook v5 · Prompt v3',
    )
  })
})

describe('app/projects/[id]/rounds/reference-comparison-labels — a ajuda da comparação', () => {
  it('o ⓘ define a rodada de referência', () => {
    expect(REFERENCE_COMPARISON_HELP.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(25)
    expect(REFERENCE_COMPARISON_HELP).toContain(
      'a que validou as versões de codebook e de prompt que a Fase 4 testa',
    )
  })
})
