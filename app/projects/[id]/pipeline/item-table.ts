import type { InputItem } from './items'

export const ITEMS_PER_PAGE = 15

export type ItemSortKey = 'cadastro' | 'nome' | 'caracteres' | 'rodadas'

const ORDERS = {
  recentes: { key: 'cadastro', desc: true, label: 'Mais recentes primeiro' },
  antigos: { key: 'cadastro', desc: false, label: 'Mais antigos primeiro' },
  nome: { key: 'nome', desc: false, label: 'Nome (A–Z)' },
  'nome-desc': { key: 'nome', desc: true, label: 'Nome (Z–A)' },
  'caracteres-desc': { key: 'caracteres', desc: true, label: 'Mais caracteres primeiro' },
  caracteres: { key: 'caracteres', desc: false, label: 'Menos caracteres primeiro' },
  'rodadas-desc': { key: 'rodadas', desc: true, label: 'Mais rodadas primeiro' },
  rodadas: { key: 'rodadas', desc: false, label: 'Menos rodadas primeiro' },
} as const satisfies Record<string, { key: ItemSortKey; desc: boolean; label: string }>

export type ItemOrder = keyof typeof ORDERS

export const DEFAULT_ITEM_ORDER: ItemOrder = 'recentes'

export const ITEM_ORDER_CHOICES: readonly ItemOrder[] = ['recentes', 'antigos', 'nome']

const FIRST_DIRECTION: Record<ItemSortKey, boolean> = {
  cadastro: true,
  nome: false,
  caracteres: true,
  rodadas: true,
}

type SearchValue = string | string[] | undefined

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseItemOrder(value: SearchValue): ItemOrder {
  const slug = first(value)
  return slug !== undefined && Object.hasOwn(ORDERS, slug) ? (slug as ItemOrder) : DEFAULT_ITEM_ORDER
}

export function parseItemPage(value: SearchValue): number {
  const raw = first(value)
  if (raw === undefined || !/^\d+$/.test(raw)) return 1
  const page = Number(raw)
  return page >= 1 ? page : 1
}

export function itemOrderLabel(order: ItemOrder): string {
  return ORDERS[order].label
}

export function itemOrderSort(order: ItemOrder): { key: ItemSortKey; desc: boolean } {
  const { key, desc } = ORDERS[order]
  return { key, desc }
}

function orderOf(key: ItemSortKey, desc: boolean): ItemOrder {
  const found = (Object.keys(ORDERS) as ItemOrder[]).find(
    (slug) => ORDERS[slug].key === key && ORDERS[slug].desc === desc,
  )
  return found ?? DEFAULT_ITEM_ORDER
}

export function nextItemOrder(current: ItemOrder, key: ItemSortKey): ItemOrder {
  const active = ORDERS[current]
  if (active.key === key) return orderOf(key, !active.desc)
  return orderOf(key, FIRST_DIRECTION[key])
}

export type NumberedItem = { item: InputItem; number: number }

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

function compareBy(key: ItemSortKey, a: NumberedItem, b: NumberedItem): number {
  switch (key) {
    case 'cadastro':
      return a.number - b.number
    case 'nome':
      return collator.compare(a.item.name, b.item.name)
    case 'caracteres':
      return a.item.content.length - b.item.content.length
    case 'rodadas':
      return a.item.rounds.length - b.item.rounds.length
  }
}

export function sortItems(items: readonly InputItem[], order: ItemOrder): NumberedItem[] {
  const { key, desc } = ORDERS[order]
  const numbered = items.map((item, index) => ({ item, number: index + 1 }))
  return numbered.sort((a, b) => {
    const primary = compareBy(key, a, b)
    if (primary !== 0) return desc ? -primary : primary
    return desc ? b.number - a.number : a.number - b.number
  })
}

export type ItemPage = { page: number; pageCount: number; start: number; end: number }

export function itemPage(total: number, requested: number): ItemPage {
  const pageCount = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const page = Math.min(Math.max(1, requested), pageCount)
  const start = (page - 1) * ITEMS_PER_PAGE
  return { page, pageCount, start, end: Math.min(start + ITEMS_PER_PAGE, total) }
}

export function pageNumbers(page: number, pageCount: number): (number | null)[] {
  const shown = new Set([1, pageCount, page - 1, page, page + 1])
  const numbers: (number | null)[] = []
  for (let n = 1; n <= pageCount; n++) {
    if (!shown.has(n)) continue
    const last = numbers[numbers.length - 1]
    if (typeof last === 'number' && n - last > 1) numbers.push(n - last === 2 ? n - 1 : null)
    numbers.push(n)
  }
  return numbers
}

export function itemsHref(
  projectId: string,
  { order, page = 1 }: { order: ItemOrder; page?: number },
): string {
  const params = new URLSearchParams()
  if (order !== DEFAULT_ITEM_ORDER) params.set('ordem', order)
  if (page > 1) params.set('pagina', String(page))
  const query = params.toString()
  return `/projects/${projectId}/items${query ? `?${query}` : ''}`
}
