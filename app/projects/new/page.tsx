import { requireUserId } from '@/lib/supabase/server'
import { Card } from '@/app/components/ui/card'
import { PageShell, PageTitle, PageSubtitle } from '@/app/components/ui/shell'
import { AppTopBar } from '@/app/components/app-top-bar'
import { NewProjectForm } from './new-project-form'

export default async function NewProjectPage() {
  await requireUserId()

  return (
    <PageShell
      header={
        <AppTopBar
          trail={[{ label: 'Meus projetos', href: '/dashboard' }, { label: 'Novo projeto' }]}
        />
      }
    >
      <PageTitle>Novo projeto</PageTitle>

      <PageSubtitle>
        Você se torna o Administrador deste projeto e pode convidar avaliadores depois.
      </PageSubtitle>
      <Card padding="lg">
        <NewProjectForm />
      </Card>
    </PageShell>
  )
}
