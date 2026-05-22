/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITLAB_URL: string
  readonly VITE_GITLAB_GROUP_ID: string
  readonly VITE_GITLAB_TOKEN?: string
  readonly VITE_GITLAB_CLIENT_ID?: string
  readonly VITE_GITLAB_REDIRECT_URI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
