# Arquitetura

## Tecnologias

| Camada | Escolha |
|---|---|
| Framework web | Next.js 16 com App Router, Server Components e Server Actions |
| Interface | React 19 e Tailwind CSS 4, com componentes próprios em `app/components/ui` |
| Linguagem | TypeScript em todo o projeto |
| Banco de dados | PostgreSQL 17, hospedado no Supabase |
| Acesso ao banco | Drizzle ORM sobre o driver `postgres` |
| Autenticação | Supabase Auth, com login pelo Google, via `@supabase/ssr` |
| Modelo de linguagem | API Responses da OpenAI, chamada com `fetch`, sem SDK |
| Testes | Vitest para testes unitários e de integração, Playwright para testes ponta a ponta |
| Integração contínua | GitHub Actions |

A lista de dependências de produção é curta: Next, React, Drizzle, o driver `postgres` e os dois pacotes do Supabase. Não há biblioteca de componentes, de formulários, de gráficos nem de estatística. Os gráficos de série das rodadas são SVG desenhado à mão, e o alfa de Krippendorff foi implementado do zero em `lib/agreement.ts`.

## Visão do sistema

```
Navegador
   |
   |  HTML renderizado no servidor + formulários
   v
Next.js (servidor)
   |-- proxy.ts .................. renova a sessão a cada requisição
   |-- Server Components ......... leem o banco e montam a página
   |-- Server Actions ............ recebem os formulários e gravam
   |       |
   |       |-- lib/authz ......... verifica quem pode o quê
   |       |-- lib/db ............ Drizzle, uma conexão com o Postgres
   |       '-- lib/ai ............ chamada à OpenAI
   |
   |---> Supabase Auth (login e sessão)
   |---> PostgreSQL (dados)
   '---> OpenAI (geração de respostas)
```

O navegador nunca fala direto com o banco nem com a OpenAI. Toda leitura acontece num Server Component, que roda no servidor e devolve HTML. Toda escrita passa por uma Server Action, que é uma função do servidor chamada pelo formulário. A chave da OpenAI e a conexão com o banco existem só no servidor.

O único uso do Supabase pelo lado do cliente é o login. Mesmo a API REST que o Supabase expõe sobre as tabelas foi desligada por migração (ver [autenticacao-e-autorizacao.md](autenticacao-e-autorizacao.md)).

## O caminho de uma requisição

Tomando como exemplo um avaliador que envia uma avaliação:

1. O navegador envia o formulário da tela de avaliação. O Next.js transforma isso numa chamada à Server Action `submitEvaluation`, em `app/projects/[id]/(tabs)/evaluate/actions.ts`.
2. Antes de chegar à action, o `proxy.ts` da raiz roda `updateSession` (em `lib/supabase/proxy.ts`). Essa função lê os cookies de sessão, valida o token localmente e, se ele estiver perto de expirar, renova e reescreve os cookies.
3. A action chama `requireUserId()`, que lê o identificador do usuário a partir do token. Sem sessão, redireciona para `/login`.
4. A action chama `evaluatorMembershipId` em `lib/authz.ts` para descobrir se o usuário é avaliador ativo do projeto. Se não for, devolve uma mensagem de erro e não grava nada.
5. Dentro de uma transação, a action confere se a rodada está aberta, se o avaliador ainda não avaliou essa resposta, se todas as células receberam nota e se as notas estão na escala. Só então grava a avaliação e as notas.
6. A action chama `revalidatePath` para que a próxima leitura da página reflita a mudança e redireciona o avaliador para a próxima resposta da fila dele.

Esse formato se repete em todas as escritas: autenticação, autorização na própria aplicação, validação das regras do processo, gravação numa transação e revalidação da página.

## Padrões que se repetem

**Server Component lê, componente cliente pequeno escreve.** As páginas (`page.tsx`) são Server Components que consultam o banco e montam tudo o que dá para montar no servidor. A parte interativa fica num componente cliente separado, marcado com `'use client'`, que usa `useActionState` para chamar a Server Action e mostrar o resultado.

**Estado de formulário com `nonce`.** As actions devolvem `{ error: string }` em caso de recusa ou `{ ok: true, nonce: number }` em caso de sucesso. O `nonce` é um `Date.now()` e serve para o formulário saber que houve um salvamento novo, por exemplo para sair do modo de edição ou se remontar.

**Lógica pura separada da consulta.** Quase todo módulo de domínio tem duas partes: um arquivo que faz consultas (`agreement.ts`, `outliers.ts`, `responses.ts`) e arquivos de lógica pura que recebem dados prontos e devolvem decisões ou textos (`preconditions.ts`, `divergence.ts`, `quality.ts`, `queue.ts`). A lógica pura é testada com testes unitários, sem banco, e a consulta com testes de integração.

