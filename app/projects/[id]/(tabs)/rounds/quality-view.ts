import { QUALITY_SECTION_ID } from './reading-guidance'

export type QualityView = 'all' | 'without-outliers'

export const QUALITY_VIEW_PARAM = 'qualidade'

export const QUALITY_VIEW_WITHOUT_OUTLIERS = 'sem-outliers'

export function parseQualityView(value: string | string[] | undefined): QualityView {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === QUALITY_VIEW_WITHOUT_OUTLIERS ? 'without-outliers' : 'all'
}

export function withQualityView(href: string, view: QualityView): string {
  const [path, search = ''] = href.split('?')
  const query = new URLSearchParams(search)
  if (view === 'without-outliers') query.set(QUALITY_VIEW_PARAM, QUALITY_VIEW_WITHOUT_OUTLIERS)
  else query.delete(QUALITY_VIEW_PARAM)
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

export function qualityViewHref(href: string, view: QualityView): string {
  return `${withQualityView(href, view)}#${QUALITY_SECTION_ID}`
}
