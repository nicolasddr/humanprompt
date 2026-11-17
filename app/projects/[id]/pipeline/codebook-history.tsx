import { Badge } from '@/app/components/ui/badge'
import { ButtonLink } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import type { CodebookVersionSummary } from './codebook'

export function CodebookHistory({
  projectId,
  versions,
}: {
  projectId: string
  versions: CodebookVersionSummary[]
}) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {versions.map((version) => (
        <li key={version.id}>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-semibold text-ink">
                  Versão {version.versionNumber}
                </span>
                {version.isLatest || version.isOpen ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {version.isLatest ? <Badge tone="accent">Em uso</Badge> : null}
                    {version.isOpen ? <Badge tone="info">Em aberto</Badge> : null}
                  </span>
                ) : null}
              </span>

              <ButtonLink
                href={`/projects/${projectId}/codebook/${version.id}`}
                variant="secondary"
                size="sm"
              >
                Ver codebook
              </ButtonLink>
            </div>

            {version.note ? (
              <p className="m-0 mt-2.5 text-[13px] break-words text-ink">
                {version.note}
              </p>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  )
}
