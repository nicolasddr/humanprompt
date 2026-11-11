# Banco de dados

## Onde o banco é definido

O arquivo `lib/db/schema.ts` descreve todas as tabelas, colunas, chaves, índices e restrições, usando a sintaxe do Drizzle. Ele é a fonte da verdade: para mudar o banco, edita-se esse arquivo e o `drizzle-kit generate` produz a migração SQL correspondente em `supabase/migrations/`. O SQL gerado precisa ser conferido antes de aplicar, porque o gerador compara com o último snapshot e às vezes emite instruções numa ordem que o PostgreSQL recusa.

A conexão fica em `lib/db/index.ts`. Existe uma só conexão, com o usuário dono das tabelas, e uma função `transaction(run)` que abre uma transação e executa `run` dentro dela. O parâmetro `prepare: false` é necessário porque, em produção, a conexão passa pelo pooler de transações do Supabase, que não suporta comandos preparados.

O mesmo arquivo exporta `pgErrorCode(err)`, que extrai o código de erro do PostgreSQL (por exemplo `23505`, violação de unicidade). O Drizzle embrulha o erro original do driver, então ler `err.code` direto não funcionaria.

## O banco guarda integridade, e não regras do processo

Não há políticas por linha (RLS), gatilhos com regra de negócio nem funções armazenadas. O que o banco garante é que os dados façam sentido sozinhos: chaves estrangeiras, unicidade, valores permitidos, tamanhos máximos e combinações de colunas que precisam andar juntas. Quem pode fazer o quê e em que fase do processo é decidido na aplicação.

Os tamanhos máximos aparecem em três lugares que precisam concordar: no `maxLength` dos formulários, na validação das Server Actions e nas restrições `check` do banco. Os valores ficam em `lib/limits.ts`. O formulário serve à experiência do usuário, a action decide e o banco é a última barreira.

## Tabelas

### Pessoas e acesso

**`profiles`.** Nome e e-mail de cada usuário. O `id` é o mesmo do Supabase Auth, mas não há chave estrangeira para `auth.users`, porque o Auth é outro serviço e, no ambiente de desenvolvimento, pode estar em outro banco. O perfil é criado pela aplicação no primeiro login.

**`project_members`.** Liga uma pessoa a um projeto com um papel (`administrator` ou `evaluator`) e um status (`pending_onboarding`, `active` ou `inactive`). A restrição `pm_unique_role` permite uma linha por pessoa, projeto e papel, então a mesma pessoa pode ter uma linha de administrador e outra de avaliador. Para o avaliador, a linha guarda também quando o consentimento foi aceito, o texto exato aceito e quando o onboarding terminou. Duas restrições impedem que um avaliador fique ativo sem esses registros (`pm_consent_required` e `pm_onboarding_done`).

**`project_invitations`.** Convites para um projeto. O convidado pode ser identificado pelo `invitee_id`, se já tem conta, ou só pelo `invitee_email`, se ainda não tem. Índices únicos parciais impedem dois convites pendentes para a mesma pessoa no mesmo projeto, tanto por id quanto por e-mail.

**`onboarding_questions` e `onboarding_responses`.** As perguntas do questionário de perfil de cada projeto (abertas ou de múltipla escolha, com as opções num campo `jsonb`) e as respostas, ligadas à participação no projeto e não à conta.

**`notifications`.** Caixa de entrada de cada usuário. Hoje o único tipo emitido é o convite para projeto.

### Artefatos do processo

**`projects`.** Nome, descrição, tipo de tarefa (opcional), status (`active`, `completed`, `archived`) e a fase atual, de 1 a 4.

**`codebook_versions`.** Uma linha por versão do codebook de um projeto, com número sequencial e uma nota opcional. A coluna `used_at` é preenchida quando alguma rodada usa a versão pela primeira vez, e a partir daí a versão não pode mais ser editada.

**`codebook_definitions`.** As definições de uma versão do codebook, com título, tipo opcional, descrição opcional e ordem.

**`codebook_criteria`.** Os critérios de uma versão, com nome, descrição, a descrição opcional de cada nível da escala e o alcance (`scope`): `specific`, `general` ou `per_response`. A restrição `cc_scope_definition` exige que só o critério específico aponte para uma definição.

**`prompt_versions`.** Uma linha por versão do prompt, com o texto e metadados opcionais (nome, descrição e registro de mudanças). Também tem `used_at`.

**`input_items`.** Os itens de entrada do projeto, com nome e conteúdo. Também têm `used_at`, preenchido quando o item gera sua primeira resposta. Item usado não pode ser editado nem apagado.

### Rodadas e avaliação

**`rounds`.** Cada rodada aponta para uma versão do codebook e uma do prompt, guarda a fase em que foi aberta (2, 3 ou 4) e o status (`open` ou `closed`). O índice único parcial `rd_one_open_per_project` garante que haja no máximo uma rodada aberta por projeto, mesmo com dois cliques simultâneos. A restrição `rd_closed_at_matches_status` exige `closed_at` preenchido se e só se a rodada estiver fechada.

**`responses`.** A resposta da LLM para um item numa rodada. Guarda o texto, o texto exato que foi enviado à LLM (`sent_input`), o modelo pedido, a versão informada pelo provedor e as versões de prompt e codebook usadas. A restrição `rs_unique_round_item` impede duas respostas do mesmo item na mesma rodada.

