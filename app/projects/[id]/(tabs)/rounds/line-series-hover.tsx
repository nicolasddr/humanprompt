'use client'

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { cx } from '@/app/components/ui/cx'

export type HoverRow = { key: string; swatchClass: string; name: string; value: string }

export type HoverDot = { key: string; swatchClass: string; top: number }

export type HoverPoint = {
  title: string
  subtitle: string
  rows: readonly HoverRow[]
  notes: readonly string[]
  dots: readonly HoverDot[]
}

const GAP = 12
const EDGE = 8

export function LineSeriesHover({ points }: { points: readonly HoverPoint[] }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)

  const count = points.length
  const center = (index: number) => ((index + 0.5) / count) * 100

  function indexAt(event: PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)))
  }

  useLayoutEffect(() => {
    const box = boxRef.current
    const tip = tipRef.current
    if (active === null || !box || !tip) return

    const rect = box.getBoundingClientRect()
    const width = tip.offsetWidth
    const anchor = (rect.width * (active + 0.5)) / count
    let left = anchor + GAP
    if (rect.left + left + width > window.innerWidth - EDGE) left = anchor - GAP - width
    left = Math.max(left, EDGE - rect.left)
    left = Math.min(left, window.innerWidth - EDGE - rect.left - width)
    tip.style.left = `${left}px`
    tip.style.visibility = 'visible'
  }, [active, count])

  useEffect(() => {
    if (active === null) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setActive(null)
    }

    function onPointerDown(event: globalThis.PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setActive(null)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [active])

  const point = active === null ? null : points[active]

  return (
    <div
      ref={boxRef}
      aria-hidden
      className="absolute inset-x-0 top-0 h-40"
      onPointerMove={(event) => {
        if (event.pointerType === 'mouse') setActive(indexAt(event))
      }}
      onPointerDown={(event) => setActive(indexAt(event))}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setActive(null)
      }}
    >
      {point && active !== null ? (
        <>
          <span
            className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-line-strong"
            style={{ left: `${center(active)}%` }}
          />
          {point.dots.map((dot) => (
            <span
              key={dot.key}
              className={cx(
                'pointer-events-none absolute size-3 -translate-1/2 rounded-full border-2 border-surface shadow-[0_0_0_1px_rgba(0,0,0,0.12)]',
                dot.swatchClass,
              )}
              style={{ left: `${center(active)}%`, top: `${dot.top}%` }}
            />
          ))}
          <div
            ref={tipRef}
            className="pointer-events-none absolute top-0 z-50 w-max max-w-[min(280px,calc(100vw-16px))] rounded-control border border-line bg-surface px-3 py-2 text-left text-xs leading-normal text-ink shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
            style={{ visibility: 'hidden' }}
          >
            <p className="m-0 flex items-baseline gap-2">
              <span className="font-semibold">{point.title}</span>
              <span className="text-faint">{point.subtitle}</span>
            </p>
            {point.rows.length > 0 ? (
              <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
                {point.rows.map((row) => (
                  <li key={row.key} className="flex items-center gap-2">
                    <span
                      className={cx('inline-block size-2 shrink-0 rounded-full', row.swatchClass)}
                    />
                    <span className="min-w-0 flex-1 text-muted">{row.name}</span>
                    <span className="pl-3 text-right font-semibold whitespace-nowrap tabular-nums">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {point.notes.map((note) => (
              <p key={note} className="m-0 mt-1.5 border-t border-line pt-1.5 text-muted first-letter:uppercase">
                {note}
              </p>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
