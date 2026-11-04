import { ButtonLink, buttonClass } from '@/app/components/ui/button'
import { cx } from '@/app/components/ui/cx'

function NavLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className={buttonClass('secondary', {
          size: 'sm',
          className: 'pointer-events-none opacity-50',
        })}
      >
        {children}
      </span>
    )
  }

  return (
    <ButtonLink variant="secondary" size="sm" href={href}>
      {children}
    </ButtonLink>
  )
}

function ShortLabel({ short, full }: { short: string; full: string }) {
  return (
    <>
      <span aria-hidden="true" className="sm:hidden">
        {short}
      </span>
      <span className="max-sm:sr-only">{full}</span>
    </>
  )
}

export function QueueNav({
  prev,
  next,
  position,
  spread = false,
}: {
  prev: string | null
  next: string | null
  position?: { current: number; total: number }
  spread?: boolean
}) {
  return (
    <nav
      aria-label="Navegação entre respostas"
      className={cx('flex flex-wrap items-center gap-2', spread && 'justify-between')}
    >
      <NavLink href={prev}>
        <span aria-hidden="true">‹</span>
        <ShortLabel short="Anterior" full="Resposta anterior" />
      </NavLink>
      {position ? (
        <span
          aria-live="polite"
          className={cx(
            'text-center text-[13px] font-semibold whitespace-nowrap text-ink tabular-nums',
            spread && 'max-sm:order-first max-sm:basis-full',
          )}
        >
          {`Resposta ${position.current} de ${position.total}`}
        </span>
      ) : null}
      <NavLink href={next}>
        <ShortLabel short="Próxima" full="Próxima resposta" />
        <span aria-hidden="true">›</span>
      </NavLink>
    </nav>
  )
}
