import { cx } from '@/app/components/ui/cx'
import { InfoTooltip } from '@/app/components/ui/tooltip'
import { plural } from '@/lib/plural'
import type { Quality, QualityPair } from './quality'
import { QualityBar, QualitySwatch } from './quality-bar'
import {
  QUALITY_UNRATED,
  QUALITY_UNRATED_WITHOUT_OUTLIERS,
  levelShareText,
  qualityTotal,
  wholeLevelsText,
} from './quality-labels'
import {
  AGREEMENT_ALL_LABEL,
  AGREEMENT_WITHOUT_OUTLIERS_LABEL,
  OUTLIER_PAIR_RESULT,
  OUTLIER_PAIR_SUMMARY,
} from './agreement-labels'

function Line({
  label,
  quality,
  unrated,
  note,
}: {
  label?: string
  quality: Quality
  unrated: string
  note?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink tabular-nums">
        {label ? <span className="text-muted">{label}</span> : null}
        {quality.rated ? (
          <>
            <span className="font-semibold">{qualityTotal(quality.total)}</span>
            {quality.levels.map((level) => (
              <span
                key={level.value}
                className={cx('flex items-center gap-1.5', level.count === 0 && 'text-faint')}
              >
                <QualitySwatch value={level.value} />
                {levelShareText(level)}
              </span>
            ))}
          </>
        ) : (
          <span className="text-muted">{unrated}</span>
        )}
        {note ? <span className="text-xs text-muted">{note}</span> : null}
      </p>
      {quality.rated ? (
        <QualityBar levels={quality.levels} title={wholeLevelsText(quality.levels)} />
      ) : null}
    </div>
  )
}

export function QualityLine({ pair }: { pair: QualityPair }) {
  const { all, withoutOutliers } = pair

  if (!withoutOutliers) {
    return <Line quality={all} unrated={QUALITY_UNRATED} />
  }

  return (
    <div className="flex flex-col gap-3">
      <Line label={AGREEMENT_ALL_LABEL} quality={all} unrated={QUALITY_UNRATED} />
      <Line
        label={AGREEMENT_WITHOUT_OUTLIERS_LABEL}
        quality={withoutOutliers}
        unrated={QUALITY_UNRATED_WITHOUT_OUTLIERS}
        note={plural(pair.excluded, 'avaliador fora', 'avaliadores fora')}
      />
      <p className="m-0 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{OUTLIER_PAIR_RESULT}</span>
        <InfoTooltip text={OUTLIER_PAIR_SUMMARY} />
      </p>
    </div>
  )
}
