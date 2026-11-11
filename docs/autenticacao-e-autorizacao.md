# Autenticação e autorização

Autenticação é saber quem é o usuário. Autorização é decidir o que ele pode fazer. Na ferramenta, a primeira fica com o Supabase Auth e a segunda inteiramente com a aplicação.

## Login

O único jeito de entrar em produção é com uma conta Google, por OAuth, através do Supabase Auth. O fluxo é este:

1. Na tela `/login`, o botão do Google (`app/components/auth-buttons.tsx`) chama o Supabase no navegador, que redireciona para o Google.
2. Depois que a pessoa autoriza, o Google devolve para o Supabase, que devolve para `/auth/callback` com um código.
3. `app/auth/callback/route.ts` troca o código por uma sessão (`exchangeCodeForSession`). A biblioteca `@supabase/ssr` grava a sessão em cookies.
4. Ainda no callback, a aplicação chama `provisionUserOnFirstLogin` e redireciona para `/dashboard` ou para o endereço pedido no parâmetro `next`.

O parâmetro `next` só é aceito se começar com uma barra e não com duas. Isso evita que alguém monte um link de login que, depois de autenticar, mande a pessoa para outro site.

Para sair, `app/auth/actions.ts` chama `signOut({ scope: 'global' })`, que encerra a sessão em todos os dispositivos.

Para o login funcionar, o endereço `/auth/callback` de cada ambiente precisa estar na lista de URLs de redirecionamento permitidas do Supabase. Sem isso, o Supabase devolve o usuário para a página inicial.

## Provisionamento no primeiro login

O Supabase Auth guarda o usuário na tabela `auth.users`, que pertence a ele. A aplicação precisa do seu próprio registro, em `profiles`. Quem cria esse registro é `lib/auth/provision.ts`, chamado pelo callback dentro de uma transação. A função faz três coisas:

1. Cria o perfil com o id do Auth, o nome que veio do Google e o e-mail. Se o perfil já existe, só atualiza o e-mail, para não sobrescrever um nome que a pessoa tenha editado.
2. Procura convites pendentes feitos para o e-mail dessa pessoa antes de ela ter conta e liga esses convites ao id novo.
3. Cria uma notificação para cada convite ligado.

A função é idempotente: chamada de novo num login posterior, não encontra nada a fazer.

## Sessão em cada requisição

O arquivo `proxy.ts` na raiz é o que o Next.js 16 chama de proxy (nas versões anteriores, middleware). Ele roda antes de cada requisição, exceto arquivos estáticos e imagens, e chama `updateSession` em `lib/supabase/proxy.ts`. Essa função cria um cliente do Supabase ligado aos cookies da requisição e chama `getClaims()`.

`getClaims()` valida o token de acesso localmente, verificando a assinatura com a chave pública do projeto. Só fala com o servidor do Supabase quando o token está perto de expirar e precisa ser renovado; nesse caso, reescreve os cookies na resposta. A versão anterior usava `getUser()`, que consulta o servidor a cada chamada, e trocar uma pela outra tirou uma ida ao Supabase Auth de cada navegação.

Nas páginas e actions, `lib/supabase/server.ts` oferece duas funções:

- `getClaims()` devolve o conteúdo do token ou `null`.
- `requireUserId()` devolve o id do usuário ou redireciona para `/login`.

Quase toda Server Action começa com `const userId = await requireUserId()`.

## Autorização

### O princípio

Todas as regras de acesso são verificadas no servidor, em TypeScript, antes de qualquer leitura ou gravação. Esconder um botão na tela nunca é a proteção: a action verifica de novo, porque qualquer pessoa pode montar a requisição sem passar pelo botão. Da mesma forma, as páginas restritas verificam o acesso antes de montar o conteúdo e respondem "não encontrado" quando a pessoa não pode vê-las.

Responder "não encontrado" em vez de "acesso negado" é proposital. Assim a página não confirma a existência de um projeto ou de uma rodada para quem não participa dele.

### As funções de `lib/authz.ts`

