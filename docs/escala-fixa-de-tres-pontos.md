# Escala fixa de três pontos

## Decisão

Toda nota é Alto, Médio ou Baixo. A escala é a mesma em todos os projetos e o administrador não pode mudá-la. Cada critério pode ter uma descrição do que vale cada nota, mas essa descrição é só para o avaliador. A escala nunca vai para o modelo.

## Por quê

Três coisas dependem da escala. A distância ordinal do alfa é calculada sobre os pontos da escala. A comparação entre rodadas só faz sentido se a escala não mudou entre elas. E a separação entre divergência adjacente (um ponto de distância) e extrema (dois pontos) pressupõe exatamente três pontos.

A escala fica fora do texto enviado ao modelo porque o modelo gera as respostas, mas quem as avalia são os avaliadores.

O custo dessa escolha, a perda de resolução em tarefas que pediriam mais pontos, está discutido na conclusão do TCC.

## Onde está no código

- [`app/projects/[id]/(tabs)/evaluate/scale.ts`](<../app/projects/[id]/(tabs)/evaluate/scale.ts>): define `SCALE` (`high`, `medium`, `low`), o rótulo em português de cada valor e o número usado no cálculo (3 para Alto, 2 para Médio e 1 para Baixo).
- [`lib/db/schema.ts`](../lib/db/schema.ts): a restrição `sc_value_check` na tabela `scores` recusa qualquer valor fora dos três. Não existe coluna de escala em `projects`, então não há como configurá-la por projeto.
- [`app/projects/[id]/pipeline/llm-input.ts`](<../app/projects/[id]/pipeline/llm-input.ts>): monta o texto enviado ao modelo. A descrição dos níveis de cada critério não entra nele.

## Testes

- [`scale.unit.test.ts`](<../app/projects/[id]/(tabs)/evaluate/scale.unit.test.ts>): a escala tem três valores e cada um é convertido num número diferente, em ordem crescente de Baixo para Alto.
- [`lib/db/evaluations.int.test.ts`](../lib/db/evaluations.int.test.ts): o banco recusa valor fora da escala.
- [`evaluate/actions.int.test.ts`](<../app/projects/[id]/(tabs)/evaluate/actions.int.test.ts>): o envio de avaliação com valor fora da escala é recusado e nada é gravado.
- [`llm-input.unit.test.ts`](<../app/projects/[id]/pipeline/llm-input.unit.test.ts>): no bloco "nunca envia o tipo da definição nem a escala", a descrição dos níveis fica de fora e o texto enviado não muda.
