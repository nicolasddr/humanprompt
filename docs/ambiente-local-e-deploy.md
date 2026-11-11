# Ambiente local e deploy

## Pré-requisitos

- Node.js 22 (é a versão usada na integração contínua)
- Docker Desktop, aberto
- Supabase CLI
- Um projeto Supabase com login pelo Google configurado, para usar o login real
- Uma chave da OpenAI, para gerar respostas

## Instalação

```bash
npm install
```

```bash
supabase start
```

O `supabase start` sobe os containers do Supabase local, aplica as migrações de `supabase/migrations/` e roda o `supabase/seed.sql`. O PostgreSQL fica na porta 54322, a API do Supabase na 54321 e o Studio (interface de administração do banco) na 54323.

Para recriar o banco do zero:

```bash
supabase db reset
```

## Variáveis de ambiente

O modelo está em `.env.example`. O arquivo de verdade é o `.env.local`, que não vai para o repositório.

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endereço do Supabase (Auth). Vai para o navegador. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública do Supabase. Vai para o navegador. |
| `DATABASE_URL` | Conexão direta com o PostgreSQL. No local, `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Em produção, a URL do pooler de transações do Supabase (porta 6543). |
| `OPENAI_API_KEY` | Chave da OpenAI. Só no servidor; nunca com o prefixo `NEXT_PUBLIC_`. |
| `OPENAI_MODEL` | Modelo. Vazio usa `gpt-5.5`. |
| `OPENAI_TIMEOUT_MS` | Tempo máximo de espera da LLM. Vazio usa 60000. |
| `LLM_PROJECT_RESPONSES_MAX` | Teto de respostas de LLM por projeto. Vazio usa 200. |

### Dois arranjos de desenvolvimento

**Auth hospedado e banco local.** É o arranjo do `.env.local`. O login usa o Google de verdade, pelo projeto Supabase hospedado, e os dados ficam no PostgreSQL local. Funciona porque o perfil não tem chave estrangeira para `auth.users`: o id vem do Auth hospedado e o perfil é criado no banco local no primeiro login.

```bash
npm run dev
```

**Tudo local.** É o arranjo do `.env.test.local` (modelo em `.env.test.example`), usado pelos testes ponta a ponta e pela rota `/dev/login`. Auth e banco ficam no Supabase local, e o login é feito por senha com uma conta de teste, sem Google.

```bash
npm run dev:local
```

Esse comando sobe o app na porta 3100. Abrindo `http://localhost:3100/dev/login`, a sessão é criada e o navegador vai para o painel. As chaves do `.env.test.local` precisam ser copiadas da saída de `supabase status`, porque são geradas por instalação.

### Desenvolvimento sem chave da OpenAI

Sem `OPENAI_API_KEY`, a geração de respostas falha com a mensagem de chave recusada. Para ver as telas que dependem da LLM sem gastar chamadas, uma saída é carregar, via `NODE_OPTIONS=--require`, um script que substitui o `fetch` para o endereço da OpenAI e devolve uma resposta fixa.

## Mudanças no banco

O fluxo está em [banco-de-dados.md](banco-de-dados.md): editar `lib/db/schema.ts`, gerar a migração com `drizzle-kit generate`, conferir o SQL e aplicar com `supabase db reset` no local.

## Produção

A aplicação roda na Vercel e o banco no Supabase hospedado.

**Migrações.** Não há aplicação automática. Toda migração nova precisa ser enviada com `supabase db push`. Já aconteceu duas vezes de o banco de produção ficar atrás do local porque o `db reset` local foi feito e o `db push` esquecido, então vale conferir com `supabase migration list` depois de cada mudança no schema.

**Conexão.** A `DATABASE_URL` de produção usa o pooler de transações (porta 6543). Por isso o cliente é criado com `prepare: false`.

**Região.** A função da Vercel precisa estar na mesma região do banco. Com as duas em continentes diferentes, cada navegação levava cerca de um segundo a mais, só pela distância entre servidor e banco.

**Login.** O endereço `https://<domínio>/auth/callback` precisa estar na lista de URLs de redirecionamento do Supabase, e o domínio precisa estar autorizado no cliente OAuth do Google.

**Login de desenvolvimento.** A rota `/dev/login` fica inerte em produção: ela exige Supabase local e modo de desenvolvimento, e responde 404 fora disso.

**API de dados do Supabase.** A migração `0020_revoke_data_api.sql` precisa estar aplicada em produção. Sem ela, a API REST do Supabase daria acesso às tabelas a quem tivesse a chave pública.

## Scripts do `package.json`

| Script | O que faz |
|---|---|
| `dev` | Sobe o Next em modo de desenvolvimento, com webpack |
| `dev:local` | Igual, mas com o `.env.test.local` e na porta 3100 |
| `build` | Gera a versão de produção |
| `start` | Roda a versão de produção |
| `lint` | ESLint |
| `typecheck` | Verificação de tipos do TypeScript, sem gerar arquivos |
| `test`, `test:unit`, `test:int` | Vitest |
| `test:e2e` | Playwright |
| `db:reset` | `supabase db reset` |

O repositório não usa Prettier. Rodar o Prettier sem configuração reformataria arquivos inteiros.
