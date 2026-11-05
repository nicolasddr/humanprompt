import { Badge } from '@/app/components/ui/badge'
import { cx } from '@/app/components/ui/cx'
import { scaleLabel } from '../evaluate/scale'
import { bandLegend, bandTone } from './agreement-labels'
import { DIVERGENCE_SEGMENT_CLASS } from './divergence-bar'

const NOTES_LEGEND = [
  { key: 'equal', label: 'iguais', detail: 'a mesma nota' },
  {
    key: 'adjacent',
    label: 'adjacente',
    detail: `${scaleLabel('high')} e ${scaleLabel('medium')}, ou ${scaleLabel('medium')} e ${scaleLabel('low')}`,
  },
  {
    key: 'extreme',
    label: 'extrema',
    detail: `${scaleLabel('high')} e ${scaleLabel('low')}`,
  },
] as const

const rowClass = 'flex flex-wrap items-center gap-x-3 gap-y-1.5'

const headingClass = 'min-w-[7.5rem] font-semibold text-label'

export function AgreementLegend() {
  return (
    <div className="flex flex-col gap-2 text-xs text-muted">
      <div className={rowClass}>
        <span className={headingClass}>Faixa do ICR:</span>
        {bandLegend().map(({ band, range, label }) => (
          <Badge key={band} tone={bandTone(band)} className="tabular-nums">
            {label} {range}
          </Badge>
        ))}
      </div>
      <div className={rowClass}>
        <span className={headingClass}>Pares de notas:</span>
        {NOTES_LEGEND.map(({ key, label, detail }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cx('inline-block size-2.5 rounded-[2px]', DIVERGENCE_SEGMENT_CLASS[key])}
            />
            <span>
              <span className="text-label">{label}</span> ({detail})
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
