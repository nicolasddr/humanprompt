# Decisões de projeto

A pasta `docs/` do repositório tem dez registros de decisão. Cada um segue o mesmo formato: a decisão, o porquê, onde está no código e quais testes a garantem. Este arquivo resume cada um e acrescenta outras decisões que aparecem no código mas não ganharam registro próprio.

## Registros em `docs/`

### Alfa de Krippendorff ordinal (`alfa-de-krippendorff-ordinal.md`)

A confiabilidade é medida pelo alfa de Krippendorff com distância ordinal, acompanhado da proporção de notas iguais, das divergências adjacentes e extremas e da distribuição das notas. O alfa aceita número variável de avaliadores e notas faltantes, e a distância ordinal pesa mais as divergências maiores. A proporção de notas iguais ao lado do alfa permite distinguir um codebook ambíguo de notas concentradas num ponto da escala.

### Autorização na aplicação (`autorizacao-na-aplicacao.md`)

As regras de acesso e as travas de fase são verificadas no servidor, em TypeScript, e o banco guarda só restrições de integridade. A primeira versão usava RLS, gatilhos e funções no PostgreSQL, o que obrigava a escrever cada regra duas vezes. Uma migração retira as permissões da API pública do Supabase, que de outro modo deixaria as tabelas expostas.

### Avaliação imutável (`avaliacao-imutavel.md`)

Uma avaliação enviada não pode ser editada nem reenviada, e versões de codebook e prompt congelam ao serem usadas. Se as notas pudessem mudar depois da discussão, a concordância mediria a conversa, e não a clareza do codebook. A avaliação pertence à participação no projeto, então remover alguém não apaga o que essa pessoa avaliou.

### Critério por resposta (`criterio-por-resposta.md`)

Além dos critérios específicos e gerais, existe o critério por resposta, com uma nota única para a resposta inteira. Surgiu na prova de conceito, para a diversidade de um conjunto de variações, que não cabia em nenhuma definição. As alternativas (tratar variações como critérios ou criar uma definição artificial) distorciam o codebook ou o que ia para a LLM.

### Escala fixa de três pontos (`escala-fixa-de-tres-pontos.md`)

Toda nota é Alto, Médio ou Baixo, em todos os projetos. A distância ordinal, a comparação entre rodadas e a separação entre divergência adjacente e extrema dependem disso. A descrição de cada nível é só para o avaliador e não vai para a LLM. O custo, a perda de resolução em tarefas que pediriam mais pontos, é discutido na conclusão do TCC.

### Marcação de outlier (`marcacao-de-outlier.md`)

A única forma de tirar um avaliador do cálculo é marcá-lo como outlier, por rodada, com justificativa obrigatória, de forma reversível e sem apagar notas. O valor com todos os avaliadores continua visível ao lado do valor sem os marcados. Desativar alguém não muda o cálculo, para que não exista um segundo caminho de exclusão sem justificativa.

### Medidas invisíveis ao avaliador (`medidas-invisiveis-ao-avaliador.md`)

Alfa, divergências e marcas de outlier aparecem só para o administrador. O avaliador vê a revisão com notas e justificativas, sem número. Saber o coeficiente poderia levar o avaliador a dar a nota que imagina ser a do grupo, e o alfa subiria com o codebook ainda ambíguo. A verificação acontece no servidor, antes de montar a página.

### Ordem embaralhada por avaliador (`ordem-embaralhada-por-avaliador.md`)

Cada avaliador percorre as respostas numa ordem própria, determinística e estável, calculada por hash a partir da participação, da rodada e da resposta. O rótulo de cada resposta é comum a todos. Isso evita que efeitos de ordem e de cansaço iguais para todos inflem a concordância.

### Registro do perfil do avaliador (`registro-do-perfil-do-avaliador.md`)

Ao entrar, o avaliador aceita um termo de consentimento (com o texto exato guardado) e responde a um questionário de perfil definido por projeto. Saber quem avaliou faz parte da documentação que Shah (2025) pede e ajuda a interpretar divergências sistemáticas. O questionário foi uma sugestão do especialista que avaliou o protótipo.

### Versionamento independente (`versionamento-independente.md`)

Prompt e codebook têm versões separadas, e cada rodada aponta para uma de cada. Cada resposta guarda o modelo pedido, a versão informada pelo provedor e as versões usadas. Assim dá para atribuir uma mudança no alfa ao codebook ou ao prompt.

## Outras decisões que aparecem no código

### A rodada guarda a fase

Cada rodada grava a fase em que foi aberta, e é essa coluna que decide o que a LLM recebeu e quais medidas aparecem. Se dependesse da fase atual do projeto, voltar da Fase 4 para a 3 mudaria a leitura das rodadas antigas.

### A resposta guarda o texto enviado

A coluna `responses.sent_input` guarda exatamente o que foi enviado à LLM. Com isso, a montagem da entrada pode mudar no futuro sem que se perca o que cada resposta antiga recebeu, e o administrador consegue conferir caso a caso.

### Nenhuma medida decide o avanço

As faixas do alfa e a Qualidade são leitura. As travas de fase são só estruturais (rodada aberta, nenhuma rodada fechada, versões que ninguém avaliou). A decisão de que o resultado basta fica com quem conduz o processo.

### A Qualidade não tem meta

A Qualidade é a distribuição das notas, sem veredito e sem limiar de "atinge". A ferramenta mostra quanto caiu em Alto, Médio e Baixo, e a interpretação fica com o administrador.

### Fase 4 congela pela fase, e não por bloqueio manual

O congelamento é derivado da fase do projeto (`isFrozen`). Voltar para a Fase 3 descongela sem nenhum passo adicional, e as versões que as rodadas usaram continuam intactas porque já estavam marcadas como usadas.

### Codebook só para leitura com rodada aberta

Durante a rodada, o codebook não pode ser editado, para que a versão que os avaliadores estão aplicando não mude enquanto eles avaliam. Fechada a rodada, a primeira alteração cria a versão seguinte. O texto do prompt não tem essa trava: editá-lo com a rodada aberta cria a versão seguinte e não afeta a rodada.

### Regras como dados

As travas são escritas como listas de motivos (`roundBlockers`, `phase3Blockers`, `selectionBlockers`), e não como booleanos. A mesma lista alimenta a recusa na action e a explicação na tela, então as duas nunca divergem.

### "Não encontrado" em vez de "acesso negado"

Páginas restritas respondem 404 para quem não pode vê-las, sem confirmar a existência do recurso.

### Sem bibliotecas para o que é central

O alfa, a fila embaralhada e os gráficos foram escritos no próprio projeto. O alfa segue Krippendorff (2011) passo a passo e é testado contra o exemplo publicado, então o cálculo pode ser conferido linha por linha. A fila precisava de uma propriedade específica, a estabilidade quando entra uma resposta nova, que um embaralhamento comum não garante. Os gráficos são poucos e simples.

### Chamada à OpenAI sem SDK

A chamada usa `fetch` direto, numa única função. A classificação de erros fica no próprio projeto, e os testes simulam o `fetch` diretamente.

### Criação de projetos aberta a todos

Até 9 de novembro de 2026, criar projeto exigia uma permissão concedida por um administrador da plataforma, com pedido, fila de aprovação e notificação da decisão. Esse fluxo foi removido (commit `add079e`) e qualquer pessoa com conta passou a poder criar projetos. As tabelas do fluxo antigo continuam no schema.

### Poucos comentários no código

A explicação das decisões fica nos registros de `docs/`, nas mensagens de commit e nos títulos dos testes. Comentários ficam para pontos de segurança e comportamentos não óbvios de bibliotecas.
