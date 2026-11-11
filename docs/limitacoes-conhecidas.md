# Limitações conhecidas

Este arquivo reúne o que ficou de fora do protótipo, o que funciona mas é frágil e o que está no código sem uso. Algumas limitações são escolhas de escopo, e outras são dívidas que eu resolveria numa próxima versão.

## Frágeis

### Teto de respostas em memória

O teto de chamadas à LLM por projeto (`lib/ai/quota.ts`) é contado num `Map` guardado na memória do processo do servidor. Isso tem três consequências:

- a contagem volta a zero quando o servidor reinicia;
- numa plataforma que roda várias instâncias ao mesmo tempo, como a Vercel, cada instância tem sua própria contagem;
- a tela mostra "restam N de M", e esse número pode não refletir o uso real.

O teto funciona como proteção contra um laço acidental dentro de uma mesma execução, mas não como controle de custo confiável. A correção seria guardar a contagem no banco, por exemplo contando as linhas de `responses` do projeto mais um contador para os testes de prompt.

### Geração síncrona

A geração de respostas acontece dentro da própria requisição, um item depois do outro, com até 10 itens por vez e até 60 segundos de espera por item. Numa plataforma com limite de tempo por requisição, um lote grande com a LLM lenta pode ser interrompido no meio. As respostas já gravadas ficam, porque cada uma é salva numa transação própria, mas a tela não recebe o resultado. Uma fila de tarefas em segundo plano resolveria isso.

### Migrações manuais em produção

Não há aplicação automática das migrações no deploy. Cada mudança no schema precisa de um `supabase db push`, e esquecer esse passo deixa o banco de produção atrás do código.

### Testes ponta a ponta fora da integração contínua

Os testes do Playwright precisam do Supabase local completo e de uma chave de assinatura que não está no repositório, então só rodam na máquina de desenvolvimento.

## Fora do escopo

### Exportação dos dados

Não há exportação das notas, das respostas ou das medidas para planilha. A exportação em CSV chegou a ser planejada, mas não foi implementada.

### Envio de e-mail

O convite gera uma notificação dentro da ferramenta, mas nenhum e-mail. Quem ainda não tem conta só descobre o convite se o administrador avisar por fora.

### Um só provedor de LLM

A ferramenta chama apenas a API da OpenAI, com um modelo definido por variável de ambiente para toda a instalação. Não é possível escolher o modelo por projeto nem comparar modelos diferentes dentro do mesmo projeto.

Mesmo com temperatura zero, o modelo não é perfeitamente determinístico. Duas gerações para o mesmo item com as mesmas versões podem dar textos diferentes. Por isso cada resposta guarda o texto enviado e a versão do modelo, mas a ferramenta não tem como reproduzir uma resposta antiga.

### Escala fixa

A escala de três pontos vale para todos os projetos. Tarefas que pediriam mais resolução não podem configurar outra. A escolha e o custo dela estão discutidos no TCC e em `docs/escala-fixa-de-tres-pontos.md`.

### Respostas coladas

A tabela `responses` aceita `source = 'pasted'`, prevendo respostas trazidas de fora da ferramenta, mas nenhuma tela permite isso.

### Itens e avaliadores novos na Fase 4

A Fase 4 pede itens e avaliadores que não participaram das fases anteriores, mas a ferramenta não obriga. Ela mostra em que rodadas cada item e cada avaliador já participaram, e a escolha fica com o administrador.

### Login só pelo Google

Não há login por e-mail e senha em produção. Quem não tem conta Google não consegue entrar.

## Restos de versões anteriores

- As tabelas `super_admins` e `platform_permission_requests` e o tipo de notificação `permission_decision` vêm do fluxo de permissão para criar projetos, removido em novembro de 2026. Podem sair numa migração futura.
- O comentário sobre a `DATABASE_URL` no `.env.example` ainda menciona RLS, que não existe mais.
- Alguns arquivos (`lib/db/index.ts`, `test/helpers.ts`, `supabase/seed.sql`, `app/onboarding/actions.ts`) têm comentários que citam a migração para o Drizzle, a "Fase 4 da issue #22" ou o "flip". Esses termos se referem ao plano de refatoração que tirou as regras do banco e não têm relação com as fases do processo de Shah.
