# Concordância, Qualidade e revisão

Depois que uma rodada fecha, a ferramenta oferece três leituras:

- a **revisão**, em `/rounds/<roundId>`, para administrador e avaliadores, com as notas e justificativas de cada um, resposta por resposta;
- a **concordância**, em `/rounds/<roundId>/agreement`, só para o administrador, com o alfa, as divergências e, a partir da Fase 3, a Qualidade;
- as **séries**, na visão geral do projeto, só para o administrador, com a evolução das medidas ao longo das rodadas.

Os módulos ficam em `app/projects/[id]/(tabs)/rounds/` e o cálculo do alfa em `lib/agreement.ts`.

## Das notas às observações

`loadRoundObservations` (em `rounds/agreement.ts`) lê todas as notas de uma rodada e transforma cada uma numa observação:

- **unidade**: o par resposta e célula, ou seja, `resposta:definição:critério` (ou `resposta:per_response:critério` para um critério por resposta);
- **avaliador**: o id da participação;
- **valor**: 3 para Alto, 2 para Médio, 1 para Baixo.

Uma unidade é, portanto, uma pergunta concreta respondida pelos avaliadores: "nesta resposta, nesta definição, como fica este critério?".

## O alfa de Krippendorff ordinal

### Por que esse coeficiente

O número de avaliadores muda de uma rodada para outra, principalmente na Fase 4, e nem todos avaliam todas as respostas. O alfa de Krippendorff aceita as duas situações e trata como dado faltante a nota que não foi dada. Com a distância ordinal, uma divergência entre Alto e Baixo pesa mais que uma entre Alto e Médio. E, como o acaso é estimado a partir de todas as notas juntas, o alfa mede a confiabilidade dos dados produzidos com o codebook, e não a concordância entre dois avaliadores específicos, como faria o kappa. O registro completo está em `docs/alfa-de-krippendorff-ordinal.md`.

### O cálculo

A implementação em `lib/agreement.ts` segue Krippendorff (2011) e não usa biblioteca externa. Os passos de `ordinalAlpha` são:

1. Agrupar as observações por unidade e descartar as unidades com menos de duas notas, porque nelas não há com quem comparar.
2. Montar a **matriz de coincidências** `o(c,k)`. Para cada unidade com `m` notas, cada par ordenado de notas em posições diferentes `(i, j)` soma `1 / (m − 1)` na célula `(valor_i, valor_j)`.
3. Calcular os totais marginais `n(c)`, que é a soma da linha `c` da matriz, e o total `n`.
4. Calcular a **distância ordinal** entre dois valores `c` e `k`:

   ```
   δ²(c,k) = ( soma de n(g) para g de c até k  −  (n(c) + n(k)) / 2 )²
   ```

   A distância depende de quantas notas caíram entre os dois valores, e não só da diferença numérica entre eles.
5. Calcular o alfa:

   ```
   α = 1 − (n − 1) · Σ o(c,k) · δ²(c,k)  /  Σ n(c) · n(k) · δ²(c,k)
   ```

   O numerador é a discordância observada e o denominador a discordância esperada se as notas fossem distribuídas ao acaso.

### Quando não dá para calcular

A função devolve "não calculável", com o motivo, em três casos:

- `few_evaluators`: menos de dois avaliadores enviaram nota;
- `no_shared_units`: nenhuma unidade tem duas notas;
- `no_variation`: todas as notas são iguais, e a discordância esperada é zero.

Nesses casos a tela mostra o motivo, e nunca 0 ou 1. Um alfa de 1 com todas as notas iguais seria enganoso, porque não houve como discordar.

### Verificação

O teste `lib/agreement.unit.test.ts` reproduz o exemplo publicado por Krippendorff (2011), com 4 observadores e 12 unidades, e obtém alfa ordinal de 0,815. Também confere o paradoxo da prevalência (80% de notas iguais com alfa negativo), o caso sem variação e a unidade com uma nota só, que sai do cálculo sem tirar o avaliador das outras unidades.

## O perfil de concordância

Ao lado do alfa, `agreementProfile` calcula, a partir da mesma matriz de coincidências:

- a proporção de **notas iguais** (a diagonal da matriz dividida por `n`);
- a proporção de **divergências adjacentes** (pares que diferem por um ponto);
- a proporção de **divergências extremas** (pares que vão de Alto a Baixo);
- a participação de cada ponto da escala no total de notas.

Essas proporções são de pares de notas dentro da mesma unidade. Elas aparecem numa barra (`divergence-bar.tsx`) com as três cores.

