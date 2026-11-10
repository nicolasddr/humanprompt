# Autorização na aplicação, e não no banco

## Decisão

As regras de autorização, como o que cada papel pode fazer e as travas de fase, são verificadas no servidor, num módulo da própria aplicação. O navegador nunca acessa o banco de dados nem o provedor do modelo. Todas as ações do usuário passam por Server Actions do Next.js.

## Por quê

A aplicação inteira é escrita em TypeScript, e assim cada regra do processo é escrita e testada uma vez só, no mesmo lugar em que é usada.

A primeira versão da ferramenta fazia parte dessa verificação no banco, com políticas de segurança por linha (RLS), gatilhos e funções no PostgreSQL. As mesmas regras acabavam escritas duas vezes, em SQL e em TypeScript, e os testes do banco eram separados dos da aplicação. As regras foram trazidas para a aplicação e o banco passou a guardar só restrições de integridade, como chaves, unicidade e valores permitidos.

Como o Supabase expõe uma API de acesso direto às tabelas, uma migração retira as permissões dessa API. Sem isso, as tabelas sem RLS ficariam acessíveis a quem tivesse a chave pública do projeto.

## Onde está no código

- [`lib/authz.ts`](../lib/authz.ts): as funções que respondem quem pode o quê, como `isProjectAdmin`, `isMemberOf`, `evaluatorMembershipId` e `canViewResponse`.
- As Server Actions de cada tela chamam essas funções antes de gravar. Exemplos: [`evaluate/actions.ts`](<../app/projects/[id]/(tabs)/evaluate/actions.ts>), [`rounds/outlier-actions.ts`](<../app/projects/[id]/(tabs)/rounds/outlier-actions.ts>) e [`app/projects/actions.ts`](../app/projects/actions.ts).
- [`lib/db/README.md`](../lib/db/README.md): explica a camada de dados e por que não há RLS.
- [`supabase/migrations/0020_revoke_data_api.sql`](../supabase/migrations/0020_revoke_data_api.sql): retira o acesso da API pública às tabelas.

## Testes

- [`lib/authz.int.test.ts`](../lib/authz.int.test.ts): cada função de autorização contra um banco real, com administrador, avaliador e alguém de fora do projeto.
- Os testes de integração das ações verificam a recusa de quem não tem permissão. Por exemplo, em [`rounds/outlier-actions.int.test.ts`](<../app/projects/[id]/(tabs)/rounds/outlier-actions.int.test.ts>), o avaliador e quem não é membro tentam marcar outlier, são barrados e nada é gravado.
