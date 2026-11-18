import Link from '@/app/components/app-link'
import { cx } from '@/app/components/ui/cx'
import {
  QUALITY_VIEW_ALL,
  QUALITY_VIEW_LABEL,
  QUALITY_VIEW_RESULT,
  qualityViewWithoutOutliers,
} from './quality-labels'
import { qualityViewHref, type QualityView } from './quality-view'

export const VIEW_GROUP_CLASS =
  'inline-flex w-fit max-w-full divide-x divide-line-strong overflow-x-auto rounded-control border border-line-strong bg-surface'

const option = 'px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors'

export function ViewOption({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: string
}) {
  if (active) {
    return (
      <span aria-current="true" className={cx(option, 'bg-brand-tint text-brand')}>
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className={cx(option, 'text-label hover:text-ink')}>
      {children}
    </Link>
  )
}

export function QualityViewSelector({
  view,
  excluded,
  href,
}: {
  view: QualityView
  excluded: number
  href: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="group"
        aria-label={QUALITY_VIEW_LABEL}
        className={VIEW_GROUP_CLASS}
      >
        <ViewOption href={qualityViewHref(href, 'all')} active={view === 'all'}>
          {QUALITY_VIEW_ALL}
        </ViewOption>
        <ViewOption
          href={qualityViewHref(href, 'without-outliers')}
          active={view === 'without-outliers'}
        >
          {qualityViewWithoutOutliers(excluded)}
        </ViewOption>
      </div>
      <p className="m-0 text-xs text-muted">{QUALITY_VIEW_RESULT}</p>
    </div>
  )
}
