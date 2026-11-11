# Projetos, membros e entrada no projeto

Este arquivo cobre tudo o que acontece antes da primeira rodada: criar o projeto, convidar pessoas, a entrada do avaliador e a gestão de papéis. As Server Actions principais estão em `app/projects/actions.ts`, `app/onboarding/actions.ts` e `app/invitations/actions.ts`.

## Criar um projeto

Qualquer pessoa autenticada pode criar um projeto em `/projects/new`. A action `createProject` recebe nome (obrigatório, até 200 caracteres), descrição (opcional, até 2000) e tipo de tarefa (opcional: classificação, avaliação de qualidade, geração, misto ou outro). O projeto nasce na Fase 1 e com status ativo, e quem criou ganha uma linha de administrador ativa.

O tipo de tarefa não muda nenhuma regra do processo. Ele descreve o projeto e define o tipo sugerido para as definições novas do codebook (`defaultDefinitionType` em `app/projects/definition-types.ts`).

Na aba de configurações, o administrador edita nome, descrição e tipo (`updateProject`) e muda o status do projeto entre ativo, concluído e arquivado (`setProjectStatus`). Projetos arquivados somem da lista do painel, a menos que se peça para vê-los.

## Convidar avaliadores

O convite é feito pelo e-mail, na aba de membros, com a action `inviteEvaluator`. Ela:

1. valida o formato e o tamanho do e-mail e confere se quem convida é administrador;
2. procura um perfil com aquele e-mail (`findInviteeByEmail`);
3. recusa se a pessoa já é membro ativo;
4. grava o convite com o id da pessoa, se ela já tem conta, ou só com o e-mail, se não tem;
5. se a pessoa já tem conta, cria uma notificação para ela.

Se o e-mail ainda não tem conta, o convite fica guardado pelo e-mail. Quando a pessoa entrar pela primeira vez com uma conta Google daquele endereço, o provisionamento liga o convite à conta e cria a notificação (ver [autenticacao-e-autorizacao.md](autenticacao-e-autorizacao.md)). A ferramenta não envia e-mail: o administrador avisa a pessoa por fora.

Não pode haver dois convites pendentes para a mesma pessoa no mesmo projeto. O banco garante isso com índices únicos parciais, e a action transforma a violação numa mensagem.

## Notificações

O sino da barra superior (`app/components/notification-bell.tsx`) mostra as notificações do usuário. Hoje só existe o tipo convite para projeto. O conteúdo da notificação (nome do projeto e de quem convidou) é copiado para o campo `payload` no momento da criação, então continua legível mesmo que o projeto mude de nome depois. As actions em `app/notifications/actions.ts` marcam uma ou todas como lidas.

## Aceitar ou recusar o convite

No painel (`/dashboard`), os projetos para os quais a pessoa foi convidada aparecem com a indicação de convite pendente e dois botões.

**Recusar** (`declineInvitation`) marca o convite como recusado.

**Aceitar** (`acceptInvitation`) cria a linha de avaliador com status `pending_onboarding`, marca o convite como aceito e leva a pessoa para a tela de entrada do projeto. A action só cria a linha se houver convite pendente, então ninguém consegue se adicionar a um projeto chamando a action direto. Se a pessoa clicar duas vezes, o segundo clique encontra a linha e segue em frente sem duplicar.

## Consentimento e questionário de perfil

A tela `/projects/<id>/onboarding` mostra o termo de consentimento e as perguntas do questionário de perfil do projeto. O texto do termo está em `app/onboarding/consent.ts` e menciona o uso dos dados para pesquisa acadêmica e a LGPD.

A action `completeOnboarding` faz tudo numa transação:

1. recusa se o termo não foi aceito;
2. confere que a participação da pessoa está pendente;
3. valida todas as respostas antes de gravar qualquer coisa (todas as perguntas são obrigatórias; na múltipla escolha, a resposta precisa ser uma das opções ou a opção "Outro" com texto);
4. grava as respostas;
5. ativa a participação, registrando a data do aceite, o texto exato do termo aceito e a data de conclusão.

