import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createElement, isValidElement, type ReactElement } from 'react'
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
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}))

import ProjectItemsPage from '@/app/projects/[id]/(tabs)/items/page'
import { ItemsEditor, ItemBatchPanel } from '@/app/projects/[id]/pipeline/items-editor'
import { itemUsageMark } from '@/app/projects/[id]/round-usage'
import {
  ITEM_FILE_FORMATS,
  ITEM_FILE_NOTE,
  type ItemBatch,
} from '@/app/projects/[id]/pipeline/item-content'
import { ITEM_BATCH_BYTES_MAX, ITEM_BATCH_MAX } from '@/lib/limits'
import { Section } from '@/app/components/ui/section'
import { buttonClass } from '@/app/components/ui/button'
import { PHASE_4 } from '@/app/projects/[id]/pipeline/preconditions'
import type { InputItem } from '@/app/projects/[id]/pipeline/items'
import type { ItemOrder } from '@/app/projects/[id]/pipeline/item-table'
import { ownerDb } from '@/lib/db'
import {
  createUser,
  createProject as seedProject,
  addActiveEvaluator,
  addPendingMember,
  addInputItem,
  addCodebookVersion,
  addPromptVersion,
  addRound,
  addResponse,
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

type ItemsProps = Parameters<typeof ItemsEditor>[0]

type SectionProps = { help: string; more?: { points: readonly string[] } }

function render(id: string, query: { ordem?: string; pagina?: string } = {}) {
  return ProjectItemsPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(query) })
}

function itemsOf(tree: unknown): ItemsProps {
  const element = findElement(tree, ItemsEditor)
  expect(element).toBeTruthy()
  return element!.props as ItemsProps
}

