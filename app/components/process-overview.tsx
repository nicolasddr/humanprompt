import type { ReactNode } from 'react'
import { PROJECT_PHASES } from '@/app/projects/[id]/phase-bar'
import { cx } from './ui/cx'
import { Disclosure } from './ui/disclosure'

const PHASE_STEPS = [
  {
    text: 'Escreva o prompt, cadastre os itens de entrada e monte o codebook.',
    repeat: null,
  },
  {
    text: 'Os avaliadores aplicam o codebook às respostas. Se discordam, ajuste o codebook.',
    repeat: 'Repete até concordarem',
  },
  {
    text: 'O codebook entra no prompt. Se as respostas não estão boas, ajuste o prompt.',
    repeat: 'Repete até ficarem boas',
  },
  {
    text: 'Com codebook e prompt congelados, itens e avaliadores novos confirmam o resultado.',
    repeat: null,
  },
]

const SAMPLE_GRADES = [
  { evaluator: 'Avaliador 1', level: 3, label: 'Alto' },
  { evaluator: 'Avaliador 2', level: 3, label: 'Alto' },
  { evaluator: 'Avaliador 3', level: 2, label: 'Médio' },
]

const CRITERION_LEVELS = [
  { level: 3, label: 'Alto', text: 'Dá para entender sem ler o código' },
  { level: 2, label: 'Médio', text: 'Entende com algum esforço' },
  { level: 1, label: 'Baixo', text: 'Não dá para entender' },
]

export function ProcessOverview({
  action,
  titleAs: Title = 'h1',
}: {
  action?: ReactNode
  titleAs?: 'h1' | 'h2'
}) {
  return (
    <div className="@container text-sm leading-[1.55] text-ink">
      <div className="grid items-center gap-7 @xl:grid-cols-[1.1fr_1fr] @xl:gap-10">
        <div>
          <Title className="m-0 mb-3 text-[26px] leading-[1.2] font-extrabold tracking-[-0.01em] text-ink @xl:text-[32px]">
            Crie e valide prompts com avaliadores humanos
          </Title>
          <p className={cx('m-0 text-base text-label @xl:text-[17px]', action ? 'mb-[22px]' : null)}>
            Esta ferramenta implementa o processo proposto por Shah (2025) em{' '}
            <em>From Prompt Engineering to Prompt Science</em>.
          </p>
          {action ? <div>{action}</div> : null}
        </div>
        <SampleScreen />
      </div>
      <ProcessGuide />
    </div>
  )
}

export function CollapsedProcessOverview() {
  return (
    <Disclosure
      className="border-t border-line pt-6"
      summary="Como funciona o processo"
      summaryClassName="text-sm font-semibold text-ink-soft"
    >
      <div className="@container text-sm leading-[1.55] text-ink [&>h2:first-child]:mt-6">
        <ProcessGuide />
      </div>
    </Disclosure>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-10 mb-4 text-center text-[13px] font-semibold text-muted @xl:mt-[52px]">
      {children}
    </h2>
  )
}

function Levels({ filled }: { filled: number }) {
  return (
    <span className="flex gap-[3px]" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cx('h-2 w-[18px] rounded-[2px]', n <= filled ? 'bg-brand' : 'bg-line')}
        />
      ))}
    </span>
  )
}

