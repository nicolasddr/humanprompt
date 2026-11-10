# Ordem embaralhada por avaliador

## Decisão

Cada avaliador percorre as respostas de uma rodada numa ordem própria. A ordem é embaralhada de forma determinística: para cada resposta, a ferramenta calcula uma chave a partir do avaliador, da rodada e da resposta, e ordena pelas chaves. O rótulo de cada resposta ("Resposta 3", por exemplo) é o mesmo para todos.

## Por quê

Se todos avaliassem na mesma sequência, os efeitos de ordem e de fadiga seriam os mesmos para todos. Os julgamentos poderiam convergir por esse motivo, e o alfa subiria sem que o codebook tivesse melhorado.

A ordem precisa ser estável. Um avaliador que fecha a página e volta deve encontrar a mesma fila, por isso a chave é calculada a partir dos identificadores em vez de sorteada. Como cada resposta tem a sua própria chave, acrescentar uma resposta nova à rodada não mexe na posição relativa das que já estavam lá, o que não aconteceria se a lista inteira fosse embaralhada a partir de uma semente.

O rótulo é comum para que, na discussão das divergências, "Resposta 3" signifique a mesma coisa para todos.

## Onde está no código

- [`app/projects/[id]/(tabs)/evaluate/shuffle.ts`](<../app/projects/[id]/(tabs)/evaluate/shuffle.ts>): `orderKey` gera a chave a partir de `participação:rodada:resposta`, com um hash FNV-1a de 32 bits seguido de uma etapa de mistura dos bits.
- [`app/projects/[id]/(tabs)/evaluate/queue.ts`](<../app/projects/[id]/(tabs)/evaluate/queue.ts>): `buildQueue` ordena as respostas pela chave e dá a cada uma o rótulo da sua posição na ordem original da rodada. A posição na fila não altera o rótulo. `nextPendingId` e `neighbours` fazem a navegação seguir a fila do próprio avaliador.

A chave usa o identificador da participação no projeto. Assim, uma pessoa que é administradora e avaliadora no mesmo projeto tem a sua fila ligada ao papel de avaliadora.

## Testes

- [`shuffle.unit.test.ts`](<../app/projects/[id]/(tabs)/evaluate/shuffle.unit.test.ts>): a mesma entrada dá sempre a mesma chave, a chave muda com o avaliador e com a rodada, e num lote realista de respostas nenhuma chave colide.
- [`queue.unit.test.ts`](<../app/projects/[id]/(tabs)/evaluate/queue.unit.test.ts>): dois avaliadores recebem ordens diferentes sobre as mesmas respostas, acrescentar uma resposta não muda a posição relativa das anteriores e o rótulo de uma resposta é o mesmo para dois avaliadores.
- [`evaluate/actions.int.test.ts`](<../app/projects/[id]/(tabs)/evaluate/actions.int.test.ts>): depois de enviar uma avaliação, o avaliador vai para a próxima resposta da própria fila.
