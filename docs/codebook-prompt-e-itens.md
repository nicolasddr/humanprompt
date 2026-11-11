# Codebook, prompt e itens de entrada

São os três artefatos que o administrador configura. O codebook e o prompt são versionados, e os itens formam um conjunto (o "pool") do projeto. Os módulos ficam em `app/projects/[id]/pipeline/`, e as telas nas abas `codebook`, `prompt` e `items`.

## Codebook

### Estrutura

Uma versão do codebook tem uma lista ordenada de **definições** e uma lista de **critérios**.

A definição tem título, descrição opcional e um tipo opcional (categoria, dimensão de qualidade ou conteúdo gerado). O tipo só organiza o codebook para o administrador e nunca vai para a LLM.

O critério tem nome, descrição opcional, uma descrição opcional para cada nível da escala (o que significa Alto, Médio e Baixo naquele critério) e um alcance:

- **específico**: pertence a uma definição;
- **geral**: vale para todas as definições;
- **por resposta**: recebe uma nota só para a resposta inteira, sem definição.

O critério por resposta surgiu na prova de conceito, ao reproduzir o LLMAuditor. Lá, a diversidade é uma propriedade do conjunto das cinco variações que o modelo gera para uma pergunta, e não de cada variação. Sem esse alcance, seria preciso criar uma definição artificial só para pendurar o critério, e ela iria para a LLM como mais uma coisa a gerar. A decisão está registrada em `docs/criterio-por-resposta.md`.

### Células

Uma célula é o lugar onde o avaliador dá uma nota. A função `resolveCells` em `pipeline/criteria.ts` monta as células de uma versão:

- para cada definição, uma célula para cada critério específico dela e uma para cada critério geral;
- para cada critério por resposta, uma célula sem definição.

O número de notas por resposta é, portanto, `definições × critérios gerais + critérios específicos + critérios por resposta`. A tela mostra essa conta (`notesPerResponseFormula`) porque ela é o esforço do avaliador a cada resposta.

Um codebook está completo (`isCodebookComplete`) quando tem ao menos uma definição e toda definição tem pelo menos um critério, próprio ou geral.

### O que pode ser editado em cada fase

A action `saveCodebook` aplica estas regras, nesta ordem:

1. Na Fase 4 o codebook está congelado e nada pode ser salvo.
2. Com uma rodada aberta, o codebook fica só para leitura, para que a versão que os avaliadores estão aplicando não mude enquanto eles avaliam.
3. Na Fase 1, as definições só podem ter título. Descrições e critérios são recusados, porque nessa fase a ideia é só dar à LLM o contexto mínimo da tarefa.
4. A partir da Fase 2, toda definição precisa de pelo menos um critério (ou de um critério geral).

Depois disso entra a regra de versão, descrita mais abaixo. O formulário inteiro é salvo de uma vez: a versão aberta tem suas definições e critérios apagados e regravados, ou nasce uma versão nova com o conteúdo do formulário.

## Prompt

O prompt tem o texto (obrigatório, até 20 mil caracteres) e três metadados opcionais: nome, descrição e registro de mudanças.

O texto é salvo por `savePrompt`, que segue a regra de versão. Se o texto enviado é igual ao da versão atual, nada é gravado. Na Fase 4 o texto está congelado.

Os metadados são salvos por `savePromptMetadata` e sempre alteram a versão mais recente, mesmo que ela já tenha sido usada numa rodada ou esteja congelada pela Fase 4. Eles descrevem a versão e não mudam o que vai para a LLM, então editá-los não compromete a comparação entre rodadas.

Diferente do codebook, o texto do prompt pode ser editado com uma rodada aberta. Como a versão da rodada já foi marcada como usada, a edição cria a versão seguinte e não afeta a rodada em andamento.

## Versionamento

Codebook e prompt seguem as mesmas regras, que estão em `lib/versioning.ts`:

- Uma versão está **aberta** quando é a mais recente e nenhuma rodada a usou ainda. Versão aberta é editada no lugar.
- Quando uma rodada é aberta, as versões de codebook e de prompt que ela fixou recebem `used_at`. A partir daí estão congeladas para sempre.
- Salvar quando a versão mais recente está congelada cria a versão seguinte, com o número seguinte.
- Se o formulário foi aberto a partir de uma versão que deixou de ser a mais recente (outra pessoa salvou no meio), o salvamento é recusado como desatualizado e a pessoa precisa recarregar.

