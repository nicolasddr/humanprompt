# Testes e integração contínua

O projeto tem três níveis de teste, separados pelo nome do arquivo. Os testes ficam ao lado do código que testam.

| Nível | Padrão de nome | Ferramenta | Precisa de |
|---|---|---|---|
| Unitário | `*.unit.test.ts` | Vitest | nada |
| Integração | `*.int.test.ts` | Vitest | PostgreSQL local |
| Ponta a ponta | `e2e/*.spec.ts` | Playwright | Supabase local completo e o app rodando |

Os títulos dos testes estão em português e descrevem a regra que está sendo verificada, como "o segundo envio da mesma resposta pela mesma participação é recusado". Lidos em sequência, funcionam como especificação.

## Comandos

```bash
npm run test:unit
```

```bash
npm run test:int
```

```bash
npm test
```

```bash
npm run test:e2e
```

`npm test` roda unitários e integração juntos. `npm run lint` e `npm run typecheck` fazem as verificações estáticas.

A configuração está em `vitest.config.ts`, que define dois projetos, `unit` e `int`. Os testes rodam um arquivo por vez (`fileParallelism: false`), porque os de integração compartilham o mesmo banco.

## Testes unitários

Cobrem a lógica pura: o alfa de Krippendorff, as regras de bloqueio de fase e de rodada, a fila embaralhada, a classificação de divergências, a Qualidade, as regras de versão, a montagem da entrada da LLM, a classificação de erros do provedor e os textos montados a partir de números e listas.

Alguns exemplos:

- `lib/agreement.unit.test.ts` reproduz o exemplo publicado de Krippendorff (2011), com resultado 0,815.
- `pipeline/llm-input.unit.test.ts` confere byte a byte o texto que a prova de conceito enviou ao modelo, para garantir que a ferramenta reproduz a mesma entrada.
- `evaluate/shuffle.unit.test.ts` verifica que, num lote realista de respostas, nenhuma chave de ordenação colide.
- `rounds/agreement-matrix.unit.test.ts` usa uma cena que reproduz a rodada 8 da prova de conceito (`test/round-8-scene.ts`), com dois avaliadores, dez respostas, cinco definições e os valores de alfa conhecidos.

## Testes de integração

Rodam contra o PostgreSQL do Supabase local, na porta 54322, com as migrações aplicadas. `vitest.setup.ts` carrega o `.env.local` antes de qualquer teste, para que a conexão de `lib/db` encontre a `DATABASE_URL`.

Eles chamam as Server Actions e as páginas de verdade, com três dependências simuladas:

- `@/lib/supabase/server`, substituído por `supabaseServerMock` (em `test/helpers.ts`), que devolve o usuário que o teste escolher;
- `next/cache` e `next/navigation`, para que `revalidatePath` e `redirect` não precisem do servidor do Next;
- `@/lib/ai`, nos testes que geram respostas, para não chamar a OpenAI.

O resto é real: o banco, as restrições, as transações e as regras.

### Isolamento

`test/helpers.ts` oferece dois jeitos de não deixar sujeira no banco:

- `inRollbackTx(run)` roda o teste dentro de uma transação que é sempre desfeita no fim. Serve para testes de funções que aceitam a transação como parâmetro, como as de `lib/authz.ts`.
- `cleanup(projectIds, userIds)` apaga, na ordem certa das chaves estrangeiras, o que o teste criou. Serve para testes de Server Actions, que abrem suas próprias transações.

O mesmo arquivo tem funções para montar cenários: `createUser`, `createProject`, `addActiveEvaluator`, `addCodebookVersion`, `addRound`, `addResponse`, `addEvaluation`, `addOutlier` e outras. A criação de usuário usa a função `tests.create_user`, instalada pelo `supabase/seed.sql`.

### O que os testes de integração garantem

- **Autorização.** Cada action é chamada por quem pode e por quem não pode, e o teste confere que a recusa não grava nada.
- **Restrições do banco.** `lib/db/criterion-scope.int.test.ts` e `lib/db/evaluations.int.test.ts` tentam gravar dados inválidos direto no banco e conferem a recusa.
- **Regras do processo.** Avanço de fase, abertura de rodada, congelamento na Fase 4, imutabilidade da avaliação, marcação de outlier, visibilidade das anotações.
- **O que cada papel vê.** Os testes de página montam a página com um usuário e procuram no resultado o que deve e o que não deve aparecer, por exemplo que a revisão do avaliador não mostra coeficiente.

Há também `test/smoke.int.test.ts`, que só confere se o banco local responde.

## Testes ponta a ponta

Ficam em `e2e/` e rodam o app num navegador Chromium controlado pelo Playwright, numa porta própria (3100). `playwright.config.ts` sobe o `next dev` apontando para o Supabase local inteiro, inclusive o Auth.

Como não dá para passar pela tela do Google num navegador automatizado, `e2e/global-setup.ts` cria uma conta de teste local, faz login por senha e salva os cookies de sessão gerados pela própria `@supabase/ssr`. Os testes começam já autenticados.

São dois arquivos:

- `usability.spec.ts`: com sessão válida, a navegação entre páginas protegidas nunca manda para o login e nenhuma exceção aparece no navegador.
- `auth-roundtrips.spec.ts`: navegar com token válido não gera nenhuma chamada ao Supabase Auth. A contagem é feita lendo o log do container do Auth (`e2e/helpers/auth-log.ts`). Esse teste protege a troca de `getUser()` por `getClaims()` no proxy, e foi verificado que ele falha quando a troca é desfeita.

Para esse segundo teste ser fiel, o Supabase local precisa assinar os tokens com chave assimétrica (ES256), como o projeto em produção. As instruções estão em `e2e/README.md`.

## Integração contínua

O arquivo `.github/workflows/ci.yml` roda a cada push na `main` e a cada pull request, com dois jobs.

**Lint & Typecheck.** Instala as dependências e roda `npm run lint`, `npm run typecheck` e `npm run test:unit`. Não precisa de banco.

**Integration tests.** Instala o Supabase CLI, sobe só o container do PostgreSQL (com as migrações e o seed aplicados) e roda `npm test`. Os outros containers do Supabase ficam desligados, porque os testes falam direto com o banco e simulam o cliente do Supabase. Uma linha do `config.toml` que aponta para a chave de assinatura (um arquivo que não está no repositório) é comentada no próprio job, porque sem o arquivo o Supabase não sobe.

Os testes ponta a ponta não rodam na integração contínua, porque precisam do Supabase local completo e da chave de assinatura.

## Cuidados ao rodar localmente

- O Docker precisa estar aberto antes de `supabase start`.
- Duas execuções do Vitest ao mesmo tempo sobre o mesmo banco produzem falhas aleatórias, porque uma limpa o que a outra está usando.
- Alguns testes de integração esperam a tabela `scores` vazia. Se houver dados de demonstração no banco local, é preciso limpá-los ou rodar `supabase db reset` antes.
