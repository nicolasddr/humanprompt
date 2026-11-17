import { describe, it, expect } from 'vitest'
import * as labels from '@/app/projects/[id]/(tabs)/rounds/quality-labels'
import {
  QUALITY_ALL_DEFINITIONS,
  QUALITY_HEAT_CAPTION,
  QUALITY_HEAT_LEGEND,
  QUALITY_HEAT_OUTLIERS_NOTE,
  QUALITY_HINT,
  QUALITY_SERIES_HINT,
  QUALITY_SERIES_NOTE,
  definitionsCoverage,
  formatShare,
  formatWholeShare,
  levelShareText,
  levelText,
  levelsText,
  qualityTotal,
  wholeLevelsText,
} from '@/app/projects/[id]/(tabs)/rounds/quality-labels'
import {
  AGREEMENT_ALL_LABEL,
  AGREEMENT_WITHOUT_OUTLIERS_LABEL,
  CELL_NOT_APPLICABLE_TITLE,
  CELL_UNRATED_LABEL,
} from '@/app/projects/[id]/(tabs)/rounds/agreement-labels'

const JUDGEMENT_WORDS = [
  'boa',
  'bom',
  'ruim',
  'aprovad',
  'reprovad',
  'meta',
  'atinge',
  'suficiente',
  'adequad',
]

function exportedStrings(): string[] {
  return Object.values(labels).flatMap((value) => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string')
    return []
  })
}

describe('app/projects/[id]/rounds/quality-labels — a Qualidade na tela', () => {
  it('a porcentagem sai em pt-BR com no máximo uma casa decimal', () => {
    expect(formatShare(0.625)).toBe('62,5%')
    expect(formatShare(1)).toBe('100%')
    expect(formatShare(0)).toBe('0%')
    expect(formatShare(1 / 3)).toBe('33,3%')
  })

  it('na seção da rodada, a porcentagem sai inteira', () => {
    expect(formatWholeShare(0.625)).toBe('63%')
    expect(formatWholeShare(0.77875)).toBe('78%')
    expect(formatWholeShare(0)).toBe('0%')
    expect(formatWholeShare(1)).toBe('100%')
  })

  it('o total conta notas, no singular e no plural', () => {
    expect(qualityTotal(1)).toBe('1 nota')
    expect(qualityTotal(8)).toBe('8 notas')
  })

  it('nenhuma palavra exportada julga a distribuição', () => {
    const strings = exportedStrings()

    expect(strings.length).toBeGreaterThan(0)
    for (const text of strings) {
      for (const word of JUDGEMENT_WORDS) {
        expect(text.toLowerCase()).not.toContain(word)
      }
    }
  })

  it('a varredura de palavras de juízo alcança as frases da matriz e da série', () => {
    expect(exportedStrings()).toEqual(
      expect.arrayContaining([
        QUALITY_HEAT_CAPTION,
        QUALITY_HEAT_LEGEND,
        QUALITY_HEAT_OUTLIERS_NOTE,
        QUALITY_SERIES_HINT,
        QUALITY_SERIES_NOTE,
      ]),
    )
  })

  it('uma linha da distribuição traz o ponto da escala, a porcentagem e a contagem', () => {
    expect(levelText({ value: 'high', count: 5, share: 0.625 })).toBe('Alto 62,5% (5)')
    expect(levelText({ value: 'low', count: 0, share: 0 })).toBe('Baixo 0% (0)')
  })

  it('a distribuição inteira junta as três linhas, e o número da seção da rodada sai inteiro e com o rótulo depois', () => {
    const levels = [
      { value: 'high' as const, count: 5, share: 0.625 },
      { value: 'medium' as const, count: 2, share: 0.25 },
      { value: 'low' as const, count: 1, share: 0.125 },
    ]

    expect(levelsText(levels)).toBe('Alto 62,5% (5) · Médio 25% (2) · Baixo 12,5% (1)')
    expect(wholeLevelsText(levels)).toBe('Alto 63% (5) · Médio 25% (2) · Baixo 13% (1)')
    expect(levelShareText(levels[0])).toBe('63% Alto')
  })

  it('o critério que vale só para algumas definições diz em quantas', () => {
    expect(definitionsCoverage(3, 8)).toBe('em 3 de 8 definições')
    expect(definitionsCoverage(1, 1)).toBe('em 1 de 1 definição')
  })

  it('a legenda do mapa diz o que é a célula, onde está a distribuição, e que sem nota não é 0%', () => {
    expect(QUALITY_HEAT_CAPTION).toBe(
      '% de notas Alto em cada definição × critério. Quanto mais escuro, mais Alto.',
    )
    expect(QUALITY_HEAT_LEGEND).toContain('ao passar o mouse na célula')
    expect(QUALITY_HEAT_LEGEND).toContain(`“${QUALITY_ALL_DEFINITIONS}”`)
    expect(QUALITY_HEAT_LEGEND).toContain('e não da média das células')
    expect(QUALITY_HEAT_LEGEND).toContain(`“${CELL_UNRATED_LABEL}”`)
    expect(QUALITY_HEAT_LEGEND).toContain(CELL_NOT_APPLICABLE_TITLE)
    expect(QUALITY_HEAT_LEGEND).toContain('não vale 0%')
  })

  it('a legenda do mapa diz que o par vem com todos primeiro', () => {
    const all = QUALITY_HEAT_LEGEND.indexOf(AGREEMENT_ALL_LABEL)
    const without = QUALITY_HEAT_LEGEND.indexOf(AGREEMENT_WITHOUT_OUTLIERS_LABEL)

    expect(all).toBeGreaterThanOrEqual(0)
    expect(without).toBeGreaterThan(all)
  })

  it('as frases da série não falam de ICR, de faixa nem comparam fases', () => {
    for (const text of [
      QUALITY_SERIES_HINT,
      QUALITY_SERIES_NOTE,
    ]) {
      expect(text).not.toMatch(/ICR|Krippendorff|concordância|faixa|confiáve|compar/i)
    }
  })

  it('a explicação diz o que o número é, sem orientar a leitura pelo ICR nem por faixa', () => {
    expect(QUALITY_HINT).toContain('Alto, Médio e Baixo')
    expect(QUALITY_HINT).not.toMatch(/ICR|Krippendorff|concordância|faixa|confiáve/i)
  })
})
