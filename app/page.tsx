import Link from '@/app/components/app-link'
import { redirect } from 'next/navigation'
import { getClaims } from '@/lib/supabase/server'
import { GoogleSignInButton } from './components/auth-buttons'
import { ProcessOverview } from './components/process-overview'

export default async function Home() {
  const claims = await getClaims()
  if (claims) redirect('/dashboard')

  return (
    <div className="flex-1 bg-surface text-ink">
      <header className="border-b border-line px-[18px] py-3 sm:px-7">
        <Link className="text-[15px] font-bold text-brand" href="/">
          HumanPrompt
        </Link>
      </header>

      <main className="mx-auto max-w-[860px] px-[18px] pt-8 pb-12 sm:px-7 sm:pt-12 sm:pb-16">
        <ProcessOverview action={<GoogleSignInButton />} />
      </main>
    </div>
  )
}
