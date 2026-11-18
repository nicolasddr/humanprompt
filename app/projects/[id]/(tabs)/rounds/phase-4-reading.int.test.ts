import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const auth = vi.hoisted(() => ({ userId: null as string | null }))

vi.mock('@/lib/supabase/server', async () => {
  const { supabaseServerMock } = await import('@/test/helpers')
  return supabaseServerMock(auth)
})
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOTFOUND')
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

import ProjectRoundsPage from '@/app/projects/[id]/(tabs)/rounds/page'
import { RoundList } from '@/app/projects/[id]/(tabs)/rounds/round-list'
import {
  AgreementNotes,
  SampleLine,
} from '@/app/projects/[id]/(tabs)/rounds/agreement-panel'
import { CriterionAgreementTable } from '@/app/projects/[id]/(tabs)/rounds/criterion-agreement-table'
import {
  criterionAgreements,
  weakestCriterion,
} from '@/app/projects/[id]/(tabs)/rounds/agreement-matrix'
import { OpenRoundCard } from '@/app/projects/[id]/(tabs)/rounds/open-round-card'
import { QualityLine } from '@/app/projects/[id]/(tabs)/rounds/quality-line'
import { formatWholeShare } from '@/app/projects/[id]/(tabs)/rounds/quality-labels'
import type { Quality } from '@/app/projects/[id]/(tabs)/rounds/quality'
import { scaleLabel } from '@/app/projects/[id]/(tabs)/evaluate/scale'
import { ReferenceComparisonPanel } from '@/app/projects/[id]/(tabs)/rounds/reference-comparison-panel'
import {
  COMPARISON_AGREEMENT_GROUP,
  COMPARISON_CONCORDANCE_GROUP,
  COMPARISON_EMPTY,
  COMPARISON_QUALITY_GROUP,
  COMPARISON_TOTAL_ROW,
  COMPARISON_VIEW_ALL,
  COMPARISON_VIEW_WITHOUT_OUTLIERS,
  REFERENCE_COMPARISON_HELP,
  REFERENCE_COMPARISON_TITLE,
  comparisonRoundHeading,
  noReferenceMessage,
} from '@/app/projects/[id]/(tabs)/rounds/reference-comparison-labels'
import {
  COMPARISON_VIEW_PARAM,
  COMPARISON_VIEW_WITHOUT_OUTLIERS as COMPARISON_VIEW_WITHOUT_OUTLIERS_VALUE,
} from '@/app/projects/[id]/(tabs)/rounds/comparison-view'
import type { MatrixCell } from '@/app/projects/[id]/(tabs)/rounds/agreement-matrix'
import {
  AGREEMENT_BANDS,
  AGREEMENT_WITHOUT_OUTLIERS_LABEL,
  formatAlpha,
} from '@/app/projects/[id]/(tabs)/rounds/agreement-labels'
import { ReadingGuidanceNote } from '@/app/projects/[id]/(tabs)/rounds/reading-guidance-note'
import {
  CODEBOOK_SHORTCUT,
  GUIDANCE_HEADING,
  PHASE_4_WITHIN_BAND_GUIDANCE,
  WITHIN_BAND_GUIDANCE,
  belowBandGuidance,
  notCalculableGuidance,
  phase4BelowBandGuidance,
  phase4NotCalculableGuidance,
} from '@/app/projects/[id]/(tabs)/rounds/reading-guidance-labels'
import { PARTICIPATED_BEFORE } from '@/app/projects/[id]/(tabs)/rounds/participation-labels'
import { Section } from '@/app/components/ui/section'
import { loadCodebookVersion } from '@/app/projects/[id]/pipeline/codebook'
import { resolveCells } from '@/app/projects/[id]/pipeline/criteria'
import {
  PHASE_2,
  PHASE_3,
  PHASE_4,
} from '@/app/projects/[id]/pipeline/preconditions'
import { ownerDb } from '@/lib/db'
import {
  createUser,
  createProject as seedProject,
  addActiveEvaluator,
  addCodebookVersion,
  addPromptVersion,
  addInputItem,
  addRound,
  addResponse,
  addEvaluation,
  addOutlier,
  type CellFixture,
  cleanup,
} from '@/test/helpers'

function findElement(node: unknown, type: unknown): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type)
      if (found) return found
    }
    return null
  }
  if (!isValidElement(node)) return null
  if (node.type === type) return node
  for (const value of Object.values(node.props as Record<string, unknown>)) {
    const found = findElement(value, type)
    if (found) return found
  }
  return null
}

