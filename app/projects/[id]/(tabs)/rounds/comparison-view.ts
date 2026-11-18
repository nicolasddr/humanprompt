import type { QualityView } from './quality-view'

export type ComparisonView = QualityView

export const COMPARISON_VIEW_PARAM = 'comparacao'

export const COMPARISON_VIEW_WITHOUT_OUTLIERS = 'sem-outliers'

export const REFERENCE_COMPARISON_SECTION_ID = 'comparacao-referencia'

export function parseComparisonView(value: string | string[] | undefined): ComparisonView {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === COMPARISON_VIEW_WITHOUT_OUTLIERS ? 'without-outliers' : 'all'
}

export function withComparisonView(href: string, view: ComparisonView): string {
  const [path, search = ''] = href.split('?')
  const query = new URLSearchParams(search)
  if (view === 'without-outliers') {
    query.set(COMPARISON_VIEW_PARAM, COMPARISON_VIEW_WITHOUT_OUTLIERS)
  } else {
    query.delete(COMPARISON_VIEW_PARAM)
  }
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

export function comparisonViewHref(href: string, view: ComparisonView): string {
  return `${withComparisonView(href, view)}#${REFERENCE_COMPARISON_SECTION_ID}`
}
