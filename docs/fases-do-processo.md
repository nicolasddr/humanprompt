# Fases do processo

A fase atual do projeto fica na coluna `projects.phase`, com valor de 1 a 4. Cada rodada grava em `rounds.phase` a fase em que foi aberta, e é essa coluna que decide o que a LLM recebe e quais medidas aparecem para aquela rodada. Assim, voltar da Fase 4 para a 3 não muda a leitura das rodadas antigas.

As regras de avanço e retorno estão em `app/projects/[id]/pipeline/preconditions.ts`, e as actions `advancePhase` e `returnToPhase3` estão em `app/projects/[id]/pipeline/actions.ts`. As duas leem a linha do projeto com `for update` dentro da transação, para que dois cliques simultâneos não avancem duas fases.

## Princípio geral

A decisão de avançar é sempre do administrador. A ferramenta só impede o avanço por motivos estruturais, quando avançar deixaria o processo num estado sem sentido. Nenhum valor de alfa ou de Qualidade libera ou bloqueia o avanço. As faixas de referência do alfa aparecem na tela como apoio à leitura, e quem decide se o resultado basta é quem conduz o processo.

Antes de cada avanço, uma janela de confirmação explica o que muda na fase seguinte e lembra que cancelar não altera nada. Os textos dessas janelas estão nas funções `phase2ConfirmationLines`, `phase3ConfirmationLines`, `phase4ConfirmationLines` e `returnConfirmationLines`.

## Fase 1 para Fase 2

Exige três coisas (`PIPELINE_REQUIREMENTS`):

- ao menos uma definição no codebook;
- o texto do prompt;
- ao menos um item de entrada.

Na Fase 1 não existem rodadas. A aba de rodadas aparece bloqueada e as páginas de revisão respondem "não encontrado".

## Fase 2 para Fase 3

Exige (`phase2Blockers`):

- nenhuma rodada aberta, para não deixar para trás um ciclo que nunca termina;
- ao menos uma rodada fechada na Fase 2, para que a Fase 3 comece de um codebook que foi aplicado do começo ao fim pelo menos uma vez.

Não existe volta da Fase 3 para a Fase 2.

## Fase 3 para Fase 4

Exige (`phase3Blockers`):

- nenhuma rodada aberta;
- ao menos uma rodada fechada na Fase 3 (as da Fase 2 não contam);
- que o codebook e o prompt vigentes sejam as mesmas versões usadas na **rodada de referência**.

A rodada de referência é a última rodada fechada da Fase 3 (`projectReferenceRound` em `rounds/reference-round.ts`). A terceira exigência impede que o administrador ajuste o codebook ou o prompt depois da última rodada e leve para a Fase 4 uma versão que nenhum avaliador aplicou. Se houve mudança, a mensagem diz quais versões a referência usou e quais são as vigentes, e pede uma nova rodada da Fase 3 com as versões atuais.

## Fase 4: congelamento

Na Fase 4, o codebook e o texto do prompt ficam congelados (`isFrozen` em `pipeline/freeze.ts`). As actions de salvar recusam a operação e as telas mostram um aviso com um atalho para voltar à Fase 3. Continuam editáveis os metadados do prompt (nome, descrição e registro de mudanças) e os itens de entrada, porque a Fase 4 pede itens novos.

Abrir uma rodada na Fase 4 tem duas exigências a mais (`roundBlockers`):

- precisa existir uma rodada de referência;
- as versões vigentes precisam ser as da rodada de referência.

A ferramenta não recusa item que já foi usado nem avaliador que já avaliou antes. A Fase 4 pede itens e avaliadores novos para testar se o codebook generaliza, mas quais são novos é decisão do administrador. A tabela de itens mostra em que rodadas cada item foi usado para ajudar nessa escolha.

Nas rodadas da Fase 4, a página de concordância compara os resultados com os da rodada de referência, lado a lado (ver [concordancia-qualidade-e-revisao.md](concordancia-qualidade-e-revisao.md)).

## Volta da Fase 4 para a Fase 3

É o único retorno previsto. Exige apenas que não haja rodada aberta (`returnBlockers`).

Ao voltar:

- as rodadas da Fase 4 ficam como histórico, com notas, medidas, marcas de outlier e anotações;
- codebook e prompt voltam a ser editáveis, e a próxima edição cria versões novas, sem mexer nas que as rodadas usaram;
- para avançar de novo à Fase 4, valem outra vez as três exigências da passagem da Fase 3 para a 4.

## Mensagens de bloqueio

Cada função de bloqueio devolve uma lista de motivos. As mensagens são montadas a partir dessa lista e explicam o motivo e a saída. Quando há dois bloqueios que uma única ação resolve (por exemplo, uma rodada aberta e nenhuma rodada fechada, que se resolvem fechando a rodada), a mensagem diz isso.

Se o projeto mudou de fase enquanto a página estava aberta, a action responde que o projeto está em outra fase e pede para recarregar, em vez de aplicar a regra errada.

## Testes

- `pipeline/preconditions.unit.test.ts` cobre cada bloqueio e cada mensagem.
- `pipeline/advance-phase-2.int.test.ts` e `advance-phase-3.int.test.ts` avançam projetos reais no banco local.
- `pipeline/phase-4-freeze.int.test.ts` confirma que codebook e prompt não podem ser salvos na Fase 4, e que os metadados e os itens podem.
- `pipeline/return-phase-3.int.test.ts` e `(tabs)/phase-4-return.int.test.ts` cobrem o retorno.
- `(tabs)/phase.int.test.ts` confere o que cada tela mostra em cada fase.
