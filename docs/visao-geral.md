# Visão geral

## O problema

Quem usa um modelo de linguagem para classificar textos, avaliar qualidade ou gerar conteúdo costuma ajustar o prompt na tentativa e erro: muda uma frase, olha algumas respostas e decide se ficou melhor. Shah (2025) propõe tratar o prompt como um instrumento de pesquisa. Antes de confiar nas respostas do modelo, uma equipe escreve um codebook, que diz o que cada resposta deve conter e como julgá-la, e um grupo de avaliadores aplica esse codebook sobre as respostas. Se os avaliadores concordam entre si, o codebook está claro. Se o codebook está claro e as respostas são boas segundo ele, o prompt está funcionando.

O HumanPrompt é uma aplicação web que conduz esse processo. Ela guarda o codebook, o prompt e os itens de entrada, manda os itens para a LLM, distribui as respostas para os avaliadores, recolhe as notas e calcula a concordância entre eles a cada rodada.

## Papéis

Dentro de um projeto existem dois papéis.

O **administrador** monta o codebook, escreve o prompt, cadastra os itens de entrada, convida avaliadores, abre e fecha rodadas, gera as respostas, lê as medidas de concordância e decide quando avançar de fase. Quem cria o projeto vira administrador, e um administrador pode dar esse papel a outro membro.

O **avaliador** entra por convite, aceita um termo de consentimento, responde a um questionário de perfil e avalia as respostas das rodadas. Depois que uma rodada fecha, ele vê as notas e as justificativas dos colegas nas rodadas em que avaliou, mas nunca vê os coeficientes de concordância.

Uma mesma pessoa pode ter os dois papéis no mesmo projeto. Isso acontece quando o administrador também quer avaliar.

Qualquer pessoa com conta pode criar um projeto. Não há papel de administrador da plataforma.

## As quatro fases

O processo de Shah tem quatro fases, e cada projeto está sempre em uma delas.

| Fase | Nome na tela | O que acontece |
|---|---|---|
| 1 | Configuração inicial | O administrador cadastra os títulos das definições do codebook, escreve o prompt e cadastra os itens de entrada. Pode testar o prompt com um item. Não há rodadas. |
| 2 | Validação do codebook | As definições ganham descrição e critérios. Abrem-se rodadas. A LLM recebe o prompt, os títulos das definições e o item. Os avaliadores aplicam o codebook completo e a concordância entre eles mostra onde o codebook é ambíguo. |
| 3 | Validação do prompt | O ciclo se repete, mas agora o codebook inteiro, com descrições e critérios, vai para a LLM junto com o prompt. Além da concordância, a ferramenta mostra a Qualidade, que é a distribuição das notas entre Alto, Médio e Baixo. |
| 4 | Validação final | Codebook e prompt ficam congelados como estavam na última rodada fechada da Fase 3. A avaliação se repete, de preferência com itens e avaliadores novos, para ver se o resultado se mantém. Se não se mantiver, o administrador pode voltar à Fase 3. |

A passagem de uma fase para a outra é sempre decisão do administrador. A ferramenta impede o avanço quando falta algo estrutural (uma rodada aberta, nenhuma rodada fechada, versões que ninguém avaliou), mas nenhum valor de concordância ou de Qualidade libera ou trava o avanço. As faixas de referência do alfa aparecem como leitura, e não como regra.

Os detalhes de cada trava estão em [fases-do-processo.md](fases-do-processo.md).

## O ciclo de uma rodada

Uma rodada é a unidade de trabalho das Fases 2, 3 e 4. O ciclo é sempre o mesmo:

1. O administrador abre a rodada. Ela fixa a versão atual do codebook e a do prompt.
2. O administrador escolhe itens de entrada e a ferramenta gera uma resposta da LLM para cada um.
3. Cada avaliador percorre as respostas numa ordem embaralhada só para ele e dá uma nota em cada célula do codebook.
4. O administrador fecha a rodada. A partir daí ninguém avalia mais.
5. Todos leem a revisão: resposta por resposta, as notas de cada avaliador com as justificativas, com as divergências destacadas. Cada um pode escrever anotações de consenso.
6. O administrador lê as medidas (alfa, divergências, Qualidade), pode marcar avaliadores como outliers e decide o que mudar no codebook ou no prompt antes da próxima rodada.

## Glossário

**Codebook.** Conjunto versionado de definições e critérios. É a régua que os avaliadores aplicam.

**Definição.** Algo que a LLM deve produzir, classificar ou avaliar. Pode ser marcada como categoria, dimensão de qualidade ou conteúdo gerado. Esse tipo serve só para organização e nunca vai para a LLM.

**Critério.** Uma pergunta que o avaliador responde com Alto, Médio ou Baixo. Pode ser específico (de uma definição), geral (vale para todas as definições) ou por resposta (uma nota só para a resposta inteira).

**Célula.** O par definição e critério que recebe uma nota. Para um critério por resposta, a célula é o critério sozinho.

**Escala.** Sempre Alto, Médio e Baixo. É fixa em todos os projetos.

**Item de entrada.** O texto que vai para a LLM junto com o prompt, por exemplo um documento a ser classificado.

**Rodada.** Um ciclo de geração, avaliação e revisão sobre versões fixas do codebook e do prompt.

**Resposta.** O texto que a LLM devolveu para um item numa rodada.

**Avaliação.** O envio de um avaliador para uma resposta, com uma nota em cada célula e justificativas opcionais. Não pode ser editada depois.

**Alfa (α).** O alfa de Krippendorff com distância ordinal, a medida de confiabilidade usada pela ferramenta.

**Divergência adjacente e extrema.** Quando as notas de uma célula diferem por um ponto da escala (Alto e Médio, por exemplo), a divergência é adjacente. Quando vão de Alto a Baixo, é extrema.

**Outlier.** Avaliador que o administrador tirou do cálculo de uma rodada, com justificativa.

**Qualidade.** Distribuição das notas entre Alto, Médio e Baixo, mostrada a partir da Fase 3.

**Rodada de referência.** A última rodada fechada da Fase 3. É contra ela que a Fase 4 compara os resultados e é dela que vêm as versões congeladas.

## Números do repositório

Em 10 de novembro de 2026, o repositório tinha 336 commits, feitos entre abril e novembro de 2026, cerca de 26 mil linhas de TypeScript fora dos testes e cerca de 41 mil linhas de teste, distribuídas em 113 arquivos.
