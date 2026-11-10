# Avaliação imutável

## Decisão

Depois de enviada, uma avaliação não pode ser editada nem reenviada. As versões do codebook e do prompt seguem a mesma ideia: uma versão pode ser ajustada enquanto nenhuma rodada a usou, mas, a partir do momento em que é usada, fica congelada, e qualquer mudança cria a versão seguinte.

A avaliação pertence à participação da pessoa no projeto, e não à conta dela na ferramenta. Remover um avaliador desativa a participação e mantém as avaliações.

## Por quê

Se o avaliador pudesse corrigir as notas depois da discussão das divergências, a concordância da rodada mediria o resultado da conversa, e não a clareza do codebook. O mesmo vale para as versões: uma rodada só pode ser interpretada se o codebook e o prompt que ela usou continuarem existindo do jeito que eram.

Ligar a avaliação à participação permite tirar alguém do projeto sem apagar os dados que já entraram no cálculo.

## Onde está no código

- [`app/projects/[id]/(tabs)/evaluate/actions.ts`](<../app/projects/[id]/(tabs)/evaluate/actions.ts>): `submitEvaluation` é a única escrita de avaliação e só insere. Não há ação de editar.
- [`lib/db/schema.ts`](../lib/db/schema.ts): a restrição `ev_unique_response_member` impede uma segunda avaliação da mesma resposta pela mesma participação. A chave estrangeira de `evaluations` para `project_members` é `restrict`, então a participação não pode ser apagada enquanto houver avaliação.
- [`app/projects/actions.ts`](../app/projects/actions.ts): `deactivateMember` muda o status da participação para `inactive` em vez de apagar a linha.
- [`lib/versioning.ts`](../lib/versioning.ts): `isVersionOpen` diz se uma versão ainda pode ser editada (nunca usada e a mais recente) e `decideSave` decide entre atualizar a versão aberta e criar a seguinte.

## Testes

- [`evaluate/actions.int.test.ts`](<../app/projects/[id]/(tabs)/evaluate/actions.int.test.ts>): o segundo envio da mesma resposta pela mesma participação é recusado, e o primeiro fica intacto.
- [`lib/db/evaluations.int.test.ts`](../lib/db/evaluations.int.test.ts): desativar a participação não apaga a avaliação, e apagar a participação é recusado enquanto houver avaliação.
- [`lib/versioning.unit.test.ts`](../lib/versioning.unit.test.ts): a versão congela assim que é usada, e salvar sobre uma versão congelada cria a seguinte.
