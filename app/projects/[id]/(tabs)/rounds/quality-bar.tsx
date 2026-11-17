import { cx } from '@/app/components/ui/cx'
import type { ScaleValue } from '../evaluate/scale'
import type { QualityLevel } from './quality'
import { levelText } from './quality-labels'

const TONE: Record<ScaleValue, string> = {
  high: 'bg-quality-high',
  medium: 'bg-quality-medium',
  low: 'bg-quality-low',
}

export function QualityBar({
  levels,
  title,
}: {
  levels: QualityLevel[]
  title?: string
}) {
  return (
    <div
      aria-hidden
      title={title}
      className="flex h-2 w-full overflow-hidden rounded-full bg-line"
    >
      {levels.map((level) => (
        <span
          key={level.value}
          title={title ? undefined : levelText(level)}
          className={cx('h-full', TONE[level.value])}
          style={{ width: `${level.share * 100}%` }}
        />
      ))}
    </div>
  )
}

export function QualitySwatch({ value }: { value: ScaleValue }) {
  return <span aria-hidden className={cx('inline-block size-2 rounded-[2px]', TONE[value])} />
}