**`evaluations`.** O envio de um avaliador para uma resposta. Aponta para a participação no projeto (`project_member_id`), e não para o usuário. A restrição `ev_unique_response_member` impede uma segunda avaliação da mesma resposta pela mesma participação. As chaves estrangeiras são `restrict`, então não é possível apagar a participação, a resposta ou a rodada enquanto houver avaliação.

**`scores`.** As notas de uma avaliação, uma por célula. `value` só aceita `high`, `medium` ou `low` (restrição `sc_value_check`). A justificativa é opcional.

**`round_outliers`.** As marcas de outlier. Cada linha diz que, numa rodada, as notas de uma participação ficam fora do cálculo, com justificativa obrigatória, autor e data. Desfazer a marca preenche `removed_at` e `removed_by` em vez de apagar a linha. O índice `ro_one_active_per_member` permite uma única marca ativa por avaliador em cada rodada.

**`consensus_notes`.** Anotações escritas numa célula de uma resposta depois que a rodada fecha. A visibilidade é `shared` (anotação do administrador, que todos veem) ou `private` (anotação do avaliador, que só ele vê). Os detalhes estão em [concordancia-qualidade-e-revisao.md](concordancia-qualidade-e-revisao.md). Há no máximo uma anotação por célula e autor.

### Tabelas que ficaram sem uso

`super_admins` e `platform_permission_requests` existem no schema mas não são usadas pela aplicação. Elas sustentavam um fluxo em que criar projeto exigia uma permissão concedida por um administrador da plataforma. Esse fluxo foi removido em 9 de novembro de 2026 (commit `add079e`), quando a criação de projetos foi liberada para todos. O tipo de notificação `permission_decision` também é resto desse fluxo.

## Diagrama das relações principais

```
profiles 1---n project_members n---1 projects
                    |                   |
                    |                   |--- n codebook_versions 1---n codebook_definitions
                    |                   |           |                         |
                    |                   |           '------------n codebook_criteria (definition_id opcional)
                    |                   |--- n prompt_versions
                    |                   |--- n input_items
                    |                   '--- n rounds (aponta para 1 codebook_version e 1 prompt_version)
                    |                              |
                    |                              '--- n responses (1 por item por rodada)
                    |                                        |
                    '------------------------------- n evaluations (1 por resposta por participação)
                                                             |
                                                             '--- n scores (1 por célula)
```

## Restrições que merecem explicação

### O critério por resposta e a chave composta

A nota de um critério por resposta não tem definição (`definition_id` nulo), e a de um critério específico ou geral precisa ter. O banco garante isso sem gatilho, com um truque de colunas geradas:

- `codebook_criteria.per_response` é uma coluna gerada, verdadeira quando `scope = 'per_response'`. Existe uma restrição única em `(id, per_response)`.
- `scores.per_response` é outra coluna gerada, verdadeira quando `definition_id` é nulo.
- A chave estrangeira composta `scores_criterion_scope_fkey` liga `(criterion_id, per_response)` da nota a `(id, per_response)` do critério.

Assim, uma nota sem definição só consegue apontar para um critério por resposta, e uma nota com definição só consegue apontar para um critério que não seja por resposta. A mesma técnica é usada em `consensus_notes`. Os testes estão em `lib/db/criterion-scope.int.test.ts`.

### Unicidade com nulo

A restrição `sc_unique_cell` em `scores` cobre `(evaluation_id, definition_id, criterion_id)` com `nulls not distinct`. Sem essa opção, o PostgreSQL trataria dois nulos como diferentes e permitiria duas notas no mesmo critério por resposta para a mesma avaliação.

### Anotação de consenso e resposta da mesma rodada

`consensus_notes` aponta para a resposta pela chave composta `(response_id, round_id)`, que referencia a restrição única `rs_unique_id_round` de `responses`. Isso impede uma anotação com uma rodada que não é a da resposta.

## Migrações

As migrações ficam em `supabase/migrations/` e são aplicadas em ordem pelo Supabase CLI. A `0000_baseline.sql` é o ponto de partida gerado depois da migração para o Drizzle. As seguintes acompanham as funcionalidades, como a fase do projeto (`0003`), as rodadas, as respostas, as avaliações, os outliers e o consenso.

A última, `0020_revoke_data_api.sql`, retira dos papéis `anon` e `authenticated` todas as permissões sobre tabelas, sequências e funções do schema `public`, inclusive para objetos criados no futuro. Ela existe porque o Supabase publica uma API REST sobre as tabelas, e sem RLS qualquer pessoa com a chave pública do projeto poderia ler e escrever nelas. Depois dessa migração, essa API responde com erro de permissão.

O `supabase/seed.sql` roda só no banco local. Ele cria o schema `tests` com a função `tests.create_user`, que os testes de integração usam para criar um usuário no Auth e o perfil correspondente.

## Fluxo para mudar o banco

```bash
supabase start
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres' npx drizzle-kit generate
supabase db reset
```

Depois do `generate`, é preciso abrir o SQL gerado e conferir a ordem das instruções. Um caso que já aconteceu: uma chave estrangeira composta precisa que a restrição única que ela referencia já exista, e o gerador emitiu a criação da chave antes da criação da restrição, o que o PostgreSQL recusa com o erro `42830`. Em produção, as migrações são aplicadas com `supabase db push`.
