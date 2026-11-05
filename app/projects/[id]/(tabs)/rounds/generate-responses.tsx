'use client'

import { useActionState, useRef, useState } from 'react'
import { generateResponses, type GenerateResponsesState } from './actions'
import {
  ITEM_ROUNDS_HELP,
  RESPONSES_LEFT_HELP,
  RESPONSES_LEFT_POINTS,
  RESPONSES_LEFT_SUMMARY,
  SELECTION_MAX,
  ceilingReachedMessage,
  generatedCountMessage,
  generationFailureMessage,
  generationMax,
  responsesLeftMessage,
  retryLabel,
  selectionBlockerMessage,
  selectionBlockers,
  selectionCountLabel,
} from './preconditions'
import { useRouter } from 'next/navigation'
import { GENERATE_PANEL_ID } from './open-round-card'
import type { InputItem } from '../../pipeline/items'
import type { RoundResponse } from '../../pipeline/responses'
import { itemPreview } from '../../pipeline/item-preview'
import {
  itemListParams,
  itemPage,
  matchesItemQuery,
  sortItems,
  type ItemListHref,
  type ItemListTarget,
  type ItemOrder,
  type NumberedItem,
} from '../../pipeline/item-table'
import {
  ItemOrderSelect,
  ItemPagination,
  ItemSearch,
  ItemSortHeader,
  itemCellClass,
  itemHeaderClass,
  registeredOn,
} from '../../pipeline/item-table-parts'
import { itemUsageLabel } from '../../round-usage'
import { plural } from '@/lib/plural'
import { Alert } from '@/app/components/ui/alert'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Disclosure } from '@/app/components/ui/disclosure'
import { EmptyState } from '@/app/components/ui/empty-state'
import { Form, FormActions } from '@/app/components/ui/form'
import { InfoTooltip } from '@/app/components/ui/tooltip'
import { LearnMore } from '@/app/components/ui/learn-more'
import { useRowToggle } from '@/app/components/ui/editable-row'
import { preWrapClass } from '@/app/components/ui/prose'
import { cx } from '@/app/components/ui/cx'

const initialState: GenerateResponsesState = null

const COLUMNS = 8

const INTERACTIVE = 'button, a, input, label'

function generateItemsHref(projectId: string, target: ItemListTarget): string {
  const params = itemListParams(target, new URLSearchParams({ gerar: '1' }))
  return `/projects/${projectId}/rounds?${params}#${GENERATE_PANEL_ID}`
}

function rowBackground(checked: boolean, open: boolean, disabled: boolean): string | null {
  if (checked) return 'bg-accent-bg'
  if (open) return 'bg-surface-subtle'
  return disabled ? null : 'hover:bg-surface-subtle'
}

