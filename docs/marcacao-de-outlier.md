# Marcação de outlier

## Decisão

Quando as notas de um avaliador destoam sistematicamente das dos demais, o administrador pode marcá-lo como outlier, e essa é a única forma de tirar alguém do cálculo. A marca vale para uma rodada, exige justificativa escrita, pode ser desfeita e não apaga nenhuma nota. O coeficiente com todos os avaliadores continua visível ao lado do coeficiente sem os marcados.

Desativar um avaliador não o tira do cálculo.

## Por quê

Excluir alguém do cálculo muda o resultado, então essa exclusão precisa ficar registrada, com motivo, autor e data. Se desativar o avaliador também o tirasse do cálculo, haveria um segundo caminho de exclusão, sem justificativa.

A marca é por rodada porque um avaliador pode destoar numa rodada e não em outra. Mostrar os dois valores permite ver quanto a exclusão mudou o resultado.

## Onde está no código

- [`lib/db/schema.ts`](../lib/db/schema.ts): a tabela `round_outliers`. A justificativa (`reason`) é obrigatória e não pode ser vazia. Desfazer a marca preenche `removed_at` e `removed_by` em vez de apagar a linha, e a restrição `ro_removal_paired` exige os dois juntos. O índice `ro_one_active_per_member` permite uma única marca ativa por avaliador em cada rodada.
- [`app/projects/[id]/(tabs)/rounds/outlier-actions.ts`](<../app/projects/[id]/(tabs)/rounds/outlier-actions.ts>): `markOutlier` e `unmarkOutlier`, que só o administrador executa.
- [`app/projects/[id]/(tabs)/rounds/outliers.ts`](<../app/projects/[id]/(tabs)/rounds/outliers.ts>): `excludedMemberIds` devolve quem está marcado na rodada. É usado pela página de concordância e por [`round-agreement-section.tsx`](<../app/projects/[id]/(tabs)/rounds/round-agreement-section.tsx>) para calcular o valor sem os marcados.

## Testes

- [`rounds/outlier-actions.int.test.ts`](<../app/projects/[id]/(tabs)/rounds/outlier-actions.int.test.ts>): só o administrador marca e desmarca, a justificativa é obrigatória, só se marca quem avaliou naquela rodada e desmarcar preserva a linha com autor e data.
- [`rounds/outliers.int.test.ts`](<../app/projects/[id]/(tabs)/rounds/outliers.int.test.ts>): marcar na rodada 1 não marca na rodada 2, desfazer a marca não a apaga e desativar o avaliador não apaga a marca nem a avaliação.
- [`rounds/agreement-outliers.int.test.ts`](<../app/projects/[id]/(tabs)/rounds/agreement-outliers.int.test.ts>): a marca muda só o cálculo da rodada em que foi feita, o valor com todos nunca muda, desativar o avaliador não altera o coeficiente e um avaliador marcado sai do cálculo mesmo se já estiver desativado.