function findAll(node: unknown, type: unknown): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => findAll(child, type))
  if (!isValidElement(node)) return []
  if (node.type === type) return [node]
  return Object.values(node.props as Record<string, unknown>).flatMap((value) =>
    findAll(value, type),
  )
}

function findSection(node: unknown, type: unknown): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findSection(child, type)
      if (found) return found
    }
    return null
  }
  if (!isValidElement(node)) return null
  const props = node.props as Record<string, unknown>
  if (node.type === Section && findElement(props.children, type)) return node
  for (const value of Object.values(props)) {
    const found = findSection(value, type)
    if (found) return found
  }
  return null
}

function deepText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return ` ${node} `
  if (Array.isArray(node)) return node.map(deepText).join('')
  if (isValidElement(node)) {
    return Object.entries(node.props as Record<string, unknown>)
      .filter(([key]) => key !== 'className' && key !== 'href')
      .map(([, value]) => deepText(value))
      .join('')
  }
  return ''
}

function allTextOf(node: unknown): string {
  return deepText(node).replace(/\s+/g, ' ').trim()
}

function markupTextOf(element: ReactElement): string {
  return renderToStaticMarkup(element)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function classNamesOf(element: ReactElement): string[] {
  return [...renderToStaticMarkup(element).matchAll(/class="([^"]*)"/g)].map(
    (match) => match[1],
  )
}

function blockIndexOf(tree: unknown, type: unknown): number {
  const children = (tree as ReactElement<{ children: unknown[] }>).props.children
  return children
    .filter((child) => child !== null)
    .findIndex((child) => findElement(child, type) !== null)
}

type ListProps = Parameters<typeof RoundList>[0]
type NotesProps = Parameters<typeof AgreementNotes>[0]
type CriterionTableProps = Parameters<typeof CriterionAgreementTable>[0]
type ComparisonProps = Parameters<typeof ReferenceComparisonPanel>[0]
type GuidanceProps = Parameters<typeof ReadingGuidanceNote>[0]
type CodebookShape = Parameters<typeof addCodebookVersion>[3]

function render(id: string, query: Record<string, string> = {}) {
  return ProjectRoundsPage({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(query),
  })
}

function renderWithoutOutliers(id: string) {
  return render(id, { [COMPARISON_VIEW_PARAM]: COMPARISON_VIEW_WITHOUT_OUTLIERS_VALUE })
}

function listOf(tree: unknown): ListProps {
  const element = findElement(tree, RoundList)
  expect(element).toBeTruthy()
  return element!.props as ListProps
}

function cardOf(tree: unknown): Parameters<typeof OpenRoundCard>[0] {
  const element = findElement(tree, OpenRoundCard)
  expect(element).toBeTruthy()
  return element!.props as Parameters<typeof OpenRoundCard>[0]
}

function notesOf(tree: unknown): NotesProps {
  const element = findElement(tree, AgreementNotes)
  expect(element).toBeTruthy()
  return element!.props as NotesProps
}

function weakestOf(tree: unknown) {
  const element = findElement(tree, CriterionAgreementTable)
  expect(element).toBeTruthy()
  const { definitions, criteria, observations, excluded } = element!.props as CriterionTableProps
  const weakest = weakestCriterion(
    criterionAgreements(definitions, criteria, observations, excluded),
  )
  expect(weakest).toBeTruthy()
  return { name: weakest!.column.name, agreement: weakest!.agreement }
}

function comparisonOf(tree: unknown): ComparisonProps {
  const element = findElement(tree, ReferenceComparisonPanel)
  expect(element).toBeTruthy()
  return element!.props as ComparisonProps
}

function guidanceOf(tree: unknown): GuidanceProps | null {
  const element = findElement(tree, ReadingGuidanceNote)
  return element ? (element.props as GuidanceProps) : null
}

function guidanceTextOf(tree: unknown): string {
  const props = guidanceOf(tree)
  expect(props).toBeTruthy()
  return markupTextOf(createElement(ReadingGuidanceNote, props!))
}

function comparisonElementOf(tree: unknown): ReactElement {
  return createElement(ReferenceComparisonPanel, comparisonOf(tree))
}

function cardsOf(list: ListProps): ReactElement[] {
  return findAll(RoundList(list), 'li')
}

function listTextOf(tree: unknown): string {
  return markupTextOf(createElement(RoundList, listOf(tree)))
}

