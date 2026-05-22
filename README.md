# GitLab Monitor

Um painel leve para monitorar métricas do GitLab (pipelines, jobs, runners, commits e mais), construído com Vue 3, Pinia e ECharts.

Checklist do que este README cobre
- [x] Descrição rápida do projeto
- [x] Tecnologias usadas
- [x] Como instalar e executar em desenvolvimento
- [x] Configuração (variáveis de ambiente / OAuth / token)
- [x] Estrutura do projeto e onde procurar funcionalidades
- [x] Como contribuir e licenciamento

Recursos principais
- Visualização de métricas de pipelines, jobs e atividade de commits
- Autenticação via Personal Access Token (PAT) ou OAuth2 (PKCE)
- Suporte a GitLab Self-Managed via `VITE_GITLAB_URL`

Tecnologias
- Vue 3
- Pinia (estado)
- Vue Router
- Vite (tooling)
- ECharts (gráficos)
- Axios (requisições HTTP)

Pré-requisitos
- Node.js (recomenda-se v18+)
- pnpm (o repositório inclui `pnpm-lock.yaml`; `pnpm` é recomendado)

Instalação e execução (desenvolvimento)

1. Instale dependências:

```powershell
pnpm install
```

2. Execute em modo desenvolvimento:

```powershell
pnpm dev
```

Build para produção e pré-visualização:

```powershell
pnpm build
pnpm preview
```

Observação: Os scripts do projeto também funcionam com `npm`/`yarn` (por exemplo `npm run dev`), mas como o projeto possui `pnpm-lock.yaml` recomendamos `pnpm`.

Configuração / Variáveis de ambiente

O projeto usa variáveis de ambiente compatíveis com Vite (prefixadas com `VITE_`). As principais variáveis suportadas são:

- `VITE_GITLAB_URL` - URL base do GitLab (padrão: `https://gitlab.com`). Use para GitLab self-managed.
- `VITE_GITLAB_TOKEN` - Personal Access Token (PAT). Se definido, o app inicializa já autenticado usando `PRIVATE-TOKEN`.
- `VITE_GITLAB_CLIENT_ID` - Client ID da aplicação OAuth registrada no GitLab (usado para OAuth PKCE).
- `VITE_GITLAB_REDIRECT_URI` - Redirect URI configurada na aplicação OAuth (deve apontar para `OAuthCallback` do app).

Crie um arquivo `.env` ou `.env.local` na raiz do projeto com o conteúdo (exemplo):

```text
VITE_GITLAB_URL=https://gitlab.com
VITE_GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxx
# Ou para OAuth
VITE_GITLAB_CLIENT_ID=your_client_id
VITE_GITLAB_REDIRECT_URI=http://localhost:5173/oauth/callback
```

Autenticação

- Personal Access Token (PAT): na tela de login do app escolha "Personal Token" e cole o token. Scopes recomendados: `read_api` e `read_user`.
- OAuth2 (PKCE): registre uma "OAuth Application" no GitLab, configure a `redirect_uri` e defina `VITE_GITLAB_CLIENT_ID` e `VITE_GITLAB_REDIRECT_URI`. O fluxo PKCE é implementado no `src/stores/auth.ts`.

Estrutura importante do projeto

- `src/` - código fonte principal
  - `src/api/gitlab.ts` - cliente Axios configurado para a API do GitLab
  - `src/api/endpoints/` - módulos de endpoints (commits, groups, jobs, pipelines, runners)
  - `src/stores/` - stores Pinia (autenticação e métricas)
  - `src/views/` - páginas/rotas (Dashboard, Commits, Jobs, Pipelines, Runners, Login, OAuthCallback)
  - `src/components/` - componentes reutilizáveis e UI

Onde começar a desenvolver

- A página de login fica em `src/views/Login.vue`.
- O fluxo OAuth e persistência de token está em `src/stores/auth.ts`.
- O cliente HTTP central está em `src/api/gitlab.ts`.
- Rotas em `src/router/index.ts`.

Dicas de debug
- Se não conseguir autenticar com OAuth verifique a `redirect_uri` registrada na aplicação do GitLab e a variável `VITE_GITLAB_REDIRECT_URI`.
- Para chamadas à API com PAT, verifique se o token possui os scopes adequados e se `VITE_GITLAB_URL` aponta para a instância correta.

Contribuindo

1. Faça um fork e crie uma branch com a sua feature/bugfix.
2. Abra um pull request descrevendo suas mudanças.

Licença

Projeto licenciado sob a licença contida no arquivo `LICENSE`.

Contato

Se precisar de ajuda ou quiser reportar um bug, abra uma issue neste repositório.
