import { Badge } from '@/app/components/ui/badge'
import { ButtonLink } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { formatDate } from '@/app/notifications/labels'

type HistoryVersion = {
  id: string
  versionNumber: number
  isLatest: boolean
  isOpen: boolean
  name?: string | null
}

export function VersionHistory({
  versions,
  basePath,
  linkLabel,
}: {
  versions: HistoryVersion[]
  basePath: string
  linkLabel: string
}) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {versions.map((version) => (
        <li key={version.id}>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-semibold break-words text-ink">
                  Versão {version.versionNumber}
                  {version.name ? ` (${version.name})` : null}
                </span>
                {version.isLatest || version.isOpen ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {version.isLatest ? <Badge tone="accent">Em uso</Badge> : null}
                    {version.isOpen ? <Badge tone="info">Em aberto</Badge> : null}
                  </span>
                ) : null}
              </span>

              <ButtonLink href={`${basePath}/${version.id}`} variant="secondary" size="sm">
                {linkLabel}
              </ButtonLink>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

export function VersionBadges({
  version,
}: {
  version: { isLatest: boolean; isOpen: boolean }
}) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {version.isLatest ? <Badge tone="accent">Vigente</Badge> : null}
      {version.isOpen ? (
        <Badge tone="info">Em aberto</Badge>
      ) : (
        <Badge tone="neutral">Congelada</Badge>
      )}
    </span>
  )
}

export function VersionMeta({
  version,
}: {
  version: { createdAt: string; updatedAt: string | null; authorName: string }
}) {
  return (
    <p className="m-0 text-[13px] text-muted">
      Salva em {formatDate(version.createdAt)} por {version.authorName}
      {version.updatedAt
        ? ` · última alteração em ${formatDate(version.updatedAt)}`
        : null}
    </p>
  )
}
