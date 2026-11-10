# Critério por resposta

## Decisão

Além dos critérios específicos (de uma definição) e dos gerais (que valem para todas as definições), existe um terceiro tipo, o critério por resposta. Ele recebe uma única nota por resposta, sem definição associada, e forma uma única unidade de análise.

## Por quê

No começo, todo critério era julgado dentro de uma definição. A prova de conceito mostrou um caso que não cabia nisso. Na reprodução do LLMAuditor, a diversidade é uma propriedade do conjunto das cinco variações de uma pergunta, e nenhuma variação sozinha é mais ou menos diversa.

Havia duas saídas sem mudar o modelo, e as duas eram ruins:

- Tratar cada variação como um critério. Isso inverte os papéis do codebook: as variações são o que o modelo gera, ou seja, definições, e não regras para julgar a resposta.
- Criar uma definição artificial, algo como "Conjunto", só para pendurar a diversidade. Essa definição seria enviada ao modelo como mais um item a gerar.

## Onde está no código

- [`app/projects/[id]/pipeline/criteria.ts`](<../app/projects/[id]/pipeline/criteria.ts>): o tipo `Scope` (`specific`, `general`, `per_response`) e as funções que separam cada tipo.
- [`lib/db/schema.ts`](../lib/db/schema.ts): a coluna `scope` em `codebook_criteria`, com a restrição `cc_scope_definition` (só o critério específico tem definição). Em `scores`, a coluna gerada `per_response` e a chave estrangeira composta `scores_criterion_scope_fkey` garantem que a nota de um critério por resposta não tenha definição, e que a dos outros tipos tenha.
- [`app/projects/[id]/pipeline/llm-input.ts`](<../app/projects/[id]/pipeline/llm-input.ts>): na Fase 3, os critérios por resposta vão ao modelo uma vez só, num bloco próprio depois dos critérios gerais.

## Testes

- [`lib/db/criterion-scope.int.test.ts`](../lib/db/criterion-scope.int.test.ts): o banco recusa critério por resposta com definição, nota com definição nesse critério e uma segunda nota no mesmo critério para a mesma avaliação. O tipo do critério também não pode mudar depois que já existe nota nele.
- [`evaluate/actions.int.test.ts`](<../app/projects/[id]/(tabs)/evaluate/actions.int.test.ts>), bloco "o critério por resposta": o envio completo grava a nota de diversidade sem definição, e o envio sem ela é recusado.
- [`llm-input.unit.test.ts`](<../app/projects/[id]/pipeline/llm-input.unit.test.ts>), bloco "composeLlmInput com critério por resposta": o texto enviado na prova de conceito é reproduzido byte a byte.