**Regras como listas de bloqueios.** As travas do processo são escritas como funções que devolvem uma lista de motivos, em vez de um booleano. Por exemplo, `roundBlockers` em `rounds/preconditions.ts` devolve algo como `[{ key: 'open_round', roundNumber: 3 }]`. A mesma lista serve para a action recusar a operação e para a tela explicar por que o botão está desabilitado, e as duas nunca discordam.

**Textos da interface perto da regra.** As mensagens que explicam uma trava ficam no mesmo módulo da regra, em funções como `roundBlockerMessage` ou em arquivos `*-labels.ts`. Isso permite testar o texto junto com a regra.

**Transação com bloqueio quando há disputa.** Operações que podem colidir, como abrir rodada ou avançar fase, leem a linha do projeto com `for update` dentro da transação. Restrições únicas no banco servem de última barreira: o código trata o erro `23505` (violação de unicidade) e devolve uma mensagem clara.

## Por que essa arquitetura

A primeira versão usava o Supabase do jeito mais comum: o navegador falava direto com o banco e a segurança vinha das políticas por linha (RLS) do PostgreSQL, com gatilhos e funções em SQL. Isso fazia cada regra ser escrita duas vezes, em SQL e em TypeScript, e testada em dois lugares diferentes. Com o tempo as regras do processo ficaram mais numerosas (travas de fase, rodada aberta, versões congeladas), e manter as duas cópias ficou caro.

A decisão foi trazer todas as regras para a aplicação, num só lugar e numa só linguagem, e deixar o banco responsável apenas pela integridade dos dados: chaves, unicidade, valores permitidos e tamanhos máximos. O registro dessa decisão está em `docs/autorizacao-na-aplicacao.md`.

Server Actions caíram bem nesse desenho porque a action é, ao mesmo tempo, o endpoint e o lugar onde a regra é verificada. Não existe uma API separada para proteger.

## Integração com a LLM

A chamada à OpenAI está em `lib/ai/index.ts`, na função `askLlm(input)`. Ela faz um `POST` em `https://api.openai.com/v1/responses` com o modelo, o texto de entrada, `temperature: 0` e `reasoning: { effort: 'none' }`. A temperatura zero reduz a variação entre chamadas iguais. O modelo com raciocínio só aceita temperatura quando o esforço de raciocínio é `none`, por isso os dois parâmetros andam juntos.

A função devolve o texto, o nome do modelo pedido e a versão que o provedor informou na resposta. As duas informações são gravadas em cada resposta, porque o mesmo nome de modelo pode apontar para versões diferentes ao longo do tempo.

Os erros do provedor são classificados em `lib/ai/failure.ts` em seis tipos: chave recusada, modelo desconhecido, entrada grande demais, tempo esgotado, provedor indisponível e desconhecido. Cada tipo vira uma mensagem diferente na tela.

O modelo, o tempo máximo de espera e o teto de respostas por projeto vêm de variáveis de ambiente (`OPENAI_MODEL`, `OPENAI_TIMEOUT_MS` e `LLM_PROJECT_RESPONSES_MAX`), com valores padrão no código: `gpt-5.5`, 60 segundos e 200 respostas.

O teto de respostas existe para que um defeito no código não vire uma fatura alta. Ele é contado em memória, no processo do servidor (`lib/ai/quota.ts`), e volta a zero quando o servidor reinicia. Essa fragilidade está discutida em [limitacoes-conhecidas.md](limitacoes-conhecidas.md).

## Desempenho da navegação

Dois ajustes de desempenho mudaram a forma como o código lê a sessão e mostra o carregamento das páginas.

O primeiro foi trocar `getUser()` por `getClaims()` na leitura da sessão. `getUser()` faz uma chamada ao Supabase Auth a cada requisição. `getClaims()` valida o token localmente, com chave assimétrica, e só fala com o Auth quando precisa renovar. Com isso, navegar entre páginas autenticadas deixou de depender da latência do Auth. Há um teste ponta a ponta que garante isso (ver [testes-e-ci.md](testes-e-ci.md)).

O segundo foi remover os arquivos `loading.tsx`. O React segura o esqueleto de carregamento por pelo menos 300 ms depois que ele aparece, e as páginas respondiam em cerca de 30 ms. O esqueleto deixava a navegação mais lenta do que a própria consulta. No lugar dele há uma barra fina no topo, ligada ao estado do link (`app/components/app-link.tsx`).