A decisão fica na função pura `decideSave`, que devolve `update`, `create` ou `stale`. Para o prompt existe `decideTextSave`, que acrescenta o caso `unchanged`.

Prompt e codebook têm numeração própria. Assim, entre duas rodadas, dá para saber se mudou o codebook, o prompt ou os dois, e atribuir uma variação do alfa a uma mudança específica. A comparação é feita por `roundChanges` em `rounds/round-changes.ts`, e a revisão de uma rodada avisa o administrador quando os dois mudaram juntos. O registro está em `docs/versionamento-independente.md`.

O histórico de versões fica acessível nas próprias abas, em `/codebook/<versionId>` e `/prompt/<versionId>`. A versão vigente traz um aviso (`version-status.tsx`) que diz se salvar vai alterá-la ou criar a próxima.

## Itens de entrada

O item tem nome (até 200 caracteres) e conteúdo (até 50 mil caracteres). Pode ser cadastrado de três jeitos:

- colando o texto no formulário (`createItem`);
- carregando um arquivo para preencher o formulário;
- importando vários arquivos de uma vez (`createItems`), até 500 por lote e 3 MB no total.

A leitura dos arquivos está em `pipeline/item-content.ts`. São aceitos formatos de texto (`.txt`, `.md`, `.csv`, `.tsv`, `.json`, `.xml`, `.bpmn`, `.html`, `.yaml`, `.log` e outros) e arquivos de código, com até 2 MB cada. PDF e Word são recusados com uma mensagem que pede para exportar o conteúdo como texto. Um arquivo com extensão aceita mas conteúdo binário também é recusado. Na importação em lote, o nome do item é o nome do arquivo sem extensão, e a tela aponta nomes repetidos dentro do lote ou já existentes no pool antes de importar.

Um item só pode ser editado ou apagado enquanto não tiver gerado nenhuma resposta. Depois disso, `used_at` está preenchido e as actions `updateItem` e `deleteItem` recusam a operação. A chave estrangeira de `responses` para `input_items` é `restrict`, o que garante a mesma coisa no banco.

A aba de itens é uma tabela paginada, com busca por nome e conteúdo e ordenação por colunas (`pipeline/item-table.ts`). Cada item mostra em quais rodadas já foi usado, com a fase de cada uma, o que ajuda na Fase 4 a escolher itens que ainda não foram vistos.

## Teste do prompt

O administrador pode testar o prompt com um item em qualquer fase, pela action `testPrompt`. Ela monta a mesma entrada que uma rodada montaria na fase atual, chama a LLM e mostra o texto enviado e a resposta recebida. Nada é gravado no banco, mas a chamada conta para o teto de respostas do projeto.

O teste exige ao menos uma definição, o texto do prompt e o item escolhido. Os erros do provedor viram mensagens específicas: chave recusada, modelo desconhecido, item grande demais, tempo esgotado ou provedor fora do ar.

## O que vai para a LLM

A função `composeLlmInput` em `pipeline/llm-input.ts` monta o texto enviado. Ele tem sempre três blocos separados por uma linha em branco: o texto do prompt, o bloco do codebook e o item.

Nas Fases 1 e 2, o bloco do codebook tem só os títulos das definições:

```
<texto do prompt>

Definições:
- Título da definição 1
- Título da definição 2

Item de entrada:
<conteúdo do item>
```

A partir da Fase 3, vai o codebook completo: cada definição com sua descrição e seus critérios específicos, depois os critérios gerais e, por fim, os critérios por resposta.

```
<texto do prompt>

Codebook:

Definição: Título 1
Descrição da definição 1
Critérios:
- Critério A: descrição do critério A

Definição: Título 2
Descrição da definição 2

Critérios gerais, que valem para todas as definições:
- Critério B: descrição do critério B

Critérios por resposta, que valem para a resposta inteira:
- Critério C: descrição do critério C

Item de entrada:
<conteúdo do item>
```

O tipo da definição e a descrição dos níveis da escala (Alto, Médio e Baixo) nunca entram. O tipo é organização interna e a escala é instrumento dos avaliadores, e não do modelo. A justificativa está em `docs/escala-fixa-de-tres-pontos.md`.

O texto exato enviado é gravado em cada resposta (`responses.sent_input`), então o administrador pode conferir depois o que a LLM recebeu em cada caso.
