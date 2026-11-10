# Medidas invisíveis ao avaliador

## Decisão

O alfa, a proporção de notas iguais, as divergências e as marcas de outlier aparecem só para o administrador. O avaliador continua vendo a revisão da rodada, com as notas e as justificativas de cada célula, mas sem nenhum coeficiente.

## Por quê

Se soubesse quanto o alfa está, o avaliador poderia passar a dar a nota que imagina ser a do grupo, mesmo sem querer. O coeficiente subiria com o codebook ainda ambíguo. A discussão das divergências continua aberta, mas gira em torno do texto do codebook, e não do número.

Pelo mesmo motivo, a página de revisão não fala de coeficiente nem para o administrador. As medidas ficam numa página separada.

## Onde está no código

- [`app/projects/[id]/(tabs)/rounds/[roundId]/agreement/page.tsx`](<../app/projects/[id]/(tabs)/rounds/[roundId]/agreement/page.tsx>): a página de concordância da rodada. Ela verifica o acesso com `requireReviewAccess` e responde "não encontrado" a quem não é administrador.
- [`app/projects/[id]/(tabs)/rounds/review-access.ts`](<../app/projects/[id]/(tabs)/rounds/review-access.ts>): descobre se quem pede a página é administrador, avaliador ou os dois naquele projeto.
- [`app/projects/[id]/(tabs)/rounds/[roundId]/page.tsx`](<../app/projects/[id]/(tabs)/rounds/[roundId]/page.tsx>): a revisão da rodada, que monta conteúdo diferente para cada papel.

A verificação acontece no servidor, antes de a página ser montada. Esconder um botão não bastaria, porque o avaliador poderia digitar o endereço da página.

## Testes

- [`rounds/[roundId]/agreement/page.int.test.ts`](<../app/projects/[id]/(tabs)/rounds/[roundId]/agreement/page.int.test.ts>): o avaliador não abre a concordância da rodada.
- [`rounds/[roundId]/page.int.test.ts`](<../app/projects/[id]/(tabs)/rounds/[roundId]/page.int.test.ts>): a revisão do avaliador não fala de coeficiente, a revisão não fala de coeficiente nem para o administrador e o avaliador não vê marca de outlier, com o mesmo dado no banco.
