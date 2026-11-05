'use client'

import { useRouter } from 'next/navigation'
import {
  ITEM_ORDER_CHOICES,
  itemOrderLabel,
  itemOrderSort,
  nextItemOrder,
  pageNumbers,
  type ItemListHref,
  type ItemOrder,
  type ItemSortKey,
} from './item-table'
import Link from '@/app/components/app-link'
import { ButtonLink, buttonClass } from '@/app/components/ui/button'
import { Input, Select } from '@/app/components/ui/field'
import { SearchIcon } from '@/app/components/ui/icons'
import { InfoTooltip } from '@/app/components/ui/tooltip'
import { cx } from '@/app/components/ui/cx'
import { plural } from '@/lib/plural'

export const itemCellClass =
  'border-b border-line px-3 py-2 align-middle max-sm:border-0 max-sm:p-0'

export const itemHeaderClass =
  'border-b border-line px-3 py-2 text-left align-bottom text-[11px] font-semibold ' +
  'tracking-[0.06em] whitespace-nowrap text-muted uppercase'

export function registeredOn(createdAt: string): string {
  const [year, month, day] = createdAt.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export function ItemSortHeader({
  hrefOf,
  order,
  sortKey,
  align = 'left',
  help,
  children,
}: {
  hrefOf: ItemListHref
  order: ItemOrder
  sortKey: ItemSortKey
  align?: 'left' | 'right'
  help?: string
  children: React.ReactNode
}) {
  const active = itemOrderSort(order)
  const isActive = active.key === sortKey
  const arrow = isActive ? (active.desc ? '↓' : '↑') : '↕'

  return (
    <th
      scope="col"
      aria-sort={isActive ? (active.desc ? 'descending' : 'ascending') : undefined}
      className={cx(itemHeaderClass, align === 'right' && 'text-right')}
    >
      <span className="inline-flex items-center gap-1">
        <Link
          href={hrefOf({ order: nextItemOrder(order, sortKey) })}
          scroll={false}
          className={cx(
            'inline-flex items-center gap-1 rounded-sm uppercase hover:text-ink',
            'focus-visible:ring-[3px] focus-visible:ring-brand-ring focus-visible:outline-none',
            isActive && 'text-ink',
          )}
        >
          {children}
          <span aria-hidden="true" className={isActive ? undefined : 'text-line-strong'}>
            {arrow}
          </span>
        </Link>
        {help ? (
          <span className="tracking-normal normal-case">
            <InfoTooltip text={help} />
          </span>
        ) : null}
      </span>
    </th>
  )
}

function PageStep({ href, label, children }: { href: string | null; label: string; children: string }) {
  const className = 'min-w-8'
  if (!href) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={buttonClass('secondary', {
          size: 'sm',
          className: cx(className, 'pointer-events-none opacity-50'),
        })}
      >
        {children}
      </span>
    )
  }
  return (
    <ButtonLink variant="secondary" size="sm" href={href} aria-label={label} className={className}>
      {children}
    </ButtonLink>
  )
}

export function ItemPagination({
  hrefOf,
  order,
  page,
  pageCount,
  start,
  end,
  total,
}: {
  hrefOf: ItemListHref
  order: ItemOrder
  page: number
  pageCount: number
  start: number
  end: number
  total: number
}) {
  const href = (target: number) => hrefOf({ order, page: target })

  return (
    <nav
      aria-label="Páginas da lista de itens"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <p className="m-0 text-[13px] text-muted tabular-nums">
        {`${start + 1}–${end} de ${plural(total, 'item', 'itens')}`}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <PageStep href={page > 1 ? href(page - 1) : null} label="Página anterior">
          ‹
        </PageStep>
        {pageNumbers(page, pageCount).map((number, index) =>
          number === null ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted">
              …
            </span>
          ) : number === page ? (
            <span
              key={number}
              aria-current="page"
              className={buttonClass('primary', { size: 'sm', className: 'min-w-8' })}
            >
              {number}
            </span>
          ) : (
            <ButtonLink
              key={number}
              variant="secondary"
              size="sm"
              href={href(number)}
              aria-label={`Página ${number}`}
              className="min-w-8"
            >
              {number}
            </ButtonLink>
          ),
        )}
        <PageStep href={page < pageCount ? href(page + 1) : null} label="Próxima página">
          ›
        </PageStep>
      </div>
    </nav>
  )
}

export function ItemOrderSelect({ hrefOf, order }: { hrefOf: ItemListHref; order: ItemOrder }) {
  const router = useRouter()
  const choices = ITEM_ORDER_CHOICES.includes(order)
    ? ITEM_ORDER_CHOICES
    : [...ITEM_ORDER_CHOICES, order]

  return (
    <span className="w-[220px] max-sm:w-full">
      <Select
        key={order}
        defaultValue={order}
        aria-label="Ordem da lista"
        onChange={(event) =>
          router.push(hrefOf({ order: event.target.value as ItemOrder }), {
            scroll: false,
          })
        }
      >
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {itemOrderLabel(choice)}
          </option>
        ))}
      </Select>
    </span>
  )
}

export function ItemSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <span className="relative inline-flex items-center max-sm:w-full">
      <SearchIcon className="pointer-events-none absolute left-3 text-muted" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Buscar itens pelo nome ou pelo conteúdo"
        placeholder="Buscar no pool"
        className="w-[240px] pl-9 max-sm:w-full"
      />
    </span>
  )
}