function SelectableItemRow({
  item,
  number,
  used,
  checked,
  disabled,
  onCheck,
}: {
  item: InputItem
  number: number
  used: boolean
  checked: boolean
  disabled: boolean
  onCheck: (checked: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const { panelId, expandRef, panelRef, collapse } = useRowToggle(open, () =>
    setOpen((current) => !current),
  )

  const rounds = item.rounds.length
  const usage = itemUsageLabel(item.rounds)

  function onRowClick(event: React.MouseEvent<HTMLElement>) {
    if (disabled) return
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return
    onCheck(!checked)
  }

  return (
    <>
      <tr
        onClick={onRowClick}
        className={cx(
          'max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] max-sm:items-center',
          'max-sm:gap-x-3 max-sm:gap-y-0.5 max-sm:px-3 max-sm:py-2',
          open ? null : 'max-sm:border-b max-sm:border-line',
          rowBackground(checked, open, disabled),
          disabled ? null : 'cursor-pointer',
        )}
      >
        <td
          className={cx(
            itemCellClass,
            'w-px',
            'max-sm:col-start-1 max-sm:row-span-2 max-sm:row-start-1 max-sm:w-auto',
          )}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onCheck(event.target.checked)}
            aria-label={`Selecionar ${item.name}`}
            className="block h-4 w-4 accent-brand"
          />
        </td>
        <td className={cx(itemCellClass, 'w-px text-right text-muted tabular-nums max-sm:hidden')}>
          {number}
        </td>
        <th
          scope="row"
          className={cx(
            itemCellClass,
            'max-w-[18rem] min-w-[12rem] text-left font-semibold break-words',
            used ? 'text-muted' : 'text-ink',
            'max-sm:col-span-2 max-sm:col-start-2 max-sm:row-start-1 max-sm:max-w-none max-sm:min-w-0',
          )}
        >
          {item.name}
        </th>
        <td
          className={cx(
            itemCellClass,
            'w-full max-w-0 text-[13px] text-muted',
            'max-sm:col-start-2 max-sm:row-start-2 max-sm:w-auto max-sm:max-w-none',
          )}
        >
          <span className="block truncate">{itemPreview(item.content, 200)}</span>
        </td>
        <td className={cx(itemCellClass, 'text-right whitespace-nowrap tabular-nums max-sm:hidden')}>
          {item.content.length}
        </td>
        <td
          className={cx(
            itemCellClass,
            'text-right tabular-nums',
            'max-sm:col-start-3 max-sm:row-start-2 max-sm:justify-self-end',
          )}
        >
          <span className={cx('max-sm:hidden', rounds === 0 && 'text-muted')}>{rounds}</span>
          {rounds > 0 ? (
            <span className="sm:hidden">
              <Badge tone="neutral">{plural(rounds, 'rodada', 'rodadas')}</Badge>
            </span>
          ) : null}
        </td>
        <td className={cx(itemCellClass, 'whitespace-nowrap tabular-nums max-sm:hidden')}>
          {registeredOn(item.createdAt)}
        </td>
        <td
          className={cx(
            itemCellClass,
            'text-right whitespace-nowrap',
            'max-sm:col-start-4 max-sm:row-span-2 max-sm:row-start-1 max-sm:justify-self-end',
          )}
        >
          <Button
            ref={expandRef}
            type="button"
            variant="secondary"
            size="sm"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={open ? collapse : () => setOpen(true)}
          >
            {open ? 'Fechar' : 'Ver conteúdo'}
          </Button>
        </td>
      </tr>

      <tr
        className={cx(
          'bg-surface-subtle',
          open ? 'max-sm:block max-sm:border-b max-sm:border-line' : 'hidden',
        )}
      >
        <td colSpan={COLUMNS} className={cx(itemCellClass, 'max-sm:block max-sm:px-3 max-sm:pb-3')}>
          <div
            id={panelId}
            ref={panelRef}
            className={cx('flex-col gap-3', open ? 'flex' : 'hidden')}
          >
            <p
              className={`m-0 max-h-[50vh] overflow-auto font-mono text-[13px] leading-[1.6] ${preWrapClass} text-ink`}
            >
              {item.content}
            </p>
            {usage ? (
              <p className="m-0 border-t border-line pt-3 text-[13px] text-muted">
                {`${usage[0].toUpperCase()}${usage.slice(1)}.`}
              </p>
            ) : null}
          </div>
        </td>
      </tr>
    </>
  )
}

function ItemSelectTable({
  hrefOf,
  order,
  usageHelp,
  children,
}: {
  hrefOf: ItemListHref
  order: ItemOrder
  usageHelp?: string
  children: React.ReactNode
}) {
  const sort = { hrefOf, order }

  return (
    <table className="w-full border-collapse text-[13px] max-sm:block max-sm:border-t max-sm:border-line">
      <thead className="max-sm:hidden">
        <tr>
          <th scope="col" className={itemHeaderClass}>
            <span className="sr-only">Selecionar</span>
          </th>
          <th scope="col" className={cx(itemHeaderClass, 'text-right')}>
            #
          </th>
          <ItemSortHeader {...sort} sortKey="nome">
            Nome
          </ItemSortHeader>
          <th scope="col" className={itemHeaderClass}>
            Conteúdo
          </th>
          <ItemSortHeader {...sort} sortKey="caracteres" align="right">
            Caracteres
          </ItemSortHeader>
          <ItemSortHeader {...sort} sortKey="rodadas" align="right" help={usageHelp}>
            Rodadas
          </ItemSortHeader>
          <ItemSortHeader {...sort} sortKey="cadastro">
            Cadastro
          </ItemSortHeader>
          <th scope="col" className={itemHeaderClass}>
            <span className="sr-only">Conteúdo completo</span>
          </th>
        </tr>
      </thead>
      <tbody className="max-sm:block">{children}</tbody>
    </table>
  )
}

export function GenerateResponses({
  projectId,
  round,
  items,
  generated,
  model,
  responsesLeft,
  responsesMax,
  order,
  page,
}: {
  projectId: string
  round: { id: string; roundNumber: number }
  items: InputItem[]
  generated: RoundResponse[]
  model: string
  responsesLeft: number
  responsesMax: number
  order: ItemOrder
  page: number
}) {
  const router = useRouter()
  const hrefOf: ItemListHref = (target) => generateItemsHref(projectId, target)
  const [state, action, pending] = useActionState(generateResponses, initialState)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [settled, setSettled] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const done = state && 'ok' in state ? state.nonce : null
  if (done !== settled) {
    setSettled(done)
    setSelected([])
  }

  const usedInRound = generated.map((response) => response.itemId)
  const usedHere = new Set(usedInRound)
  const available = items.filter((item) => !usedHere.has(item.id))

  const max = generationMax(responsesLeft)
  const outOfQuota = responsesLeft === 0

  const blockers = selectionBlockers(selected, {
    available: items.map((item) => item.id),
    usedInRound,
    responsesLeft,
  })
  const complaint = blockers.find((blocker) => blocker.key !== 'empty')
  const atMax = selected.length >= max

  const atMaxNote =
    max < SELECTION_MAX
      ? `Restam ${max} ${max === 1 ? 'vaga' : 'vagas'} de resposta de LLM neste ` +
        'projeto, e cada item selecionado gasta uma.'
      : `Máximo de ${SELECTION_MAX} itens por geração. Gere estes e selecione os ` +
        'próximos depois.'

  function toggle(itemId: string, checked: boolean) {
    setSelected((current) =>
      checked
        ? current.includes(itemId)
          ? current
          : [...current, itemId]
        : current.filter((id) => id !== itemId),
    )
  }

  const error = state && 'error' in state ? state.error : null
  const outcome = state && 'ok' in state ? state : null
  const nameOf = (itemId: string) =>
    items.find((item) => item.id === itemId)?.name ?? 'Item removido'

  const retryable = (outcome?.failed ?? [])
    .map((failure) => failure.itemId)
    .filter((itemId) => available.some((item) => item.id === itemId))
  const retryTargets = retryable.slice(0, max)

  function retryFailed() {
    setSelected(retryTargets)
    formRef.current?.scrollIntoView({ block: 'start' })
  }

  function search(value: string) {
    setQuery(value)
    if (page > 1) router.replace(hrefOf({ order }), { scroll: false })
  }

  const listed = sortItems(items, order).filter(({ item }) => matchesItemQuery(item, query))
  const availableRows = listed.filter(({ item }) => !usedHere.has(item.id))
  const answeredRows = listed.filter(({ item }) => usedHere.has(item.id))
  const current = itemPage(availableRows.length, page)

  function renderRow({ item, number }: NumberedItem) {
    const used = usedHere.has(item.id)
    const checked = selected.includes(item.id)

    return (
      <SelectableItemRow
        key={item.id}
        item={item}
        number={number}
        used={used}
        checked={checked}
        disabled={used || pending || outOfQuota || (atMax && !checked)}
        onCheck={(next) => toggle(item.id, next)}
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState>
        Este projeto ainda não tem item de entrada, e cada item selecionado é uma resposta
        a gerar. Cadastre ao menos um item na aba Itens.
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Form action={action} gap="sm" ref={formRef}>
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="round_id" value={round.id} />

        <div className="flex flex-col gap-1">
          <p className="m-0 text-[13px] font-semibold text-ink">
            {selectionCountLabel(selected.length, max)}
          </p>
          <p className="m-0 flex items-center gap-1.5 text-[13px] text-muted">
            {responsesLeftMessage(responsesLeft, responsesMax)}
            <InfoTooltip text={RESPONSES_LEFT_HELP} />
          </p>
          <LearnMore summary={RESPONSES_LEFT_SUMMARY} points={RESPONSES_LEFT_POINTS} />
        </div>

        {selected.map((itemId) => (
          <input key={itemId} type="hidden" name="item_ids" value={itemId} />
        ))}

        {available.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ItemOrderSelect hrefOf={hrefOf} order={order} />
              <ItemSearch value={query} onChange={search} />
            </div>

            {availableRows.length === 0 ? (
              <EmptyState>Nenhum item do pool corresponde a “{query.trim()}”.</EmptyState>
            ) : (
              <>
                <ItemSelectTable hrefOf={hrefOf} order={order} usageHelp={ITEM_ROUNDS_HELP}>
                  {availableRows.slice(current.start, current.end).map(renderRow)}
                </ItemSelectTable>
                {current.pageCount > 1 ? (
                  <ItemPagination
                    hrefOf={hrefOf}
                    order={order}
                    {...current}
                    total={availableRows.length}
                  />
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {answeredRows.length > 0 ? (
          <Disclosure
            summary={plural(
              answeredRows.length,
              'item já respondido nesta rodada',
              'itens já respondidos nesta rodada',
            )}
          >
            <div className="mt-2">
              <ItemSelectTable hrefOf={hrefOf} order={order}>
                {answeredRows.map(renderRow)}
              </ItemSelectTable>
            </div>
          </Disclosure>
        ) : null}

        {available.length === 0 ? (
          <p className="m-0 text-[13px] text-muted">
            Todos os itens do projeto já produziram resposta na rodada{' '}
            {round.roundNumber}. Cadastre outro item, ou use estes de novo na próxima
            rodada.
          </p>
        ) : null}

        {atMax && !outOfQuota ? (
          <p className="m-0 text-[13px] text-muted">{atMaxNote}</p>
        ) : null}

        {outOfQuota ? (
          <Alert tone="notice">{ceilingReachedMessage(responsesMax)}</Alert>
        ) : null}

        {complaint ? (
          <Alert tone="notice">{selectionBlockerMessage(complaint)}</Alert>
        ) : null}
        {error && !pending ? <Alert tone="error">{error}</Alert> : null}

        <FormActions align="start">
          <Button
            type="submit"
            loading={pending}
            loadingText="Gerando…"
            disabled={blockers.length > 0 || outOfQuota}
          >
            Gerar respostas
          </Button>
          <span className="text-[13px] text-muted">Modelo: {model}</span>
        </FormActions>

        {pending ? (
          <p role="status" aria-live="polite" className="m-0 text-[13px] text-muted">
            Gerando… cada item é uma chamada à LLM, e o que der certo é gravado mesmo que
            outro item falhe.
          </p>
        ) : null}
      </Form>

      {outcome && outcome.created.length > 0 && !pending ? (
        <Alert tone="success">{generatedCountMessage(outcome.created.length)}</Alert>
      ) : null}

      {outcome && outcome.failed.length > 0 && !pending ? (
        <Card tone="subtle" padding="sm">
          <p className="m-0 text-[13px] font-semibold text-ink">
            {outcome.failed.length === 1
              ? 'Um item não gerou resposta:'
              : `${outcome.failed.length} itens não geraram resposta:`}
          </p>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {outcome.failed.map((failure) => (
              <li key={failure.itemId} className="text-[13px] text-muted">
                <span className="font-semibold text-ink">{nameOf(failure.itemId)}</span>{' '}
                {generationFailureMessage(failure.failure)}
              </li>
            ))}
          </ul>

          {retryTargets.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Button type="button" variant="secondary" size="sm" onClick={retryFailed}>
                {retryLabel(retryTargets.length)}
              </Button>
              {retryTargets.length < retryable.length ? (
                <span className="text-[13px] text-muted">
                  Só cabem {retryTargets.length} de {retryable.length} nesta geração; os
                  demais ficam para a próxima.
                </span>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

    </div>
  )
}
