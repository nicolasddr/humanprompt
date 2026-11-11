# Estrutura de pastas

## Visão de cima

```
app/                 rotas, páginas, Server Actions e componentes de tela
lib/                 código compartilhado que não pertence a uma tela só
supabase/            configuração do Supabase local, migrações e seed
test/                utilitários dos testes de integração
e2e/                 testes ponta a ponta com Playwright
docs/                documentação técnica, registros de decisão, requisitos e modelo lógico
proxy.ts             renova a sessão a cada requisição
drizzle.config.ts    configuração do gerador de migrações
vitest.config.ts     separa os testes unitários dos de integração
playwright.config.ts sobe o app numa porta própria para os testes ponta a ponta
```

## `app/`

No App Router do Next.js, a pasta define as rotas. Cada `page.tsx` é uma página e cada `route.ts` é um endpoint.

```
app/
  page.tsx                    página inicial pública
  login/                      tela de login
  auth/callback/route.ts      retorno do login pelo Google
  auth/actions.ts             sair
  dev/login/route.ts          atalho de login, só no ambiente local
  dashboard/                  lista de projetos e convites do usuário
  profile/                    edição do nome
  notifications/              marcar notificações como lidas
  invitations/                recusar convite
  onboarding/                 aceitar convite, consentimento e questionário
  components/                 barra superior, sino de notificações, componentes de interface
  projects/
    actions.ts                criar projeto, convidar, papéis, status, desativar e sair
    new/                      formulário de novo projeto
    [id]/
      onboarding/             tela de consentimento e questionário do avaliador
      pipeline/               módulos do codebook, prompt, itens e fases
      (tabs)/                 as abas do projeto
        page.tsx              visão geral
        codebook/             codebook e histórico de versões
        prompt/               prompt e histórico de versões
        items/                itens de entrada
        rounds/               rodadas, revisão, concordância, outliers e consenso
        evaluate/             tela do avaliador
        members/              membros, convites e marcas de outlier
        profile-answers/      respostas do questionário de um avaliador
        settings/             dados do projeto
        questions/            perguntas do questionário de perfil
```

A pasta `(tabs)` está entre parênteses porque é um grupo de rotas: ela não aparece na URL. Serve para que todas as abas compartilhem o mesmo `layout.tsx`, que mostra o cabeçalho do projeto, a barra de fases e as abas. A rota da aba de rodadas, por exemplo, é `/projects/<id>/rounds`.

A pasta `pipeline/` não é uma página de verdade. O `page.tsx` dela só redireciona para a visão geral. Ela guarda os módulos que as abas de codebook, prompt, itens e a visão geral compartilham: leitura das versões, montagem da entrada da LLM, regras de avanço de fase e as Server Actions dessas telas.

### Quais abas cada papel vê

| Aba | Administrador | Avaliador |
|---|---|---|
| Visão geral | sim | sim |
| Codebook, Prompt, Itens | sim | não |
| Rodadas | sim | sim, só as rodadas em que avaliou |
| Avaliar | só se também for avaliador | sim |
| Membros | sim | não |
| Configurações | sim | não |

Na Fase 1 a aba de rodadas aparece bloqueada para todos, porque ainda não existem rodadas.

## `lib/`

```
lib/
  db/
    schema.ts         definição de todas as tabelas (fonte da verdade do banco)
    relations.ts      relações para as consultas relacionais do Drizzle
    index.ts          conexão, transaction() e pgErrorCode()
  authz.ts            funções de autorização (quem é admin, quem é avaliador ativo)
  agreement.ts        alfa de Krippendorff ordinal e perfil de concordância
  versioning.ts       quando uma versão é editada e quando nasce a próxima
  limits.ts           tamanhos máximos de cada campo de texto
  ai/
    index.ts          askLlm, a chamada à OpenAI
    failure.ts        classificação dos erros do provedor
    quota.ts          teto de respostas por projeto
  auth/provision.ts   cria o perfil e vincula convites no primeiro login
  notifications/      emissão da notificação de convite
  supabase/           clientes do Supabase para servidor, navegador e proxy
  dev/session.ts      guarda e configuração do login de desenvolvimento
  plural.ts           "1 resposta", "3 respostas"
  reorder.ts          mover um item numa lista
```

## `supabase/`

```
supabase/
  config.toml         configuração do Supabase local (portas, Auth, Postgres 17)
  migrations/         21 migrações SQL, de 0000_baseline a 0020_revoke_data_api
  migrations/meta/    snapshots que o drizzle-kit usa para calcular a próxima migração
  seed.sql            cria o schema tests com a função tests.create_user
```

Os nomes das migrações (como `0005_rainy_apocalypse.sql`) são gerados automaticamente pelo drizzle-kit e não descrevem o conteúdo.

## `docs/`

```
docs/
  *.md                       esta documentação técnica e os dez registros de decisão
                             (ver decisoes-de-projeto.md)
  Requisitos/                documentos de requisitos dos épicos 0 a 4, em PDF
  Modelo-Logico.pdf          modelo lógico do banco
  Questionario-TAM.pdf       questionário de aceitação usado na avaliação da ferramenta
```

## Convenções de nome

**Arquivos de teste.** `*.unit.test.ts` são testes de lógica pura, sem banco. `*.int.test.ts` são testes de integração, que usam o PostgreSQL local. `*.spec.ts`, dentro de `e2e/`, são testes ponta a ponta. O teste fica ao lado do arquivo que testa.

**Arquivos de rótulo.** Arquivos terminados em `-labels.ts` guardam os textos que a tela mostra sobre um assunto, como `agreement-labels.ts` ou `quality-labels.ts`. Eles têm testes próprios porque vários textos são montados a partir de números e listas.

**Actions.** As Server Actions ficam em arquivos `actions.ts` (ou `*-actions.ts`), sempre com `'use server'` no topo.

**Componentes de tela.** Os componentes `.tsx` usam nomes descritivos do que mostram (`agreement-matrix-table.tsx`, `consensus-form.tsx`). Os genéricos, reaproveitados em várias telas, estão em `app/components/ui/`.

**Idioma.** O código (nomes de funções, variáveis, tabelas) está em inglês. Os textos da interface, as mensagens de erro, os registros de decisão e os títulos dos testes estão em português.

**Comentários.** O código tem poucos comentários de propósito. A explicação das decisões fica nos registros de `docs/`, nas mensagens de commit e nos títulos dos testes. Os comentários que existem tratam de pontos de segurança ou de comportamentos não óbvios de bibliotecas, como em `lib/db/index.ts` e `app/dev/login/route.ts`.

**Importações.** O apelido `@/` aponta para a raiz do repositório, então `@/lib/db` é `lib/db/index.ts`.