Guardar o texto exato do termo permite mudar o termo no futuro sem perder o registro do que cada pessoa aceitou.

A pessoa pode desistir antes de concluir (`abandonOnboarding`). Nesse caso, a linha pendente é apagada e o convite volta a ficar pendente, para que ela possa reconsiderar.

### Perguntas do questionário

O administrador cria, edita e remove as perguntas na área de configurações (`app/projects/[id]/(tabs)/questions/actions.ts`). Cada pergunta é aberta ou de múltipla escolha, com até 20 opções. As respostas de um avaliador podem ser lidas pelo administrador em `/projects/<id>/profile-answers/<userId>`. Um avaliador não vê as respostas dos outros.

A justificativa para o questionário está em `docs/registro-do-perfil-do-avaliador.md`: saber quem avaliou ajuda a interpretar e repetir uma rodada, e diferenças de formação podem explicar uma divergência sistemática antes de alguém ser marcado como outlier.

## Visibilidade do projeto

Uma pessoa vê um projeto se tem participação ativa ou pendente nele, ou se tem convite pendente (`canViewProject` em `app/projects/project-access.ts`). Quem foi desativado deixa de ver o projeto.

## Saída e desativação

O avaliador pode sair do projeto (`leaveProject`). O administrador pode desativar um avaliador (`deactivateMember`), o que também cancela convites pendentes dessa pessoa no projeto. Nos dois casos, a participação passa a `inactive`. A linha não é apagada.

Isso é importante para o cálculo. As avaliações pertencem à participação, e não à conta, e a chave estrangeira impede apagar uma participação que tem avaliação. Desativar alguém mantém as avaliações que já entraram no cálculo, e o coeficiente da rodada não muda. A única forma de tirar alguém do cálculo é a marca de outlier, que exige justificativa (ver [concordancia-qualidade-e-revisao.md](concordancia-qualidade-e-revisao.md)).

Para trazer de volta alguém desativado, o administrador convida a pessoa de novo. Quando ela aceita, a mesma linha volta a `pending_onboarding`, e a pessoa refaz o consentimento e o questionário. As respostas novas substituem as antigas.

## Papéis acumulados

### O administrador que também avalia

O administrador pode assumir o papel de avaliador no próprio projeto (`assumeEvaluatorRole`). Isso cria uma segunda linha, de avaliador, que passa pelo mesmo consentimento e questionário de qualquer avaliador. A partir daí a pessoa tem as duas abas, de administração e de avaliação.

Ele pode desfazer esse papel (`revokeEvaluatorRole`) enquanto não tiver enviado nenhuma avaliação. Depois do primeiro envio, a linha de avaliador fica, porque as avaliações dependem dela.

A fila embaralhada e as avaliações usam o id da linha de avaliador, então os dois papéis não se misturam.

### Vários administradores

Um administrador pode dar acesso de administrador a um avaliador ativo do projeto (`grantAdminRole`). A pessoa passa a ter duas linhas ativas. As regras estão em `app/projects/admin-role.ts`:

- só um administrador dá ou tira esse acesso;
- só um avaliador ativo pode virar administrador;
- o projeto precisa de pelo menos um administrador ativo, então o último não pode ser removido.

Ao tirar o acesso de administrador de alguém (`revokeAdminRole`), a linha de administrador fica inativa. Se a pessoa ainda tem a linha de avaliador ativa, continua no projeto como avaliadora. Se não tem, perde o acesso ao projeto. A tela de confirmação avisa qual dos dois casos vai acontecer.

## Lista de membros

A aba de membros (`app/projects/[id]/(tabs)/members/`) mostra os membros agrupados por pessoa, com os papéis e o status de cada uma, os convites pendentes e o formulário de convite. Também é nessa aba que fica o painel de outliers (`outlier-panel.tsx`): o administrador escolhe uma rodada, vê quantas avaliações cada avaliador enviou nela, marca ou desmarca outliers e consulta o histórico das marcas. Como uma pessoa pode ter duas linhas, `groupMembers` em `app/projects/members.ts` junta as linhas por usuário e `aggregateStatus` escolhe o status que resume a situação dela.
