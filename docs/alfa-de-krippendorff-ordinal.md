# Alfa de Krippendorff ordinal

## Decisão

A confiabilidade de cada rodada é medida pelo alfa de Krippendorff com a distância ordinal. Ao lado do alfa, a ferramenta mostra a proporção de notas iguais, a distribuição das notas e as divergências adjacentes e extremas.

## Por quê

O número de avaliadores muda entre rodadas, principalmente na Fase 4, quando entram avaliadores novos. Também é comum que nem todos avaliem todas as respostas. O alfa aceita as duas situações e trata como dado faltante a nota que não foi dada. A distância ordinal faz uma divergência entre Alto e Baixo pesar mais que uma entre Alto e Médio.

O acaso é estimado a partir de todas as notas juntas, e por isso o alfa mede a confiabilidade dos dados produzidos com o codebook. O kappa, por outro lado, mede a concordância entre avaliadores específicos.

O alfa sozinho pode enganar quando quase todas as notas caem no mesmo ponto da escala (o paradoxo da prevalência). A proporção de notas iguais ao lado dele permite distinguir um codebook ambíguo de notas concentradas.

## Onde está no código

- [`lib/agreement.ts`](../lib/agreement.ts): `ordinalAlpha` calcula o coeficiente e `agreementProfile` calcula as notas iguais, as divergências adjacentes e extremas e a parte de cada ponto da escala. O cálculo foi escrito sem biblioteca externa, seguindo Krippendorff (2011).
- [`app/projects/[id]/(tabs)/evaluate/scale.ts`](<../app/projects/[id]/(tabs)/evaluate/scale.ts>): `scaleRank` converte Alto, Médio e Baixo em 3, 2 e 1.
- [`app/projects/[id]/(tabs)/rounds/agreement.ts`](<../app/projects/[id]/(tabs)/rounds/agreement.ts>): lê as notas de uma rodada do banco e as transforma nas observações que `ordinalAlpha` recebe.

Unidades com menos de duas notas ficam fora do cálculo. Quando há só um avaliador, quando nenhuma unidade tem duas notas ou quando todas as notas são iguais, o resultado é "não calculável" (`few_evaluators`, `no_shared_units` e `no_variation`), e a tela não mostra 0 nem 1 nesses casos.

## Testes

Em [`lib/agreement.unit.test.ts`](../lib/agreement.unit.test.ts):

- o exemplo publicado por Krippendorff (2011), com 4 observadores e 12 unidades, dá alfa ordinal de 0,815;
- uma distribuição com 80% de concordância percentual dá alfa negativo, que é o caso do paradoxo da prevalência;
- sem variação nas notas o resultado é não calculável, e não 1;
- a unidade avaliada por uma pessoa só sai do cálculo, mas o avaliador continua contando nas outras.
