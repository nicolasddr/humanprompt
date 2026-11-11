# Rodadas e geração de respostas

Os arquivos ficam em `app/projects/[id]/(tabs)/rounds/`. As actions de abrir, fechar e gerar estão em `actions.ts`, e as regras em `preconditions.ts`.

## Abrir uma rodada

A action `createRound` só aceita administrador ativo. Dentro de uma transação, ela trava a linha do projeto e confere os bloqueios de `roundBlockers`:

| Bloqueio | Quando acontece |
|---|---|
| `phase` | O projeto ainda está na Fase 1 |
| `open_round` | Já existe uma rodada aberta no projeto |
| `definition` | O codebook não tem nenhuma definição |
| `criteria` | Alguma definição está sem critério (e não há critério geral) |
| `prompt` | Não existe versão do prompt |
| `no_reference_round` | Na Fase 4, não há rodada fechada da Fase 3 |
| `versions_changed` | Na Fase 4, as versões vigentes diferem das da rodada de referência |

Sem bloqueio, a action:

1. calcula o próximo número de rodada do projeto;
2. grava a rodada como aberta, com a fase atual do projeto e as versões vigentes de codebook e prompt;
3. marca essas duas versões como usadas, o que as congela.

Se dois administradores abrirem rodada ao mesmo tempo, o índice único `rd_one_open_per_project` deixa só uma passar, e a outra recebe uma mensagem pedindo para recarregar.

A tela mostra o mesmo conjunto de bloqueios antes de o administrador clicar, com um resumo e uma ajuda para cada um (`roundBlockerSummary` e `roundBlockerHelp`).

## Gerar respostas

Com a rodada aberta, o administrador escolhe de 1 a 10 itens de entrada por vez e pede a geração (`generateResponses`). A escolha passa por `selectionBlockers`, que recusa:

- seleção vazia ou com mais de 10 itens;
- mais itens do que o teto de respostas do projeto ainda permite;
- o mesmo item duas vezes;
- item que não é do projeto;
- item que já gerou resposta nesta rodada.

Depois disso, para cada item, em sequência:

1. monta a entrada com `composeLlmInput`, usando a fase gravada na rodada e as versões que ela fixou (não as vigentes);
2. chama `askLlm`;
3. grava a resposta numa transação curta, junto com o texto enviado, o modelo pedido, a versão informada pelo provedor e as versões de prompt e codebook;
4. marca o item como usado;
5. conta a resposta no teto do projeto.

A chamada à LLM fica fora da transação, para não manter uma transação do banco aberta durante até 60 segundos de espera.

### Falha parcial

A geração não é tudo ou nada. Cada item que falha vai para uma lista de falhas com o motivo, e os outros seguem. Os motivos possíveis são os seis tipos de erro do provedor (ver [arquitetura.md](arquitetura.md)) e mais:

- `blank`: a LLM devolveu texto vazio;
- `too_long`: a resposta passou de 50 mil caracteres;
- `duplicate`: outra geração simultânea já criou a resposta desse item nesta rodada;
- `ceiling`: o teto de respostas do projeto acabou no meio do lote.

A tela mostra quantas respostas foram criadas e, para cada falha, o item e uma mensagem que diz o que fazer.

### Teto de respostas

`lib/ai/quota.ts` guarda, por projeto, quantas chamadas à LLM já foram feitas. O padrão é 200 por projeto, ajustável por `LLM_PROJECT_RESPONSES_MAX`. A tela de rodadas mostra quantas restam. O teto vale também para o teste do prompt.

### Resposta colada

A tabela `responses` tem uma coluna `source`, que aceita `generated` ou `pasted`. Só a geração pela LLM está implementada. O valor `pasted` foi previsto para o caso de o administrador trazer respostas geradas fora da ferramenta, mas nenhuma tela usa.

## Durante a rodada

O cartão da rodada aberta (`open-round-card.tsx`) mostra:

- a fase da rodada e o que a LLM recebe nela (`roundInputSummary`);
- as versões de codebook e prompt fixadas;
- as respostas geradas;
- o progresso de cada avaliador ativo, com quantas respostas já avaliou, e a lista de quem ainda não terminou.

Enquanto a rodada está aberta, o codebook fica só para leitura. O prompt pode ser editado, mas a edição cria a versão seguinte e não afeta a rodada.

## Fechar a rodada

`closeRound` muda o status para `closed` e grava `closed_at`. Fechar é irreversível: a rodada deixa de aceitar respostas e avaliações e não pode ser reaberta. A janela de confirmação lembra que fechar não espera quem ainda não terminou.

Depois de fechada, a rodada continua visível com tudo o que produziu. Fora da Fase 4, o codebook volta a ser editável e a primeira alteração cria a versão seguinte.

## Lista de rodadas

A aba mostra as rodadas do projeto agrupadas por fase (`round-list.tsx`), com atalhos para a revisão e, para o administrador, para a página de concordância de cada uma. Na Fase 4 aparece também a comparação com a rodada de referência. As séries de concordância e de Qualidade ao longo das rodadas ficam na visão geral do projeto (ver [concordancia-qualidade-e-revisao.md](concordancia-qualidade-e-revisao.md)). O avaliador vê só as rodadas em que avaliou (`evaluator-rounds.tsx`).

## Rodada de referência

`rounds/reference-round.ts` concentra o conceito de rodada de referência, que aparece em três lugares:

- na passagem da Fase 3 para a 4, que exige versões iguais às da referência;
- na abertura de rodada na Fase 4, com a mesma exigência;
- na leitura das rodadas da Fase 4, que são comparadas com a referência.

`referenceRoundOf(rounds, round)` devolve a última rodada fechada da Fase 3 anterior à rodada dada. `projectReferenceRound(rounds)` devolve a última rodada fechada da Fase 3 do projeto. `versionChanges` compara os números de versão e diz se mudou o codebook, o prompt ou os dois.

## Testes

- `rounds/actions.int.test.ts`: abrir, fechar, bloqueios, disputa entre dois administradores.
- `rounds/generate-responses.int.test.ts`: geração com a LLM simulada, falha parcial, teto, item repetido, rodada fechada e a gravação da entrada enviada.
- `rounds/preconditions.unit.test.ts`: cada bloqueio e cada mensagem.
- `rounds/reference-round.unit.test.ts`: escolha da rodada de referência e comparação de versões.
- `rounds/phase-4-round.int.test.ts`: abertura de rodada na Fase 4.
- `lib/ai/ask-llm.unit.test.ts`, `lib/ai/failure.unit.test.ts` e `lib/ai/quota.unit.test.ts`: a chamada à OpenAI com `fetch` simulado, a classificação de erros e o teto.