O perfil existe por causa do **paradoxo da prevalência**. Quando quase todas as notas caem no mesmo ponto da escala, a discordância esperada fica muito pequena e poucas divergências bastam para derrubar o alfa. Ver só o alfa levaria a concluir que o codebook é ambíguo quando, na verdade, as notas estão concentradas. A ferramenta mostra o aviso de **notas concentradas** quando o alfa fica abaixo de 0,667 e as notas iguais chegam a 80% ou mais (`isConcentrated` em `agreement-labels.ts`). Esse corte de 80% é convenção da ferramenta, e a tela diz isso.

## Onde o alfa é calculado

Não existe um alfa único da rodada. O cálculo é feito em dois recortes (`rounds/agreement-matrix.ts`):

**Por critério.** Cada critério vira uma coluna. Um critério geral reúne as notas dele em todas as definições. Critérios específicos com o mesmo nome em definições diferentes formam uma só coluna. Cada critério por resposta é uma coluna à parte. O alfa da coluna junta todas as unidades dela (`criterionAgreements`). É a leitura principal: diz em qual critério o codebook está mais ambíguo.

**Por célula.** A matriz cruza definições (linhas) e critérios (colunas), com um alfa em cada cruzamento (`agreementMatrix`). Serve para localizar o problema numa definição específica. Os cruzamentos que não existem no codebook aparecem como "não se aplica".

## Faixas de referência

`agreement-labels.ts` classifica o alfa em três faixas, seguindo as referências usuais de Krippendorff:

| Faixa | Valor |
|---|---|
| Questionável | abaixo de 0,667 |
| Aceitável | de 0,667 a 0,8 |
| Bom | 0,8 ou mais |

As faixas são leitura, e não regra: nenhuma delas libera ou trava o avanço de fase.

Quando a rodada tem menos de 3 avaliadores ou menos de 10 respostas avaliadas, o valor vem com o aviso de **amostra pequena**, porque o coeficiente oscila muito nessa situação. Também é um corte da ferramenta, e a tela diz isso.

## Divergências na revisão

`rounds/divergence.ts` classifica cada célula de cada resposta pelas notas recebidas:

| Classe | Situação |
|---|---|
| Sem nota | nenhum avaliador deu nota |
| 1 nota | só um avaliador deu nota, então não há com quem comparar |
| Unânime | todas as notas no mesmo ponto |
| Divergência adjacente | notas em pontos vizinhos (Alto e Médio, ou Médio e Baixo) |
| Divergência extrema | Alto e Baixo na mesma célula |

A tela sugere uma interpretação para cada caso. A divergência adjacente costuma indicar fronteira borrada entre os pontos da escala e pede um critério mais preciso. A extrema costuma indicar definição ambígua, porque duas pessoas leram coisas opostas no mesmo texto. No grupo do critério por resposta, que não tem definição, a extrema aponta para o próprio critério.

## Outliers

Quando as notas de um avaliador destoam sistematicamente das dos outros, o administrador pode marcá-lo como outlier numa rodada, pelo painel na aba de membros. As actions `markOutlier` e `unmarkOutlier` estão em `rounds/outlier-actions.ts`. As regras são:

- só administrador marca e desmarca;
- a justificativa escrita é obrigatória;
- só se marca quem enviou avaliação naquela rodada;
- a marca vale para uma rodada só;
- desmarcar preenche `removed_at` e `removed_by` e mantém a linha, então o histórico fica completo;
- nenhuma nota é apagada.

Com marcas ativas, as medidas da rodada aparecem em dois valores, com todos os avaliadores e sem os marcados (`excludedMemberIds` em `rounds/outliers.ts` e `withoutExcluded` em `rounds/agreement-pair.ts`). O valor com todos nunca muda, o que permite ver quanto a exclusão alterou o resultado.

Desativar um avaliador não o tira do cálculo. A marca de outlier é o único caminho, e ela exige motivo, autor e data. O registro está em `docs/marcacao-de-outlier.md`.

## Qualidade

A partir da Fase 3 (`hasQuality`), a página de concordância mostra também a Qualidade: a distribuição das notas entre Alto, Médio e Baixo, com contagem e proporção de cada ponto (`rounds/quality.ts`). Ela aparece por critério e por célula, nos mesmos recortes do alfa, e também em dois valores quando há outliers.

Na Fase 2, a LLM recebe só os títulos das definições, e as respostas ainda não refletem o codebook. Por isso a Qualidade só faz sentido a partir da Fase 3, quando o codebook completo vai para o modelo.

A Qualidade não tem meta nem veredito. A ferramenta mostra a distribuição e deixa a interpretação para o administrador. A ideia é que, com o alfa dentro da faixa, as notas são confiáveis, e então faz sentido olhar o que elas dizem sobre as respostas.

## Orientação de leitura

Nas Fases 3 e 4, a aba de rodadas mostra uma nota de orientação (`rounds/reading-guidance.ts`) baseada no critério de menor alfa da rodada (`weakestCriterion`):

