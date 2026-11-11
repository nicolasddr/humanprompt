# Avaliação

A tela do avaliador fica em `/projects/<id>/evaluate`, e os módulos em `app/projects/[id]/(tabs)/evaluate/`.

## Quem chega à tela

`requireEvaluator` (em `evaluate/access.ts`) exige uma participação de avaliador ativa no projeto. Quem está com o onboarding pendente é levado para ele. Quem não é avaliador recebe "não encontrado".

Se ainda não há o que avaliar, a tela explica por quê (`waitingState` em `evaluate/waiting.ts`):

- o administrador ainda está montando o codebook;
- o codebook está pronto, mas não há rodada aberta;
- a rodada está aberta, mas ainda não tem respostas geradas.

## O que o avaliador vê

Para cada resposta, a tela mostra:

- o texto da resposta da LLM;
- o item de entrada que gerou a resposta e o texto do prompt usado, em painéis de contexto (`evaluate/context.ts`);
- o codebook da versão fixada pela rodada, com as descrições das definições, dos critérios e de cada nível da escala;
- um campo de nota e um campo de justificativa para cada célula;
- a barra de progresso ("3 de 12 respostas avaliadas por você nesta rodada") e a navegação pela fila.

O avaliador não vê o texto exato que foi enviado à LLM (`sent_input`). Esse texto aparece só para o administrador.

## A fila embaralhada

Cada avaliador percorre as respostas da rodada numa ordem própria. Se todos avaliassem na mesma sequência, efeitos de ordem e de cansaço seriam iguais para todos, e as notas poderiam convergir por isso, inflando a concordância sem que o codebook tivesse melhorado.

A ordem é calculada em `evaluate/shuffle.ts` e `evaluate/queue.ts`:

1. Para cada resposta, `orderKey` calcula um número a partir do texto `participação:rodada:resposta`, com o hash FNV-1a de 32 bits seguido de uma etapa de mistura de bits.
2. `buildQueue` ordena as respostas por esse número.

A ordem é determinística: o mesmo avaliador, na mesma rodada, encontra sempre a mesma fila, mesmo que feche a página e volte no dia seguinte. Como cada resposta tem sua própria chave, uma resposta gerada depois entra em algum ponto da fila sem mudar a ordem relativa das que já estavam lá. Isso não aconteceria se a lista inteira fosse embaralhada a partir de uma semente.

O rótulo de cada resposta ("Resposta 3") vem da posição dela na ordem de criação da rodada, e não da posição na fila. Assim, "Resposta 3" é a mesma resposta para todos, o que importa na discussão das divergências.

A chave usa o id da participação de avaliador, e não o id do usuário. Um administrador que também avalia tem a fila ligada ao papel de avaliador.

A decisão está registrada em `docs/ordem-embaralhada-por-avaliador.md`.

## Navegação

`neighbours` devolve a resposta anterior e a seguinte na fila do avaliador. `nextPendingId` procura a próxima resposta ainda não avaliada, dando a volta no fim da fila se preciso. Depois de um envio, o avaliador é levado direto para ela. `pickResponseId` escolhe qual resposta abrir quando a URL não indica uma: a primeira pendente da fila, ou a primeira de todas se não houver pendente.

A resposta aberta fica no parâmetro `?response=` da URL. Isso faz o estado sobreviver a uma revalidação da página e permite voltar a uma resposta específica pelo histórico do navegador.

## Envio

A Server Action `submitEvaluation` (`evaluate/actions.ts`) é a única forma de gravar uma avaliação. Ela faz, numa transação:

1. confere que a resposta pertence ao projeto e que a rodada está aberta;
2. confere que essa participação ainda não avaliou essa resposta;
3. carrega a versão do codebook que a rodada fixou e monta as células com `resolveCells`;
4. lê a nota e a justificativa de cada célula no formulário;
5. recusa justificativa com mais de 2000 caracteres e nota fora da escala;
6. recusa se alguma célula ficou sem nota (`definitionsIncomplete` e `perResponseIncomplete`), com uma mensagem que diz quais definições e quais critérios por resposta faltam;
7. grava a avaliação e todas as notas de uma vez;
8. calcula a próxima resposta pendente da fila.

Todas as células são obrigatórias. A justificativa é opcional.

Se o mesmo envio chegar duas vezes, a restrição única `ev_unique_response_member` barra o segundo, e a action responde que a avaliação já foi enviada.

## Avaliação imutável

Não existe action para editar ou reenviar uma avaliação. Depois de enviada, a resposta aparece no modo de leitura, com as notas dadas.

O motivo está em `docs/avaliacao-imutavel.md`. Depois da rodada, o grupo discute as divergências. Se o avaliador pudesse corrigir as notas depois dessa conversa, a concordância da rodada mediria o resultado da discussão, e não a clareza do codebook. O que muda depois da discussão é o codebook, e a próxima rodada mede o efeito disso.

A avaliação também pertence à participação, e não ao usuário. Desativar o avaliador mantém a avaliação, e o banco não deixa apagar a participação enquanto houver avaliação ligada a ela.

## A escala

A escala tem três pontos, Alto, Médio e Baixo, gravados como `high`, `medium` e `low` (`evaluate/scale.ts`). Para o cálculo, `scaleRank` os transforma em 3, 2 e 1. A escala é a mesma em todos os projetos.

Três coisas dependem dela: a distância ordinal do alfa é calculada sobre esses pontos; comparar rodadas só faz sentido se a escala não mudou; e a separação entre divergência adjacente (um ponto) e extrema (dois pontos) pressupõe exatamente três pontos. O registro está em `docs/escala-fixa-de-tres-pontos.md`.

## Testes

- `evaluate/actions.int.test.ts`: envio completo, segundo envio recusado, rodada fechada, nota fora da escala, célula sem nota, critério por resposta e o redirecionamento para a próxima resposta da fila.
- `evaluate/queue.unit.test.ts` e `shuffle.unit.test.ts`: estabilidade da ordem, ordens diferentes para avaliadores diferentes, resposta nova sem embaralhar as antigas e rótulo comum.
- `evaluate/completeness.unit.test.ts`: quais células faltam e o texto da mensagem.
- `evaluate/waiting.unit.test.ts`: os três estados de espera.
- `evaluate/page.int.test.ts` e `access.int.test.ts`: quem consegue abrir a tela.
