import { cx } from '@/app/components/ui/cx'
import type { Quality } from './quality'
import { QualityBar, QualitySwatch } from './quality-bar'
import { levelShareText, qualityTotal, wholeLevelsText } from './quality-labels'

export function QualityLine({ quality, unrated }: { quality: Quality; unrated: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink tabular-nums">
        {quality.rated ? (
          <>
            {quality.levels.map((level) => (
              <span
                key={level.value}
                className={cx('flex items-center gap-1.5', level.count === 0 && 'text-faint')}
              >
                <QualitySwatch value={level.value} />
                {levelShareText(level)}
              </span>
            ))}
            <span className="font-semibold">{qualityTotal(quality.total)}</span>
          </>
        ) : (
          <span className="text-muted">{unrated}</span>
        )}
      </p>
      {quality.rated ? (
        <QualityBar levels={quality.levels} title={wholeLevelsText(quality.levels)} />
      ) : null}
    </div>
  )
}
