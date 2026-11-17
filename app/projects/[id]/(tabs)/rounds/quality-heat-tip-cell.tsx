'use client'

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from '@/app/components/ui/cx'

type Spot = { left: number; top: number; above: boolean }

const TIP_HALF_WIDTH = 80
const TIP_HEIGHT = 84
const GAP = 6

function spotOf(target: HTMLElement): Spot {
  const rect = target.getBoundingClientRect()
  const center = rect.left + rect.width / 2
  const left = Math.min(
    Math.max(center, TIP_HALF_WIDTH + 8),
    window.innerWidth - TIP_HALF_WIDTH - 8,
  )
  const above = rect.bottom + GAP + TIP_HEIGHT > window.innerHeight
  return { left, top: above ? rect.top - GAP : rect.bottom + GAP, above }
}

export function HeatTipCell({
  lines,
  className,
  style,
  children,
}: {
  lines: string[]
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const id = useId()
  const [spot, setSpot] = useState<Spot | null>(null)

  useEffect(() => {
    if (!spot) return

    function hide() {
      setSpot(null)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSpot(null)
    }

    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [spot])

  return (
    <td
      tabIndex={0}
      aria-describedby={id}
      style={style}
      className={cx(
        className,
        'cursor-default focus-visible:ring-[3px] focus-visible:ring-brand-ring focus-visible:outline-none',
      )}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setSpot(spotOf(event.currentTarget))
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setSpot(null)
      }}
      onFocus={(event) => setSpot(spotOf(event.currentTarget))}
      onBlur={() => setSpot(null)}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        style={spot ? { left: spot.left, top: spot.top } : undefined}
        className={cx(
          'pointer-events-none fixed z-50 -translate-x-1/2 rounded-control bg-ink-soft px-3 py-2 text-left text-[12.5px] leading-[1.5] font-normal whitespace-nowrap text-surface shadow-[0_4px_12px_rgba(0,0,0,0.18)]',
          spot?.above && '-translate-y-full',
          spot ? 'block' : 'hidden',
        )}
      >
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </td>
  )
}