function RepeatIcon() {
  return (
    <svg
      className="h-[13px] w-[13px] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  )
}

function SampleScreen() {
  return (
    <div
      className="rounded-card border border-line bg-surface px-[18px] py-4 shadow-[0_8px_24px_rgba(17,24,39,0.08)]"
      aria-hidden="true"
    >
      <div className="mb-2.5 flex justify-between text-xs text-muted">
        <span>Resposta 3 de 10</span>
        <span>Clareza</span>
      </div>
      <div className="mb-2.5 grid gap-1.5 border-b border-line pb-3.5">
        {['w-[92%]', 'w-[78%]', 'w-[60%]'].map((width) => (
          <span key={width} className={cx('block h-[7px] rounded bg-line', width)} />
        ))}
      </div>
      {SAMPLE_GRADES.map((grade) => (
        <div
          key={grade.evaluator}
          className="grid grid-cols-[1fr_auto_48px] items-center gap-2.5 py-1 text-[13px]"
        >
          <span>{grade.evaluator}</span>
          <Levels filled={grade.level} />
          <span className="text-right text-label">{grade.label}</span>
        </div>
      ))}
      <div className="mt-2.5 grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border-t border-line pt-2.5 text-[13px]">
        <span>Concordância na rodada</span>
        <span className="h-1.5 overflow-hidden rounded-[3px] bg-line">
          <span className="block h-full w-[82%] bg-brand" />
        </span>
        <b>82%</b>
      </div>
    </div>
  )
}

function ProcessGuide() {
  return (
    <>
      <SectionHeading>O codebook</SectionHeading>
      <p className="mx-auto mt-0 mb-[18px] max-w-[520px] text-center text-muted">
        O documento que a LLM e os avaliadores seguem. Tem duas partes; no exemplo, para
        gerar mensagens de commit:
      </p>
      <div className="grid gap-4 @xl:grid-cols-2">
        <div className="rounded-card border border-line px-[18px] py-4">
          <div className="mb-3">
            <b className="block text-[15px]">Definições</b>
            <span className="text-[13px] text-muted">O que a LLM deve produzir</span>
          </div>
          {[
            ['Título', 'Resume a mudança em uma linha'],
            ['Corpo', 'Explica por que a mudança foi feita'],
          ].map(([name, text]) => (
            <div
              key={name}
              className="mt-1.5 grid grid-cols-[56px_1fr] gap-2.5 rounded-lg bg-canvas px-2.5 py-2 text-[13px]"
            >
              <b>{name}</b>
              <span className="text-label">{text}</span>
            </div>
          ))}
        </div>
        <div className="rounded-card border border-line px-[18px] py-4">
          <div className="mb-3">
            <b className="block text-[15px]">Critérios</b>
            <span className="text-[13px] text-muted">
              Como os avaliadores julgam cada resposta
            </span>
          </div>
          <div className="mb-1 text-[13px] font-semibold">Clareza</div>
          {CRITERION_LEVELS.map((level) => (
            <div
              key={level.label}
              className="grid grid-cols-[auto_52px_1fr] items-center gap-2.5 py-1 text-[13px]"
            >
              <Levels filled={level.level} />
              <b className="font-medium">{level.label}</b>
              <span className="text-label">{level.text}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3.5 mb-0 text-center text-[13px] text-muted">
        Se os avaliadores discordam, alguma definição ou critério está ambíguo e o codebook
        precisa ser ajustado.
      </p>

      <SectionHeading>Em quatro fases</SectionHeading>
      <ol className="m-0 grid list-none gap-3 p-0 @xl:grid-cols-4">
        {PROJECT_PHASES.map((phase, i) => {
          const step = PHASE_STEPS[i]
          return (
            <li
              key={phase.name}
              className={cx(
                'flex flex-col gap-1 rounded-card border p-4',
                step.repeat ? 'border-transparent bg-brand-tint' : 'border-line',
              )}
            >
              <span className="mb-1.5 grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-brand bg-surface text-[13px] font-bold text-brand">
                {i + 1}
              </span>
              <b className="text-sm">{phase.name}</b>
              <span className="text-[13px] text-label">{step.text}</span>
              {step.repeat ? (
                <span className="mt-auto flex items-center gap-1.5 pt-2 text-xs text-brand">
                  <RepeatIcon />
                  {step.repeat}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>

      <p className="mt-12 mb-0 text-center text-xs text-muted">
        Shah, C. (2025). From Prompt Engineering to Prompt Science with Humans in the Loop.{' '}
        <em>Communications of the ACM</em>, 68(6), 54–61.
      </p>
    </>
  )
}
