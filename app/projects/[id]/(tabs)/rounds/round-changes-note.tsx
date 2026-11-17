import { Alert } from '@/app/components/ui/alert'
import type { RoundChanges } from './round-changes'
import {
  CODEBOOK_AND_PROMPT_NOTICE,
  CODEBOOK_AND_PROMPT_WITH_INPUT_NOTICE,
} from './round-changes-labels'

function noticeOf(changes: RoundChanges): string | null {
  if (changes.entersPhase3 && (changes.codebook.changed || changes.prompt.changed)) {
    return CODEBOOK_AND_PROMPT_WITH_INPUT_NOTICE
  }
  return changes.codebookAndPrompt ? CODEBOOK_AND_PROMPT_NOTICE : null
}

export function RoundChangeNotice({ changes }: { changes: RoundChanges }) {
  const notice = noticeOf(changes)
  if (!notice) return null

  return (
    <Alert tone="notice" className="m-0">
      {notice}
    </Alert>
  )
}
