# Versionamento independente do prompt e do codebook

## Decisão

O prompt e o codebook têm versões separadas, cada um com a sua numeração. Cada rodada aponta para uma versão de cada. Cada resposta gerada registra o modelo pedido, a versão informada pelo provedor e as versões de prompt e de codebook usadas.

## Por quê

Entre duas rodadas, o administrador precisa saber o que mudou. Se o prompt e o codebook tivessem uma versão só, não daria para dizer se o alfa caiu por causa de uma mudança no codebook ou no prompt. Shah (2025) exige essa documentação, e é ela que torna as rodadas comparáveis.

O nome do modelo pedido pode apontar para versões diferentes ao longo do tempo. Por isso a resposta guarda também a versão que o provedor informa na resposta da API.

## Onde está no código

- [`lib/db/schema.ts`](../lib/db/schema.ts): as tabelas `codebook_versions` e `prompt_versions` são separadas. `rounds` tem `codebook_version_id` e `prompt_version_id`. `responses` tem `model`, `model_version`, `prompt_version_id` e `codebook_version_id`.
- [`lib/versioning.ts`](../lib/versioning.ts): as regras de quando uma versão é editada e quando nasce a seguinte, iguais para prompt e codebook.
- [`app/projects/[id]/(tabs)/rounds/round-changes.ts`](<../app/projects/[id]/(tabs)/rounds/round-changes.ts>): `roundChanges` compara uma rodada com a anterior e diz se o codebook, o prompt ou os dois mudaram.

## Testes

- [`lib/versioning.unit.test.ts`](../lib/versioning.unit.test.ts): a primeira gravação cria a versão 1, uma versão usada congela, texto igual não cria versão nova e a decisão não depende de quem chama.
- [`rounds/round-changes.unit.test.ts`](<../app/projects/[id]/(tabs)/rounds/round-changes.unit.test.ts>): a comparação entre rodadas identifica o que mudou.
- [`rounds/[roundId]/page.int.test.ts`](<../app/projects/[id]/(tabs)/rounds/[roundId]/page.int.test.ts>): com codebook e prompt mudados juntos, o administrador vê o aviso.
