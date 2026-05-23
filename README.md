# GitLab Monitor

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue%203-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

Painel moderno e responsivo para monitorar métricas do GitLab em tempo real. Visualize pipelines, jobs, runners, commits e estatísticas de atividade com uma interface intuitiva.

## 📋 Índice

- [Recursos](#-recursos)
- [Tecnologias](#-tecnologias)
- [Quick Start (sem mise)](#-quick-start-sem-mise)
- [Configuração com mise (recomendado)](#-configuração-com-mise-recomendado)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Autenticação](#-autenticação)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Guia de Desenvolvimento](#-guia-de-desenvolvimento)
- [Troubleshooting](#-troubleshooting)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

## 🎯 Recursos

- ✅ **Dashboard em tempo real** - Visualize métricas de pipelines, jobs e runners
- ✅ **Autenticação flexível** - Suporte a Personal Access Token (PAT) e OAuth2 (PKCE)
- ✅ **GitLab Self-Managed** - Configure para sua instância privada via `VITE_GITLAB_URL`
- ✅ **Gráficos interativos** - ECharts para visualização de dados
- ✅ **Interface responsiva** - Funciona em desktop, tablet e mobile
- ✅ **Temas** - Suporte a tema claro/escuro

## 🛠️ Tecnologias

- **Frontend Framework**: Vue 3 + TypeScript
- **State Management**: Pinia
- **Routing**: Vue Router
- **Build Tool**: Vite
- **Visualização de dados**: ECharts
- **HTTP Client**: Axios
- **UI Components**: Shadcn/vue (customizados)
- **Styling**: Tailwind CSS

## 🚀 Quick Start (sem mise)

### Pré-requisitos

- Node.js v18+ 
- pnpm v9+ (recomendado; `npm` também funciona)

### Instalação

```bash
# Clone o repositório
git clone <seu-repo>
cd gitlab-monitor

# Instale dependências
pnpm install
```

### Desenvolvimento

```bash
# Servidor de desenvolvimento (localhost:5173)
pnpm dev

# Build para produção
pnpm build

# Pré-visualizar build de produção
pnpm preview
```

---

## ⚙️ Configuração com mise (recomendado)

O projeto inclui configuração via **[mise](https://mise.jdx.dev/)** para gerenciar Node.js e pnpm automaticamente, evitando conflitos de versão.

### Pré-requisitos

- [mise instalado](https://mise.jdx.dev/getting-started.html)

### Passo 1: Criar `.mise.toml`

Crie um arquivo `.mise.toml` na raiz do projeto:

```toml
[tools]
node = "22"
pnpm = "10"
```

### Passo 2: Ativar as ferramentas

```bash
# Instala as versões especificadas
mise install

# Ativa o ambiente (adiciona ao PATH)
mise use
```

### Passo 3: Habilitar pnpm (primeira vez)

```bash
# Ativa o corepack
mise exec -- corepack enable

# Prepara pnpm v10
mise exec -- corepack prepare pnpm@10 --activate
```

### Passo 4: Instalar dependências e executar

```bash
# Instala dependências do projeto
mise exec -- pnpm install

# Inicia servidor de desenvolvimento
mise exec -- pnpm dev

# Ou, se você já ativou com 'mise use', basta:
pnpm dev
```

### ⏱️ Alias úteis (opcional)

Adicione ao seu `.bashrc`, `.zshrc` ou similar:

```bash
alias mdev='mise exec -- pnpm dev'
alias mbuild='mise exec -- pnpm build'
alias minstall='mise exec -- pnpm install'
```

---

## 🔐 Variáveis de Ambiente

O projeto usa variáveis Vite (prefixadas com `VITE_`). Crie um arquivo `.env.local` ou `.env.development.local` na raiz:

### Exemplo `.env.local`

```bash
# GitLab URL — use sempre https:// (http://gitlab.com causa erro de CORS no browser)
VITE_GITLAB_URL=https://gitlab.com

# Proxy no Vite (dev e preview) — evita bloqueio CORS nas chamadas à API
VITE_USE_API_PROXY=true

# Opção 1: Personal Access Token
VITE_GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxx

# Opção 2: OAuth2 (configure uma OAuth App no GitLab)
VITE_GITLAB_CLIENT_ID=your-app-client-id
VITE_GITLAB_REDIRECT_URI=http://localhost:5173/oauth/callback
```

### Para GitLab Self-Managed

```bash
VITE_GITLAB_URL=https://seu-gitlab.com
VITE_GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxx
```

---

## 🔑 Autenticação

### 1️⃣ Personal Access Token (PAT) — Recomendado para desenvolvimento local

1. Vá a **GitLab** → **Settings** → **Access Tokens**
2. Crie um novo token com escopos: `read_api`, `read_user`, `read_repository`
3. Copie o token e defina em `.env.local`:
   ```bash
   VITE_GITLAB_TOKEN=glpat-xxxxx
   ```
4. O app carregará já autenticado na inicialização

### 2️⃣ OAuth2 (PKCE) — Para ambientes multi-usuário

1. Em GitLab, vá a **Admin Panel** → **Applications** (ou **Settings** → **Integrations** → **OAuth2 applications**)
2. Crie uma nova aplicação com:
   - **Redirect URI**: `http://localhost:5173/oauth/callback` (ajuste conforme sua URL)
   - **Scopes**: `read_api`, `read_user`, `read_repository`
3. Copie o **Client ID**
4. Configure em `.env.local`:
   ```bash
   VITE_GITLAB_CLIENT_ID=your-client-id
   VITE_GITLAB_REDIRECT_URI=http://localhost:5173/oauth/callback
   ```
5. Na tela de login, escolha "Entrar com GitLab"

---

## 📁 Estrutura do Projeto

```
src/
├── api/
│   ├── gitlab.ts              # Cliente Axios + autenticação (PAT/OAuth)
│   ├── utils.ts               # Helpers (paginação, fetch em lote)
│   └── endpoints/
│       ├── commits.ts
│       ├── groups.ts
│       ├── jobs.ts
│       ├── pipelines.ts
│       └── runners.ts
├── composables/
│   └── useMetricsRefresh.ts   # Carregamento e auto-refresh de métricas
├── utils/
│   ├── gitlabStatus.ts        # Ícones/variantes de status CI
│   ├── runnerStatus.ts        # Status de runners
│   └── stats/                 # Cálculo de métricas agregadas
├── assets/styles/main.css
├── components/
│   ├── layout/
│   ├── metrics/
│   └── ui/
├── router/
├── stores/
├── types/
├── views/
│   ├── Projects.vue
│   ├── Users.vue
├── App.vue
└── main.ts
```

---

## 🎓 Guia de Desenvolvimento

### Entendendo o fluxo de autenticação

1. **Inicialização** (`src/main.ts` → `src/stores/auth.ts`):
   - Se `VITE_GITLAB_TOKEN` está definido, usa PAT (síncrono)
   - Caso contrário, tenta restaurar OAuth do localStorage
   
2. **Login** (`src/views/Login.vue`):
   - PAT: salva token diretamente no store
   - OAuth: redireciona para GitLab com PKCE challenge

3. **Callback OAuth** (`src/views/OAuthCallback.vue`):
   - Valida `state` CSRF
   - Troca `code` por token com o GitLab
   - Salva token no localStorage com validade

### Adicionando um novo endpoint

1. Crie um arquivo em `src/api/endpoints/seu-endpoint.ts`:

```typescript
import gitlabClient from '../gitlab'

export async function fetchMeuDado(projectId: string) {
  const response = await gitlabClient.instance.get(
    `/projects/${projectId}/seu-endpoint`
  )
  return response.data
}
```

2. Use em um componente:

```typescript
import { fetchMeuDado } from '@/api/endpoints/seu-endpoint'

const dados = ref([])
onMounted(async () => {
  dados.value = await fetchMeuDado(projectId.value)
})
```

### Debugging na aba Network

- Abra DevTools (F12) → **Network** tab
- Toda requisição à API do GitLab aparecerá aqui
- Verifique o header `PRIVATE-TOKEN` ou `Authorization`

---

## 🐛 Troubleshooting

### ❌ `injectScript.js` / "Cannot assign to read only property 'open'"

**Não é do GitLab Monitor.** Esse arquivo vem de **extensão do navegador** (bloqueador de anúncios, antivírus, tradutor, etc.) que injeta código na página.

**Como confirmar**: abra o app em janela anônima sem extensões, ou desative extensões uma a uma. O erro deve sumir.

### ❌ Aviso PWA "Banner not shown... preventDefault()"

O app não intercepta mais o prompt de instalação. Para instalar como PWA, use o menu do navegador (ícone de instalar na barra de endereço ou "Instalar aplicativo").

### ❌ CORS / "Redirect is not allowed for a preflight request"

**Causa**: O browser chama a API do GitLab diretamente (`localhost` → `gitlab.com`). Isso falha porque:
1. `http://gitlab.com` redireciona para HTTPS e o preflight OPTIONS não pode seguir redirect.
2. O GitLab não expõe CORS para origens locais com headers como `PRIVATE-TOKEN`.

**Solução**:
1. No `.env`, use `VITE_GITLAB_URL=https://gitlab.com` (com **https**).
2. Ative o proxy: `VITE_USE_API_PROXY=true`
3. Use `npm run dev` ou `npm run preview` (o proxy está no Vite, não no build estático servido por outro servidor).
4. Após alterar `.env`, reinicie o servidor ou rode `npm run build` de novo antes do `preview`.

Em produção (sem Vite), configure um reverse proxy (nginx/Caddy) de `/api/gitlab` para o seu GitLab.

### ❌ "OAuth não configurado"

**Solução**: Configure `VITE_GITLAB_CLIENT_ID` e `VITE_GITLAB_REDIRECT_URI` no `.env.local`

### ❌ "Erro 401 Unauthorized"

**Causas possíveis**:
- Token expirado ou inválido
- Scopes insuficientes (adicione `read_api` ao token)
- URL do GitLab errada em `VITE_GITLAB_URL`

**Solução**: Vá a Settings → Access Tokens, revise e regenere se necessário

### ❌ OAuth redirect inválido

**Problema**: "redirect_uri_mismatch"

**Solução**: Verifique se a `redirect_uri` registrada em **GitLab** → **Applications** bate exatamente com `VITE_GITLAB_REDIRECT_URI` (incluindo protocolo e porta)

Exemplo:
- Configurada: `http://localhost:5173/oauth/callback`
- Variável deve ser: `VITE_GITLAB_REDIRECT_URI=http://localhost:5173/oauth/callback`

### ❌ Porta 5173 já em uso

```bash
# Mudar porta
pnpm dev -- --port 5174

# Ou ver qual processo usa a porta (Windows)
netstat -ano | findstr :5173
```

### ❌ "Cannot find module" ao instalar

**Solução**:
```bash
# Limpe cache
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📝 Contribuindo

1. **Fork** e crie uma branch: `git checkout -b feature/minha-feature`
2. **Commit** suas mudanças: `git commit -m 'Adiciona nova feature'`
3. **Push**: `git push origin feature/minha-feature`
4. **Abra um Pull Request** com descrição clara

### Padrões do projeto

- **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`)
- **Branches**: `feature/`, `bugfix/`, `docs/` como prefixo
- **Code style**: O projeto usa TypeScript + ESLint (ajuste conforme seu setup)

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

## 💬 Contato & Suporte

- 📌 **Issues**: Abra uma [issue](../../issues) para bugs e sugestões
- 💡 **Discussões**: Dúvidas? Abra uma [discussion](../../discussions)

---

## 📚 Recursos úteis

- [GitLab API Docs](https://docs.gitlab.com/ee/api/)
- [Vue 3 Guide](https://vuejs.org/guide/)
- [Pinia Docs](https://pinia.vuejs.org/)
- [Vite Docs](https://vitejs.dev/guide/)
- [mise Docs](https://mise.jdx.dev/)