function tableOf(tree: unknown): string[][] {
  const markup = renderToStaticMarkup(comparisonElementOf(tree))
  return [...markup.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((cell) =>
      cell[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    ),
  )
}

function withoutOutliersRows(tree: unknown): string[][] {
  return tableOf(tree).filter((row) => row[0].endsWith(AGREEMENT_WITHOUT_OUTLIERS_LABEL))
}

function levelCells(quality: Quality | null | undefined): string[] {
  if (!quality?.rated) return []
  return quality.levels.map((level) => formatWholeShare(level.share))
}

function alphaText(cell: MatrixCell | null | undefined): string | null {
  return cell?.state === 'calculated' && cell.agreement.calculable
    ? formatAlpha(cell.agreement.alpha)
    : null
}

function equalText(cell: MatrixCell | null | undefined): string | null {
  return cell?.state === 'calculated' && cell.profile !== null
    ? formatWholeShare(cell.profile.equal)
    : null
}

function pairText(before: string | null, after: string | null): string[] {
  return [before ?? COMPARISON_EMPTY, after ?? COMPARISON_EMPTY]
}

type Side = Extract<ComparisonProps['comparison'], { kind: 'compared' }>['round']

function sideValues(side: Side, view: 'all' | 'without-outliers') {
  const quality =
    view === 'without-outliers'
      ? (side.quality?.withoutOutliers ?? side.quality?.all)
      : side.quality?.all
  const cells = ['Clareza', 'Profundidade'].map((name) => {
    const row = side.agreement.find(({ column }) => column.name === name)
    return view === 'without-outliers' ? (row?.withoutOutliers ?? row?.cell) : row?.cell
  })
  return {
    alphas: cells.map(alphaText),
    equals: cells.map(equalText),
    levels: levelCells(quality),
    total: quality?.rated ? String(quality.total) : null,
  }
}

function expectSides(tree: unknown, view: 'all' | 'without-outliers') {
  const { comparison } = comparisonOf(tree)
  if (comparison.kind !== 'compared') throw new Error('deveria comparar')
  const reference = sideValues(comparison.reference, view)
  const round = sideValues(comparison.round, view)
  expect(tableOf(tree).slice(1)).toEqual([
    [COMPARISON_AGREEMENT_GROUP],
    ['Clareza', ...pairText(reference.alphas[0], round.alphas[0])],
    ['Profundidade', ...pairText(reference.alphas[1], round.alphas[1])],
    [COMPARISON_CONCORDANCE_GROUP],
    ['Clareza', ...pairText(reference.equals[0], round.equals[0])],
    ['Profundidade', ...pairText(reference.equals[1], round.equals[1])],
    [COMPARISON_QUALITY_GROUP],
    ...(['high', 'medium', 'low'] as const).map((value, index) => [
      scaleLabel(value),
      ...pairText(reference.levels[index], round.levels[index]),
    ]),
    [COMPARISON_TOTAL_ROW, ...pairText(reference.total, round.total)],
  ])
  return { reference, round }
}

const JUDGMENT_WORDS = [
  'melhor',
  'pior',
  'suficiente',
  'insuficiente',
  'subiu',
  'caiu',
  'replic',
  'generaliz',
  'aprovad',
  'reprovad',
  '↑',
  '↓',
  '▲',
  '▼',
]

const JUDGMENT_TONES = ['success', 'warning', 'danger', 'brand']

const RETURN_AND_VERDICT_WORDS = [
  'voltar',
  'volte',
  'retorn',
  'fase 3',
  'refin',
  'aprova',
  'reprova',
  'replic',
  'generaliz',
  'confirmad',
]

const WEAKEST = 'Clareza'

const REASONS = ['few_evaluators', 'no_shared_units', 'no_variation'] as const

const PHASE_3_GUIDANCE_TEXTS = [
  belowBandGuidance(WEAKEST),
  WITHIN_BAND_GUIDANCE,
  ...REASONS.map((reason) => notCalculableGuidance(reason, WEAKEST)),
]

const PHASE_4_GUIDANCE_TEXTS = [
  phase4BelowBandGuidance(WEAKEST),
  PHASE_4_WITHIN_BAND_GUIDANCE,
  ...REASONS.map((reason) => phase4NotCalculableGuidance(reason, WEAKEST)),
]

function expectNoJudgment(element: ReactElement, scope?: RegExp) {
  const text = markupTextOf(element).toLowerCase()
  for (const word of JUDGMENT_WORDS) expect(text).not.toContain(word)
  expect(text).not.toMatch(/[+−]\s*\d/)

  const markup = scope ? (renderToStaticMarkup(element).match(scope)?.[0] ?? '') : null
  const classes = markup === null
    ? classNamesOf(element)
    : [...markup.matchAll(/class="([^"]*)"/g)].map((match) => match[1])
  expect(classes.length).toBeGreaterThan(0)
  for (const className of classes) {
    for (const tone of JUDGMENT_TONES) expect(className).not.toContain(tone)
  }
}

type EvaluatorName = 'ana' | 'bruno' | 'carla'

type RoundSpec = {
  roundNumber: number
  phase: number
  status: 'open' | 'closed'
  absent?: readonly EvaluatorName[]
}

type Scene = {
  project: string
  rounds: Map<number, string>
  responses: Map<number, string[]>
  ana: string
  anaUser: string
  bruno: string
  carla: string
}

const SHAPE: CodebookShape = {
  versionNumber: 3,
  definitions: [
    {
      title: 'Informacional',
      type: 'category',
      criteria: [{ name: 'Clareza' }, { name: 'Profundidade' }],
    },
  ],
}

const NOTES = {
  ana: ['low', 'medium', 'high'],
  bruno: ['low', 'medium', 'high'],
  carla: ['high', 'medium', 'low'],
} as const

function closedAtOf(roundNumber: number): string {
  return `2026-0${roundNumber}-15T12:00:00.000Z`
}

describe('app/projects/[id]/rounds — a rodada da Fase 4 ao lado da rodada de referência', () => {
  let users: string[]
  let projs: string[]

  async function newUser(name?: string): Promise<string> {
    const id = await createUser(ownerDb, name)
    users.push(id)
    return id
  }

  async function phase4Scene(admin: string, specs: RoundSpec[]): Promise<Scene> {
    const project = await seedProject(ownerDb, admin, 'Projeto de Teste', { phase: PHASE_4 })
    projs.push(project)
    const codebookVersion = await addCodebookVersion(ownerDb, project, admin, SHAPE)
    const promptVersion = await addPromptVersion(ownerDb, project, admin, { versionNumber: 2 })

    const anaUser = await newUser('Ana')
    const ana = await addActiveEvaluator(ownerDb, project, anaUser)
    const bruno = await addActiveEvaluator(ownerDb, project, await newUser('Bruno'))
    const carla = await addActiveEvaluator(ownerDb, project, await newUser('Carla'))

    const codebook = await loadCodebookVersion(project, codebookVersion)
    const cells = resolveCells(codebook!.definitions, codebook!.criteria)
    const filled = (value: CellFixture['value']): CellFixture[] =>
      cells.map((cell) => ({
        definitionId: cell.definition?.id ?? null,
        criterionId: cell.criterion.id,
        value,
      }))

    const rounds = new Map<number, string>()
    const responses = new Map<number, string[]>()
    const members = { ana, bruno, carla }
    for (const spec of specs) {
      const round = await addRound(ownerDb, project, admin, codebookVersion, promptVersion, {
        roundNumber: spec.roundNumber,
        status: spec.status,
        phase: spec.phase,
        closedAt: spec.status === 'closed' ? closedAtOf(spec.roundNumber) : null,
      })
      rounds.set(spec.roundNumber, round)
      responses.set(spec.roundNumber, [])

      for (let index = 0; index < 3; index += 1) {
        const item = await addInputItem(ownerDb, project, admin, {
          name: `Item ${spec.roundNumber}.${index + 1}`,
        })
        const response = await addResponse(ownerDb, round, item, admin)
        responses.get(spec.roundNumber)!.push(response)
        for (const name of ['ana', 'bruno', 'carla'] as const) {
          if (spec.absent?.includes(name)) continue
          await addEvaluation(ownerDb, round, response, members[name], {
            cells: filled(NOTES[name][index]),
          })
        }
      }
    }

    return { project, rounds, responses, ana, anaUser, bruno, carla }
  }

  function basicScene(admin: string, status: 'open' | 'closed' = 'closed') {
    return phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_3, status: 'closed' },
      { roundNumber: 2, phase: PHASE_4, status },
    ])
  }

  beforeEach(() => {
    users = []
    projs = []
    auth.userId = null
  })
  afterEach(async () => {
    await cleanup(projs, users)
  })

  it('o bloco aparece logo abaixo da orientação, com a referência no cabeçalho e sem frase acima', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)

    auth.userId = admin
    const tree = await render(scene.project)

    const guidance = blockIndexOf(tree, ReadingGuidanceNote)
    const agreement = blockIndexOf(tree, SampleLine)
    const quality = blockIndexOf(tree, QualityLine)
    const comparison = blockIndexOf(tree, ReferenceComparisonPanel)
    const list = blockIndexOf(tree, RoundList)
    expect(list).toBeGreaterThanOrEqual(0)
    expect(guidance).toBe(list + 1)
    expect(comparison).toBe(guidance + 1)
    expect(agreement).toBe(comparison + 1)
    expect(quality).toBe(agreement + 1)

    const section = findSection(tree, ReferenceComparisonPanel)
    expect(section).toBeTruthy()
    const props = section!.props as {
      title: ReactNode
      hint?: ReactNode
      help?: string
      more?: { points: readonly string[] }
    }
    expect(props.title).toBe(REFERENCE_COMPARISON_TITLE)
    expect(props.hint).toBeUndefined()
    expect(props.help).toBe(REFERENCE_COMPARISON_HELP)
    expect(props.more).toBeUndefined()

    const text = markupTextOf(comparisonElementOf(tree))
    expect(text).not.toContain('Codebook v')
    expect(text).not.toContain('Fase')
    expect(text).not.toContain('fechada em')
    expect(text).not.toContain(COMPARISON_VIEW_WITHOUT_OUTLIERS)

    const [heading] = tableOf(tree)
    expect(heading).toEqual(['', comparisonRoundHeading(1), comparisonRoundHeading(2)])
  })

  it('com a rodada da Fase 4 aberta, o bloco aparece e o lado dela diz que está aberta', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin, 'open')

    auth.userId = admin
    const tree = await render(scene.project)

    const { comparison } = comparisonOf(tree)
    expect(comparison.kind).toBe('compared')
    if (comparison.kind !== 'compared') return
    expect(comparison.reference.roundNumber).toBe(1)
    expect(comparison.round.closedAt).toBeNull()

    const [heading] = tableOf(tree)
    expect(heading.slice(1)).toEqual([comparisonRoundHeading(1), comparisonRoundHeading(2)])
    expect(markupTextOf(comparisonElementOf(tree))).not.toContain('Aberta')
  })

  it('cada linha leva o valor da referência e o da rodada, em três grupos, sem linha de outlier', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)

    auth.userId = admin
    const tree = await render(scene.project)
    const { reference, round } = expectSides(tree, 'all')

    for (const side of [reference, round]) {
      expect(side.alphas.every((alpha) => alpha !== null)).toBe(true)
      expect(side.equals.every((equal) => equal !== null)).toBe(true)
      expect(side.levels).toHaveLength(3)
    }
    expect(withoutOutliersRows(tree)).toEqual([])
  })

  it('com outlier só na referência, o seletor troca os números e a rodada sem outlier repete os seus', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)
    await addOutlier(ownerDb, scene.rounds.get(1)!, scene.carla, admin)

    auth.userId = admin
    const tree = await render(scene.project)
    const text = markupTextOf(comparisonElementOf(tree))
    expect(text).toContain(COMPARISON_VIEW_ALL)
    expect(text).toContain(COMPARISON_VIEW_WITHOUT_OUTLIERS)
    expect(renderToStaticMarkup(comparisonElementOf(tree))).toContain(
      `${COMPARISON_VIEW_PARAM}=${COMPARISON_VIEW_WITHOUT_OUTLIERS_VALUE}`,
    )
    const all = expectSides(tree, 'all')
    expect(withoutOutliersRows(tree)).toEqual([])

    const without = expectSides(await renderWithoutOutliers(scene.project), 'without-outliers')
    expect(without.reference).not.toEqual(all.reference)
    expect(without.round).toEqual(all.round)
  })

  it('com outlier só na rodada da Fase 4, só o lado dela muda sem outliers', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)
    await addOutlier(ownerDb, scene.rounds.get(2)!, scene.carla, admin)

    auth.userId = admin
    const all = expectSides(await render(scene.project), 'all')
    const without = expectSides(await renderWithoutOutliers(scene.project), 'without-outliers')
    expect(without.reference).toEqual(all.reference)
    expect(without.round).not.toEqual(all.round)
  })

  it('com outlier nas duas rodadas, os dois lados mudam sem outliers', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)
    await addOutlier(ownerDb, scene.rounds.get(1)!, scene.carla, admin)
    await addOutlier(ownerDb, scene.rounds.get(2)!, scene.bruno, admin)

    auth.userId = admin
    const all = expectSides(await render(scene.project), 'all')
    const without = expectSides(await renderWithoutOutliers(scene.project), 'without-outliers')
    expect(without.reference).not.toEqual(all.reference)
    expect(without.round).not.toEqual(all.round)
  })

  it('sem outlier em nenhuma das rodadas, o pedido de sem outliers mostra todas as notas', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)

    auth.userId = admin
    const tree = await renderWithoutOutliers(scene.project)
    expect(markupTextOf(comparisonElementOf(tree))).not.toContain(COMPARISON_VIEW_WITHOUT_OUTLIERS)
    expectSides(tree, 'all')
  })

  it('depois de um retorno e de um novo avanço, o bloco nomeia a referência da passagem, e a lista não traz referência', async () => {
    const admin = await newUser('Admin')
    const scene = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_3, status: 'closed' },
      { roundNumber: 2, phase: PHASE_4, status: 'closed' },
      { roundNumber: 3, phase: PHASE_3, status: 'closed' },
      { roundNumber: 4, phase: PHASE_4, status: 'open' },
    ])

    auth.userId = admin
    const tree = await render(scene.project)

    const { comparison } = comparisonOf(tree)
    expect(comparison.kind === 'compared' && comparison.reference.roundNumber).toBe(3)

    const text = listTextOf(tree)
    expect(text).not.toContain('Referência')
    expect(text).not.toContain('Primeira rodada')
    expect(text).not.toContain('ICR')
  })

  it('numa rodada em foco da Fase 3, o bloco não aparece, e a lista não traz referência', async () => {
    const admin = await newUser('Admin')
    const scene = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_2, status: 'closed' },
      { roundNumber: 2, phase: PHASE_3, status: 'closed' },
      { roundNumber: 3, phase: PHASE_4, status: 'closed' },
      { roundNumber: 4, phase: PHASE_3, status: 'closed' },
    ])

    auth.userId = admin
    const tree = await render(scene.project)

    expect(findElement(tree, ReferenceComparisonPanel)).toBeNull()
    expect(allTextOf(tree)).not.toContain(REFERENCE_COMPARISON_TITLE)

    expect(cardsOf(listOf(tree))).toHaveLength(4)
    expect(listTextOf(tree)).not.toContain('Referência')
  })

  it('numa rodada da Fase 4 sem rodada de referência, o bloco diz que não há com o que comparar', async () => {
    const admin = await newUser('Admin')
    const scene = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_4, status: 'closed' },
    ])

    auth.userId = admin
    const tree = await render(scene.project)

    const props = comparisonOf(tree)
    expect(props.comparison).toEqual({ kind: 'no_reference' })
    expect(markupTextOf(comparisonElementOf(tree))).toBe(noReferenceMessage(1))

    const section = findSection(tree, ReferenceComparisonPanel)
    expect((section!.props as { title: ReactNode }).title).toBe(REFERENCE_COMPARISON_TITLE)

    expect(listTextOf(tree)).not.toContain('Referência')
  })

  it('o bloco da referência não usa palavra, seta de subida ou descida, diferença nem cor de selo na tabela', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)
    await addOutlier(ownerDb, scene.rounds.get(1)!, scene.carla, admin)
    await addOutlier(ownerDb, scene.rounds.get(2)!, scene.carla, admin)

    auth.userId = admin
    const tree = await render(scene.project)

    expectNoJudgment(comparisonElementOf(tree), /<table[\s\S]*<\/table>/)
  })

  it('numa rodada da Fase 4 abaixo da faixa, a orientação é a da Fase 4', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)

    auth.userId = admin
    const tree = await render(scene.project)

    const { name, agreement } = weakestOf(tree)
    expect(name).toBe(WEAKEST)
    expect(agreement.calculable).toBe(true)
    expect(agreement.calculable && agreement.alpha).toBeLessThan(AGREEMENT_BANDS.acceptable)

    expect(guidanceOf(tree)).toEqual({
      guidance: { phase: PHASE_4, kind: 'below_band', criterion: WEAKEST, concentrated: false },
      projectId: scene.project,
    })
    expect(guidanceTextOf(tree)).toBe(
      `${GUIDANCE_HEADING} ${phase4BelowBandGuidance(WEAKEST)}`,
    )
  })

  it('numa rodada da Fase 4 dentro da faixa, a orientação manda olhar a Qualidade ao lado da referência', async () => {
    const admin = await newUser('Admin')
    const scene = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_3, status: 'closed' },
      { roundNumber: 2, phase: PHASE_4, status: 'closed', absent: ['carla'] },
    ])

    auth.userId = admin
    const tree = await render(scene.project)

    expect(weakestOf(tree).agreement).toMatchObject({ calculable: true, alpha: 1 })

    expect(guidanceOf(tree)).toEqual({
      guidance: { phase: PHASE_4, kind: 'within_band' },
      projectId: scene.project,
    })
    expect(guidanceTextOf(tree)).toBe(`${GUIDANCE_HEADING} ${PHASE_4_WITHIN_BAND_GUIDANCE}`)
  })

  it('numa rodada da Fase 4 com um avaliador só, a orientação diz por que não há ICR e que a comparação ainda não é possível', async () => {
    const admin = await newUser('Admin')
    const scene = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_3, status: 'closed' },
      { roundNumber: 2, phase: PHASE_4, status: 'closed', absent: ['bruno', 'carla'] },
    ])

    auth.userId = admin
    const tree = await render(scene.project)

    expect(weakestOf(tree)).toMatchObject({
      name: WEAKEST,
      agreement: { calculable: false, reason: 'few_evaluators' },
    })
    expect(guidanceOf(tree)).toEqual({
      guidance: {
        phase: PHASE_4,
        kind: 'not_calculable',
        criterion: WEAKEST,
        reason: 'few_evaluators',
      },
      projectId: scene.project,
    })
    expect(guidanceTextOf(tree)).toBe(
      `${GUIDANCE_HEADING} ${phase4NotCalculableGuidance('few_evaluators', WEAKEST)}`,
    )
  })

  it('nenhum texto renderizado da orientação da Fase 4 fala em voltar, refinar ou veredito, e ela não tem atalho', async () => {
    const admin = await newUser('Admin')
    const absences: (readonly EvaluatorName[])[] = [[], ['carla'], ['bruno', 'carla']]

    auth.userId = admin
    const kinds: string[] = []
    for (const absent of absences) {
      const scene = await phase4Scene(admin, [
        { roundNumber: 1, phase: PHASE_3, status: 'closed' },
        { roundNumber: 2, phase: PHASE_4, status: 'closed', absent },
      ])
      const tree = await render(scene.project)
      kinds.push(guidanceOf(tree)!.guidance.kind)

      const markup = renderToStaticMarkup(
        createElement(ReadingGuidanceNote, guidanceOf(tree)!),
      )
      expect(markup).not.toContain('<a ')

      const text = guidanceTextOf(tree)
      const lower = text.toLowerCase()
      for (const word of [...RETURN_AND_VERDICT_WORDS, ...JUDGMENT_WORDS]) {
        expect(lower).not.toContain(word)
      }
      for (const phase3Text of PHASE_3_GUIDANCE_TEXTS) expect(text).not.toContain(phase3Text)
    }
    expect(kinds).toEqual(['below_band', 'within_band', 'not_calculable'])
  })

  it('num projeto na Fase 4 sem rodada da Fase 4, a rodada em foco da Fase 3 mostra o texto da Fase 3', async () => {
    const admin = await newUser('Admin')
    const scene = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_3, status: 'closed' },
    ])

    auth.userId = admin
    const tree = await render(scene.project)

    expect(guidanceOf(tree)).toEqual({
      guidance: { phase: PHASE_3, kind: 'below_band', criterion: WEAKEST, concentrated: false },
      projectId: scene.project,
    })
    expect(guidanceTextOf(tree)).toBe(
      `${GUIDANCE_HEADING} ${belowBandGuidance(WEAKEST)} ${CODEBOOK_SHORTCUT}`,
    )
  })

  it('o Avaliador não vê comparação, rodada de referência, Concordância nem Qualidade', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)

    auth.userId = scene.anaUser
    const tree = await render(scene.project)
    const text = allTextOf(tree).toLowerCase()

    expect(findElement(tree, ReferenceComparisonPanel)).toBeNull()
    expect(findElement(tree, RoundList)).toBeNull()
    expect(findElement(tree, ReadingGuidanceNote)).toBeNull()
    for (const word of ['rodada de referência', 'concordância', 'confiabilidade', 'qualidade']) {
      expect(text).not.toContain(word)
    }
    expect(text).not.toContain(GUIDANCE_HEADING.toLowerCase())
    for (const guidance of PHASE_4_GUIDANCE_TEXTS) {
      expect(text).not.toContain(guidance.toLowerCase())
    }
    expect(text).not.toContain('primeira rodada da fase 4')
  })

  it('no painel da rodada da Fase 4, quem avaliou antes tem a marca e quem chegou agora não', async () => {
    const admin = await newUser('Admin')
    const scene = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_3, status: 'closed', absent: ['carla'] },
      { roundNumber: 2, phase: PHASE_4, status: 'closed' },
    ])

    auth.userId = admin
    const tree = await render(scene.project)

    const mark = { short: PARTICIPATED_BEFORE, full: 'avaliou na rodada 1 (Fase 3)' }
    expect(notesOf(tree).participation).toEqual({ [scene.ana]: mark, [scene.bruno]: mark })

    const element = createElement(AgreementNotes, notesOf(tree))
    const text = markupTextOf(element)
    expect(text).toContain('Ana Já avaliou antes')
    expect(text).toContain('Bruno Já avaliou antes')
    expect(text).not.toContain('Carla já avaliou')
    expect(text).not.toContain('rodada 2')

    const tooltips = [
      ...renderToStaticMarkup(element).matchAll(/<span [^>]*role="tooltip"[^>]*>([^<]*)<\/span>/g),
    ].map((match) => match[1])
    expect(tooltips.filter((label) => label === mark.full)).toHaveLength(2)
  })

  it('com a rodada da Fase 4 aberta, as avaliações dela não entram na marca', async () => {
    const admin = await newUser('Admin')
    const scene = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_3, status: 'closed', absent: ['carla'] },
      { roundNumber: 2, phase: PHASE_4, status: 'open' },
    ])

    auth.userId = admin
    const tree = await render(scene.project)

    const mark = { short: PARTICIPATED_BEFORE, full: 'avaliou na rodada 1 (Fase 3)' }
    expect(cardOf(tree).participation).toEqual({ [scene.ana]: mark, [scene.bruno]: mark })
    expect(notesOf(tree).participation).toBeUndefined()

    const text = markupTextOf(createElement(OpenRoundCard, cardOf(tree)))
    expect(text).toContain('Ana Já avaliou antes')
    expect(text).toContain('Bruno Já avaliou antes')
  })

  it('depois de um retorno e de um novo avanço, a marca lista todas as rodadas anteriores', async () => {
    const admin = await newUser('Admin')
    const scene = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_3, status: 'closed' },
      { roundNumber: 2, phase: PHASE_4, status: 'closed' },
      { roundNumber: 3, phase: PHASE_3, status: 'closed' },
      { roundNumber: 4, phase: PHASE_4, status: 'open' },
    ])

    auth.userId = admin
    const tree = await render(scene.project)

    expect(cardOf(tree).participation?.[scene.ana]?.full).toBe(
      'avaliou nas rodadas 1 (Fase 3), 2 (Fase 4) e 3 (Fase 3)',
    )
  })

  it('o Administrador-avaliador aparece com a marca pelo vínculo de avaliador', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)
    const adminAsEvaluator = await addActiveEvaluator(ownerDb, scene.project, admin)
    await addEvaluation(
      ownerDb,
      scene.rounds.get(1)!,
      scene.responses.get(1)![0],
      adminAsEvaluator,
    )

    auth.userId = admin
    const tree = await render(scene.project)

    expect(notesOf(tree).participation?.[adminAsEvaluator]).toEqual({
      short: PARTICIPATED_BEFORE,
      full: 'avaliou na rodada 1 (Fase 3)',
    })
  })

  it('com a marca no painel, a lista não abre "Sobre esta lista" e os ⓘ ficam curtos', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)

    auth.userId = admin
    const tree = await render(scene.project)

    const markup = renderToStaticMarkup(createElement(AgreementNotes, notesOf(tree)))
    const tooltips = [...markup.matchAll(/<span [^>]*role="tooltip"[^>]*>([^<]*)<\/span>/g)].map(
      (match) => match[1].replaceAll('&quot;', '"'),
    )
    expect(markup).not.toContain('Sobre esta lista')
    for (const text of tooltips) {
      expect(text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(25)
    }
  })

  it('numa rodada em foco da Fase 3 ou da Fase 2, o painel não recebe marca', async () => {
    const admin = await newUser('Admin')
    const phase3 = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_3, status: 'closed' },
      { roundNumber: 2, phase: PHASE_4, status: 'closed' },
      { roundNumber: 3, phase: PHASE_3, status: 'open' },
    ])
    const phase2 = await phase4Scene(admin, [
      { roundNumber: 1, phase: PHASE_2, status: 'closed' },
      { roundNumber: 2, phase: PHASE_2, status: 'closed' },
    ])

    auth.userId = admin
    for (const scene of [phase3, phase2]) {
      const tree = await render(scene.project)
      expect(notesOf(tree).participation).toBeUndefined()
      const text = markupTextOf(createElement(AgreementNotes, notesOf(tree)))
      expect(text).not.toContain('avaliou n')
      expect(text).not.toContain(PARTICIPATED_BEFORE)
    }
  })

  it('o Avaliador não vê a marca de participação', async () => {
    const admin = await newUser('Admin')
    const scene = await basicScene(admin)

    auth.userId = scene.anaUser
    const tree = await render(scene.project)

    expect(findElement(tree, AgreementNotes)).toBeNull()
    expect(findElement(tree, CriterionAgreementTable)).toBeNull()
    expect(allTextOf(tree)).not.toContain('avaliou n')
    expect(allTextOf(tree)).not.toContain(PARTICIPATED_BEFORE)
  })
})
