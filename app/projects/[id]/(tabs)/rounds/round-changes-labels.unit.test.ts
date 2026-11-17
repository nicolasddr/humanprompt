import { describe, it, expect } from 'vitest'
import * as labels from '@/app/projects/[id]/(tabs)/rounds/round-changes-labels'
import {
  CODEBOOK_AND_PROMPT_NOTICE,
  CODEBOOK_AND_PROMPT_WITH_INPUT_NOTICE,
} from '@/app/projects/[id]/(tabs)/rounds/round-changes-labels'

const JUDGEMENT_WORDS = [
  'melhor',
  'pior',
  'melhorou',
  'piorou',
  'boa',
  'ruim',
  'aprovad',
  'suficiente',
  'avançar',
]

const BLOCKING_WORDS = ['não pode abrir', 'bloque', 'trava', 'impede']

function allTexts(): string[] {
  return Object.values(labels).filter((value): value is string => typeof value === 'string')
}

describe('app/projects/[id]/rounds/round-changes-labels — o que mudou na tela', () => {
  it('o aviso de codebook e prompt juntos não atribui a diferença a um nem ao outro', () => {
    expect(CODEBOOK_AND_PROMPT_NOTICE).toContain('não se atribui a um nem ao outro')
    expect(CODEBOOK_AND_PROMPT_NOTICE).toMatch(/ICR/)
    expect(CODEBOOK_AND_PROMPT_NOTICE).toContain('Qualidade')
  })

  it('a variante com a entrada também não atribui a diferença só à forma de montar a entrada', () => {
    expect(CODEBOOK_AND_PROMPT_WITH_INPUT_NOTICE).toContain('forma de montar a entrada')
    expect(CODEBOOK_AND_PROMPT_WITH_INPUT_NOTICE).toContain('não se atribui')
    expect(CODEBOOK_AND_PROMPT_WITH_INPUT_NOTICE).toContain('nem só à forma de montar a entrada')
  })

  it('a varredura alcança todas as frases exportadas', () => {
    expect(allTexts()).toEqual(
      expect.arrayContaining([CODEBOOK_AND_PROMPT_NOTICE, CODEBOOK_AND_PROMPT_WITH_INPUT_NOTICE]),
    )
  })

  it('nenhum texto julga a mudança', () => {
    for (const text of allTexts()) {
      for (const word of JUDGEMENT_WORDS) {
        expect(text.toLowerCase()).not.toContain(word)
      }
    }
  })

  it('nenhum texto proíbe ou trava nada', () => {
    for (const text of allTexts()) {
      for (const word of BLOCKING_WORDS) {
        expect(text.toLowerCase()).not.toContain(word)
      }
    }
  })

  it('nenhum texto menciona a Fase 4', () => {
    for (const text of allTexts()) {
      expect(text).not.toMatch(/Fase 4/i)
    }
  })
})
