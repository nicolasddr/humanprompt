# Registro do perfil do avaliador

## Decisão

Ao entrar num projeto, o avaliador aceita um termo de consentimento e responde a um questionário de perfil. As perguntas são definidas pelo administrador para cada projeto e podem ser abertas ou de múltipla escolha. As respostas ficam ligadas à participação no projeto e só o administrador as vê.

## Por quê

Shah (2025) pede que o processo seja documentado, e saber quem avaliou faz parte do que permite interpretar e repetir uma rodada.

O perfil também ajuda a ler as medidas. Diferenças de formação ou de familiaridade com a tarefa podem explicar uma divergência sistemática antes de o administrador marcar alguém como outlier. Na Fase 4, permite verificar se os novos avaliadores diferem do grupo que construiu o codebook.

As perguntas são por projeto porque a experiência que importa muda de uma tarefa para outra. O questionário foi uma das sugestões do especialista que avaliou o protótipo.

## Onde está no código

- [`lib/db/schema.ts`](../lib/db/schema.ts): `onboarding_questions` guarda as perguntas de cada projeto e `onboarding_responses` guarda as respostas ligadas à participação. Em `project_members`, `consent_accepted_at` e `consent_text_snapshot` registram quando o termo foi aceito e o texto exato que foi aceito. A restrição `pm_consent_required` impede que um avaliador fique ativo sem consentimento registrado.
- [`app/projects/[id]/(tabs)/questions/actions.ts`](<../app/projects/[id]/(tabs)/questions/actions.ts>): o administrador cria, edita e remove perguntas.
- [`app/onboarding/actions.ts`](../app/onboarding/actions.ts): `completeOnboarding` recusa a entrada sem o consentimento, grava as respostas e ativa a participação.
- [`app/projects/[id]/(tabs)/profile-answers/[userId]/page.tsx`](<../app/projects/[id]/(tabs)/profile-answers/[userId]/page.tsx>): a página em que o administrador lê as respostas de um avaliador.

O texto do termo é guardado junto com o aceite. Se o termo mudar depois, continua registrado o que cada pessoa aceitou.

## Testes

- [`app/onboarding/actions.int.test.ts`](../app/onboarding/actions.int.test.ts): o membro pendente conclui a entrada e as respostas são gravadas. Um avaliador desativado e convidado de novo refaz o questionário e as respostas novas substituem as antigas.
- [`profile-answers/[userId]/page.int.test.ts`](<../app/projects/[id]/(tabs)/profile-answers/[userId]/page.int.test.ts>): um avaliador não vê as respostas de outro, e o administrador vê.