| Função | Pergunta que responde |
|---|---|
| `isMemberOf` | A pessoa é membro ativo do projeto, em qualquer papel? |
| `isProjectMember` | A pessoa tem alguma linha no projeto, inclusive pendente ou inativa? |
| `isProjectAdmin` | A pessoa é administradora ativa do projeto? |
| `evaluatorMembershipId` | Qual é o id da participação de avaliador ativa da pessoa, se houver? |
| `isProjectEvaluator` | A pessoa é avaliadora ativa do projeto? |
| `countSubmittedEvaluations` | Quantas avaliações a pessoa já enviou no projeto? |
| `hasPendingInvitation` | A pessoa tem convite pendente para o projeto? |
| `sharesProjectWith` | Duas pessoas participam de algum projeto em comum? |
| `canViewResponse` | A pessoa pode ver as respostas de questionário de uma participação? (a própria pessoa ou um administrador) |
| `canAnswerOnboarding` | A pessoa pode responder ao questionário de uma participação? (só a própria, enquanto pendente) |
| `listProjectMembers` | Lista os membros que a pessoa pode ver, conforme o papel dela |
| `findInviteeByEmail` | Encontra o perfil de um e-mail para o convite, só se quem pergunta é administrador |
| `listMyPendingInvitations` | Lista os convites pendentes da própria pessoa |

Todas recebem opcionalmente a transação em curso, para que a verificação e a gravação aconteçam sobre o mesmo estado do banco.

Sobre `findInviteeByEmail`: se quem pergunta não é administrador do projeto, a função devolve `null` da mesma forma que devolveria para um e-mail sem cadastro. Isso impede que alguém use o convite para descobrir quais e-mails têm conta na ferramenta.

### Verificações por tela

Além das funções gerais, cada área tem uma função de acesso que já decide para onde mandar quem não pode entrar:

- `requirePipelineAdmin` (`app/projects/[id]/pipeline/access.ts`), usada nas abas de codebook, prompt e itens. Quem não é administrador recebe "não encontrado". Se a pessoa ainda está com o onboarding pendente, é levada para ele.
- `requireEvaluator` (`app/projects/[id]/(tabs)/evaluate/access.ts`), usada na tela de avaliação. Exige participação de avaliador ativa.
- `requireReviewAccess` e `requireReviewableRound` (`app/projects/[id]/(tabs)/rounds/review-access.ts`), usadas na revisão de rodadas. O administrador vê todas as rodadas. O avaliador vê só as rodadas em que enviou alguma avaliação. Na Fase 1 ninguém vê.

### Exemplos de regras verificadas nas actions

- Só administrador ativo cria rodada, fecha rodada, gera respostas, edita codebook, prompt e itens, avança ou volta fase, convida, desativa membros, marca outlier e dá ou tira acesso de administrador.
- Só avaliador ativo envia avaliação.
- Um avaliador só escreve anotação de consenso nas rodadas em que avaliou.
- O último administrador ativo de um projeto não pode perder o acesso.

## A API de dados do Supabase

O Supabase publica automaticamente uma API REST sobre todas as tabelas do schema `public`, acessível com a chave pública que vai para o navegador. Num projeto que usa RLS, essa API é protegida pelas políticas. Como este projeto não usa RLS, a migração `0020_revoke_data_api.sql` retira todas as permissões dos papéis `anon` e `authenticated`. Depois dela, uma chamada a essa API responde com erro de permissão (`42501`). O acesso aos dados acontece só pela conexão direta que a aplicação mantém no servidor.

## Login de desenvolvimento

Num navegador automatizado não dá para passar pela tela do Google. Para os testes ponta a ponta e para abrir as telas durante o desenvolvimento existe a rota `/dev/login` (`app/dev/login/route.ts`), que cria uma sessão real com e-mail e senha de uma conta local de teste.

Como essa rota cria sessão sem credencial do usuário, ela é protegida por três condições verificadas em `checkDevLogin` (`lib/dev/session.ts`):

1. O Supabase configurado precisa estar em `127.0.0.1`, `localhost` ou `::1`. Essa é a condição principal: mesmo que a rota chegasse a um servidor publicado, ela não conseguiria criar sessão contra o Supabase remoto.
2. A aplicação não pode estar rodando em modo de produção.
3. As credenciais da conta de teste precisam estar nas variáveis de ambiente, que vêm de um arquivo local fora do controle de versão.

Se qualquer condição falhar, a rota responde 404, como se não existisse.

A conta usada pela rota é separada da conta usada pelos testes ponta a ponta, para que os testes não dependam de alguém ter aberto a rota antes.