describe('app/projects/[id]/items — a tela dos itens de entrada', () => {
  let users: string[]
  let projs: string[]

  async function newUser(name?: string): Promise<string> {
    const id = await createUser(ownerDb, name)
    users.push(id)
    return id
  }
  async function newProject(admin: string, phase?: number): Promise<string> {
    const id = await seedProject(ownerDb, admin, 'Projeto de Teste', { phase })
    projs.push(id)
    return id
  }

  beforeEach(() => {
    users = []
    projs = []
    auth.userId = null
  })
  afterEach(async () => {
    await cleanup(projs, users)
  })

  it('o Administrador enxerga o pool de itens do projeto', async () => {
    const admin = await newUser('Admin')
    const project = await newProject(admin)
    await addInputItem(ownerDb, project, admin, { name: 'Consulta 001' })
    await addInputItem(ownerDb, project, admin, { name: 'Consulta 002' })

    auth.userId = admin
    const props = itemsOf(await render(project))
    expect(props.items.map((item) => item.name)).toEqual([
      'Consulta 001',
      'Consulta 002',
    ])
  })

  it('a lista diz em quais rodadas cada item já produziu resposta, sem filtrar nem travar', async () => {
    const admin = await newUser('Admin')
    const project = await newProject(admin)
    const usedAt = new Date().toISOString()
    const reused = await addInputItem(ownerDb, project, admin, {
      name: 'Consulta 001',
      usedAt,
    })
    const once = await addInputItem(ownerDb, project, admin, {
      name: 'Consulta 002',
      usedAt,
    })
    const never = await addInputItem(ownerDb, project, admin, { name: 'Consulta 003' })
    const codebookVersion = await addCodebookVersion(ownerDb, project, admin, {
      definitions: [
        { title: 'Informacional', type: 'category', criteria: [{ name: 'Clareza' }] },
      ],
    })
    const promptVersion = await addPromptVersion(ownerDb, project, admin)
    const first = await addRound(
      ownerDb,
      project,
      admin,
      codebookVersion,
      promptVersion,
      { roundNumber: 1, status: 'closed', phase: 2 },
    )
    const second = await addRound(
      ownerDb,
      project,
      admin,
      codebookVersion,
      promptVersion,
      { roundNumber: 2, phase: 3 },
    )
    await addResponse(ownerDb, first, reused, admin)
    await addResponse(ownerDb, second, reused, admin)
    await addResponse(ownerDb, second, once, admin)

    auth.userId = admin
    const props = itemsOf(await render(project))

    expect(props.items.map((item) => item.id)).toEqual([reused, once, never])
    expect(props.items.map((item) => item.rounds)).toEqual([
      [
        { roundNumber: 1, phase: 2 },
        { roundNumber: 2, phase: 3 },
      ],
      [{ roundNumber: 2, phase: 3 }],
      [],
    ])
    expect(itemUsageMark(props.items[0].rounds)).toEqual({
      short: 'Usado em 2 rodadas',
      full: 'usado nas rodadas 1 (Fase 2) e 2 (Fase 3)',
    })
    expect(itemUsageMark(props.items[1].rounds)).toEqual({
      short: 'Usado em 1 rodada',
      full: 'usado na rodada 2 (Fase 3)',
    })
    expect(itemUsageMark(props.items[2].rounds)).toBeNull()
    expect(props.items.map((item) => item.isEditable)).toEqual([false, false, true])
  })

  it('o projeto sem item nenhum abre o editor vazio', async () => {
    const admin = await newUser('Admin')
    const project = await newProject(admin)

    auth.userId = admin
    const props = itemsOf(await render(project))
    expect(props.items).toEqual([])

    const html = renderToStaticMarkup(createElement(ItemsEditor, props))
    expect(html).toContain('Enviar itens')
    expect(html).toContain('Arraste arquivos de texto aqui')
    expect(html).not.toContain('Arraste um arquivo')
    expect(html).toMatch(/<input[^>]*type="file"[^>]*multiple=""[^>]*>Escolher arquivo/)
    expect(html).not.toContain('Importar arquivo')
    expect(html).toContain(ITEM_FILE_FORMATS)
    expect(html).toContain('Nenhum item de entrada ainda. Envie o primeiro pelo bloco acima.')
    expect(html).toContain('Novo item')
    expect(html).not.toContain('type="search"')
    expect(html).not.toContain('Buscar no pool')
    expect(html).not.toContain('no pool')
    expect(html).not.toContain('caractere')

    const section = findElement(await render(project), Section)
    const { help, more } = section!.props as SectionProps
    expect(help).toBe(
      'Cada item vira uma resposta da LLM, e as fases seguintes amostram desse pool.',
    )
    expect(more?.points).toEqual([ITEM_FILE_NOTE])
    expect(ITEM_FILE_NOTE).toBe(
      'Um arquivo só entra no formulário e continua editável antes de cadastrar. Vários arquivos de uma vez viram um item cada, com o nome do arquivo como título. O arquivo em si não é guardado.',
    )
  })

  it('com itens no pool, o upload vira o botão "Importar arquivo" e nenhum input de arquivo fica à vista', async () => {
    const admin = await newUser('Admin')
    const project = await newProject(admin)
    await addInputItem(ownerDb, project, admin, { name: 'Consulta 001' })

    auth.userId = admin
    const tree = await render(project)
    const html = renderToStaticMarkup(createElement(ItemsEditor, itemsOf(tree)))
    expect(html).toContain('Importar arquivo')
    expect(html).toMatch(/<input[^>]*type="file"[^>]*multiple=""[^>]*>Importar arquivo/)
    expect(html).not.toContain('Enviar itens')
    expect(html).not.toContain('Arraste arquivos de texto aqui')

    const editField = html.slice(html.indexOf('Carregar de um arquivo'))
    const editInput = editField.match(/<input[^>]*type="file"[^>]*>/)
    expect(editInput).toBeTruthy()
    expect(editInput![0]).not.toContain('multiple')

    const fileInputs = html.match(/<input[^>]*type="file"[^>]*>/g) ?? []
    expect(fileInputs.length).toBeGreaterThan(0)
    for (const input of fileInputs) expect(input).toContain('class="sr-only"')

    const section = findElement(tree, Section)
    const { help, more } = section!.props as SectionProps
    expect(help.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(25)
    expect(more?.points).toEqual([ITEM_FILE_FORMATS, ITEM_FILE_NOTE])
  })

  it('cada item mostra "Editar" (ou "Ver conteúdo", se congelado) antes do ⋯, e o formulário do item usa a barra de salvar', async () => {
    const admin = await newUser('Admin')
    const project = await newProject(admin)
    await addInputItem(ownerDb, project, admin, {
      name: 'Consulta 001',
      usedAt: new Date().toISOString(),
    })
    await addInputItem(ownerDb, project, admin, { name: 'Consulta 002' })

    auth.userId = admin
    const props = itemsOf(await render(project))
    expect(props.items.map((item) => item.isEditable)).toEqual([false, true])
    const html = renderToStaticMarkup(createElement(ItemsEditor, props))

    expect(html).toContain('type="search"')
    expect(html).toContain('2 itens no pool')

    const toggles = [...html.matchAll(/<button[^>]*aria-expanded="false"[^>]*>([^<]*)<\/button>/g)]
    expect(toggles.map((match) => match[1])).toEqual(['Editar', 'Ver conteúdo'])
    for (const [tag] of toggles) {
      expect(tag).toContain(`class="${buttonClass('secondary', { size: 'sm' })}"`)
    }
    expect(toggles[0].index!).toBeLessThan(html.indexOf('Mais ações do item Consulta 002'))

    expect(html).not.toContain('Salvar item')
    expect(html).not.toContain('Concluir edição')
    expect(html).not.toContain('>Fechar</button>')
    expect(html.match(/Nenhuma alteração\./g) ?? []).toHaveLength(1)
    expect(html).toContain('>Cancelar</button>')
    expect(html).not.toContain('>Descartar</button>')
    expect(html).toMatch(/<button type="submit"[^>]*disabled=""[^>]*>Salvar<\/button>/)
    expect(html).toMatch(/class="(?:[^"]* )?sticky /)
  })

  it('na Fase 4, o pool continua aberto: cadastrar e editar o item não usado seguem na tela', async () => {
    const admin = await newUser('Admin')
    const project = await newProject(admin, PHASE_4)
    await addInputItem(ownerDb, project, admin, {
      name: 'Consulta 001',
      usedAt: new Date().toISOString(),
    })
    await addInputItem(ownerDb, project, admin, { name: 'Consulta 002' })

    auth.userId = admin
    const props = itemsOf(await render(project))
    expect(props.items.map((item) => item.isEditable)).toEqual([false, true])

    const html = renderToStaticMarkup(createElement(ItemsEditor, props))
    expect(html).toContain('Importar arquivo')
    expect(html).toContain('Novo item')
    expect(html).not.toContain('Fase 4')
  })

  it('a ordem e a página vêm da URL (?ordem=, ?pagina=), e valor inválido cai no padrão', async () => {
    const admin = await newUser('Admin')
    const project = await newProject(admin)
    await addInputItem(ownerDb, project, admin, { name: 'Consulta 001' })

    auth.userId = admin
    expect(itemsOf(await render(project))).toMatchObject({ order: 'recentes', page: 1 })
    expect(
      itemsOf(await render(project, { ordem: 'antigos', pagina: '2' })),
    ).toMatchObject({ order: 'antigos', page: 2 })
    expect(
      itemsOf(await render(project, { ordem: 'qualquer', pagina: '-3' })),
    ).toMatchObject({ order: 'recentes', page: 1 })
  })

  describe('tabela do pool', () => {
    const projectId = 'p'

    function poolOf(count: number): InputItem[] {
      return Array.from({ length: count }, (_, i) => ({
        id: `item-${i + 1}`,
        name: `Consulta ${String(i + 1).padStart(3, '0')}`,
        content: 'x'.repeat(i + 1),
        createdAt: new Date(Date.UTC(2026, 9, 1 + i, 12)).toISOString(),
        updatedAt: null,
        usedAt: null,
        isEditable: true,
        rounds: [],
      }))
    }

    function tableHtml(items: InputItem[], order: ItemOrder, page = 1): string {
      return renderToStaticMarkup(createElement(ItemsEditor, { projectId, items, order, page }))
    }

    function rowNames(html: string): string[] {
      return [...html.matchAll(/<th scope="row"[^>]*>([^<]*)<\/th>/g)].map((match) => match[1])
    }

    it('abre do mais recente para o mais antigo, 15 por página, com o número e a data de cadastro', () => {
      const html = tableHtml(poolOf(17), 'recentes')
      const names = rowNames(html)

      expect(names).toHaveLength(15)
      expect(names[0]).toBe('Consulta 017')
      expect(names[14]).toBe('Consulta 003')
      expect(html).toContain('17/10/2026')
      expect(html).toContain('1–15 de 17 itens')
      expect(html).toContain(`href="/projects/${projectId}/items?pagina=2"`)
      expect(html).toMatch(/<span aria-current="page"[^>]*>1<\/span>/)
      expect(html).toMatch(/<th scope="col" aria-sort="descending"[^>]*>.*?Cadastro/)
    })

    it('a segunda página traz o resto, e a página além do fim cai na última', () => {
      expect(rowNames(tableHtml(poolOf(17), 'recentes', 2))).toEqual([
        'Consulta 002',
        'Consulta 001',
      ])
      expect(rowNames(tableHtml(poolOf(17), 'recentes', 9))).toEqual([
        'Consulta 002',
        'Consulta 001',
      ])
    })

    it('com até 15 itens não há paginação', () => {
      const html = tableHtml(poolOf(15), 'recentes')
      expect(rowNames(html)).toHaveLength(15)
      expect(html).not.toContain('Páginas da lista de itens')
    })

    it('o seletor oferece as três ordens, e os cabeçalhos levam à ordem seguinte guardando-a na URL', () => {
      const html = tableHtml(poolOf(3), 'recentes')
      const options = [...html.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((m) => m[1])
      expect(options).toEqual(['Mais recentes primeiro', 'Mais antigos primeiro', 'Nome (A–Z)'])

      const base = `/projects/${projectId}/items`
      expect(html).toContain(`href="${base}?ordem=nome"`)
      expect(html).toContain(`href="${base}?ordem=caracteres-desc"`)
      expect(html).toContain(`href="${base}?ordem=rodadas-desc"`)
      expect(html).toContain(`href="${base}?ordem=antigos"`)

      expect(rowNames(tableHtml(poolOf(3), 'antigos'))).toEqual([
        'Consulta 001',
        'Consulta 002',
        'Consulta 003',
      ])
      const byLength = tableHtml(poolOf(3), 'caracteres')
      expect(rowNames(byLength)).toEqual(['Consulta 001', 'Consulta 002', 'Consulta 003'])
      expect(byLength).toContain(`href="${base}?ordem=caracteres-desc"`)
      const extra = [...byLength.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((m) => m[1])
      expect(extra).toContain('Menos caracteres primeiro')
    })

    it('as páginas guardam a ordem escolhida', () => {
      const html = tableHtml(poolOf(20), 'nome', 1)
      expect(html).toContain(`href="/projects/${projectId}/items?ordem=nome&amp;pagina=2"`)
    })
  })

  describe('painel do lote', () => {
    function batchOf(over: Partial<ItemBatch> = {}): ItemBatch {
      return {
        ready: [
          { key: '0:Consulta 1.txt', name: 'Consulta 1', content: 'CONTEUDO-SECRETO-1', duplicate: 'pool' },
          { key: '1:Consulta 2.txt', name: 'Consulta 2', content: 'CONTEUDO-SECRETO-2', duplicate: 'batch' },
          { key: '2:Consulta 2.md', name: 'Consulta 2', content: 'CONTEUDO-SECRETO-3', duplicate: 'batch' },
          { key: '3:Nova.txt', name: 'Nova', content: 'CONTEUDO-SECRETO-4', duplicate: null },
        ],
        refused: [
          { key: '4:artigo.pdf', name: 'artigo.pdf', reason: 'PDF e Word não são aceitos' },
          { key: '5:vazio.txt', name: 'vazio.txt', reason: 'Arquivo vazio' },
        ],
        bytes: 1000,
        ...over,
      }
    }

    function panelHtml(batch: ItemBatch): string {
      return renderToStaticMarkup(
        createElement(ItemBatchPanel, { projectId: 'p', batch, onClose: () => {} }),
      )
    }

    it('mostra só os títulos, as marcas de repetição, os recusados com o motivo e o botão de cadastrar, sem o conteúdo de nenhum arquivo', () => {
      const html = panelHtml(batchOf())

      expect(html).toContain('Importar 6 arquivos')
      expect(html).toContain('4 itens prontos para cadastrar')
      expect(html).toContain('2 arquivos recusados')
      for (const name of ['Consulta 1', 'Consulta 2', 'Nova', 'artigo.pdf', 'vazio.txt']) {
        expect(html).toContain(name)
      }
      expect(html.match(/Já existe no pool/g) ?? []).toHaveLength(1)
      expect(html.match(/Repetido no lote/g) ?? []).toHaveLength(2)
      expect(html).toContain('PDF e Word não são aceitos')
      expect(html).toContain('Arquivo vazio')
      expect(html).toContain('aria-label="Tirar “Nova” do lote"')
      expect(html).not.toContain('Tirar “artigo.pdf” do lote')
      expect(html).toMatch(/<button type="submit"[^>]*>Cadastrar 4 itens<\/button>/)
      expect(html).not.toMatch(/<button type="submit"[^>]*disabled=""[^>]*>Cadastrar/)
      expect(html).toContain('>Cancelar</button>')
      expect(html).not.toContain('CONTEUDO-SECRETO')
      expect(html).not.toContain('role="alert"')
    })

    it('acima do limite de bytes, o alerta diz o tamanho e o limite, e o botão sai desabilitado', () => {
      const html = panelHtml(batchOf({ bytes: ITEM_BATCH_BYTES_MAX + 1 }))

      expect(html).toContain('role="alert"')
      expect(html).toContain('Os 4 itens somam 3,1 MB, e um lote pode ter no máximo 3 MB.')
      expect(html).toMatch(/<button type="submit"[^>]*disabled=""[^>]*>Cadastrar 4 itens<\/button>/)
    })

    it('acima do limite de itens, o alerta diz a quantidade e o limite, e o botão sai desabilitado', () => {
      const ready = Array.from({ length: ITEM_BATCH_MAX + 1 }, (_, i) => ({
        key: `${i}:Item ${i}.txt`,
        name: `Item ${i}`,
        content: 'x',
        duplicate: null,
      }))
      const html = panelHtml(batchOf({ ready, refused: [] }))

      expect(html).toContain(
        `O lote tem ${ITEM_BATCH_MAX + 1} itens, e um lote pode ter no máximo ${ITEM_BATCH_MAX}.`,
      )
      expect(html).toMatch(
        new RegExp(`<button type="submit"[^>]*disabled=""[^>]*>Cadastrar ${ITEM_BATCH_MAX + 1} itens</button>`),
      )
    })

    it('sem nenhum arquivo pronto, o botão sai desabilitado', () => {
      const html = panelHtml(batchOf({ ready: [], bytes: 0 }))

      expect(html).toContain('0 itens prontos para cadastrar')
      expect(html).toMatch(/<button type="submit"[^>]*disabled=""[^>]*>Cadastrar 0 itens<\/button>/)
      expect(html).not.toContain('role="alert"')
    })
  })

  it('o avaliador ativo NÃO enxerga (notFound)', async () => {
    const admin = await newUser('Admin')
    const evaluator = await newUser('Avaliador')
    const project = await newProject(admin)
    await addActiveEvaluator(ownerDb, project, evaluator)

    auth.userId = evaluator
    await expect(render(project)).rejects.toThrow('NEXT_NOTFOUND')
  })

  it('quem não é membro não acessa, e a recusa não distingue projeto inexistente', async () => {
    const admin = await newUser('Admin')
    const outsider = await newUser('De Fora')
    const project = await newProject(admin)

    auth.userId = outsider
    const existing = await render(project).catch((e: Error) => e.message)
    const missing = await render(crypto.randomUUID()).catch((e: Error) => e.message)
    expect(existing).toBe('NEXT_NOTFOUND')
    expect(missing).toBe(existing)
  })

  it('o membro com onboarding pendente é levado ao fluxo de entrada', async () => {
    const admin = await newUser('Admin')
    const pending = await newUser('Em Onboarding')
    const project = await newProject(admin)
    await addPendingMember(ownerDb, project, pending)

    auth.userId = pending
    await expect(render(project)).rejects.toThrow(
      `NEXT_REDIRECT:/projects/${project}/onboarding`,
    )
  })
})