- se algum critério não é calculável, a nota explica o motivo;
- se o critério mais fraco está abaixo de 0,667, a nota diz que o codebook ainda é ambíguo nesse critério e, na Fase 3, oferece um atalho para o codebook. Se as notas estão concentradas, acrescenta o aviso do paradoxo da prevalência;
- se todos estão dentro da faixa, a nota diz que as notas são confiáveis e, na Fase 3, oferece um atalho para a seção de Qualidade.

## Comparação com a referência na Fase 4

Para uma rodada da Fase 4, `referenceComparison` (em `rounds/reference-comparison.ts`) junta as medidas dela e as da rodada de referência, a última rodada fechada da Fase 3 antes dela. O painel mostra, lado a lado, o alfa de cada critério e a Qualidade das duas rodadas, para responder à pergunta da Fase 4: o resultado se mantém com itens e avaliadores novos?

## Séries ao longo das rodadas

Na visão geral do projeto, o administrador vê três séries que acompanham as rodadas do projeto, separadas por fase:

- o alfa de cada critério, num gráfico de linhas (`agreement-series.ts` e `agreement-series-chart.tsx`);
- as proporções de notas iguais, divergências adjacentes e extremas (`concordance-series.ts`);
- a Qualidade, a partir da Fase 3 (`quality-series.ts`).

Os gráficos são SVG montado no próprio componente, sem biblioteca de gráficos. Critérios de versões diferentes do codebook são ligados entre rodadas pelo tipo e pelo nome (`columnIdentity`), já que cada versão tem ids próprios.

## Revisão da rodada

A revisão (`/rounds/<roundId>`) só mostra conteúdo depois que a rodada fecha. Para cada resposta, ela apresenta o texto da resposta e as células do codebook agrupadas por definição (`rounds/review-groups.ts`). Em cada célula aparecem as notas de todos os avaliadores, com nome e justificativa, e a classe de divergência. A navegação entre respostas usa os mesmos rótulos ("Resposta 3") que o avaliador viu na fila.

O administrador vê todas as rodadas e, em cada resposta, também o texto exato enviado à LLM. O avaliador vê só as rodadas em que enviou alguma avaliação.

### Medidas invisíveis ao avaliador

O alfa, as proporções de divergência, a Qualidade e as marcas de outlier aparecem só para o administrador. A página de concordância responde "não encontrado" a quem não é administrador, e a revisão não mostra coeficiente para ninguém, nem para o administrador.

O motivo está em `docs/medidas-invisiveis-ao-avaliador.md`. Se soubesse quanto está o alfa, o avaliador poderia passar a dar a nota que imagina ser a do grupo, mesmo sem querer, e o coeficiente subiria com o codebook ainda ambíguo. A discussão das divergências continua aberta, mas gira em torno do texto do codebook, e não do número.

Os testes de `rounds/[roundId]/page.int.test.ts` verificam isso com o mesmo dado no banco: a revisão do avaliador não fala de coeficiente nem mostra marca de outlier, e a do administrador também não fala de coeficiente.

## Anotações de consenso

Na revisão, cada membro pode escrever uma anotação em qualquer célula de qualquer resposta, para registrar o que o grupo concluiu na discussão. A action é `saveConsensusNote` (`rounds/consensus-actions.ts`), com estas regras:

- só em rodada fechada;
- o avaliador só anota nas rodadas em que avaliou;
- a anotação do administrador é **compartilhada** e todos a veem;
- a anotação do avaliador é **privada** e só ele a vê;
- cada pessoa tem no máximo uma anotação por célula; salvar de novo substitui, e salvar vazio apaga;
- até 5000 caracteres.

As anotações não entram em nenhuma medida. Elas servem para orientar a próxima versão do codebook.

## Testes

- `lib/agreement.unit.test.ts`: o cálculo do alfa e do perfil.
- `rounds/agreement.int.test.ts`: leitura das notas do banco e transformação em observações.
- `rounds/agreement-matrix.unit.test.ts`: colunas, células, critério mais fraco.
- `rounds/agreement-outliers.int.test.ts`: a marca muda só a rodada em que foi feita, o valor com todos não muda e desativar não altera o coeficiente.
- `rounds/outlier-actions.int.test.ts` e `outliers.int.test.ts`: as regras de marcação.
- `rounds/quality.unit.test.ts` e `quality-series.unit.test.ts`: a Qualidade.
- `rounds/divergence.unit.test.ts` e `review-groups.unit.test.ts`: a classificação e o agrupamento na revisão.
- `rounds/consensus-actions.int.test.ts` e `consensus.int.test.ts`: as regras e a visibilidade das anotações.
- `rounds/reading-guidance.unit.test.ts` e `reference-comparison.unit.test.ts`: a orientação de leitura e a comparação da Fase 4.
- `rounds/[roundId]/agreement/page.int.test.ts` e `rounds/[roundId]/page.int.test.ts`: o que cada papel vê.
