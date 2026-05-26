import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { normalizeGitlabUrl } from './gitlab.config'

function createGitlabProxy(target: string) {
  return {
    '/api/gitlab': {
      target,
      changeOrigin: true,
      secure: true,
      rewrite: (requestPath: string) => requestPath.replace(/^\/api\/gitlab/, '/api/v4'),
    },
    '/oauth/gitlab': {
      target,
      changeOrigin: true,
      secure: true,
      rewrite: (requestPath: string) => requestPath.replace(/^\/oauth\/gitlab/, ''),
    },
    '/api/graphql': {
      target,
      changeOrigin: true,
      secure: true,
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gitlabTarget = normalizeGitlabUrl(env.VITE_GITLAB_URL)
  const gitlabProxy = createGitlabProxy(gitlabTarget)

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'GitLab Monitoring Dashboard',
          short_name: 'GitLab Monitor',
          description:
            'Plataforma de monitoramento do GitLab com análise de pipelines, repositórios, deploys e indicadores de performance em tempo real',
          theme_color: '#42b883',
          icons: [
            {
              src: '/pwa-logo.png',
              sizes: '192x192',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: gitlabProxy,
    },
    preview: {
      proxy: gitlabProxy,
    },
  }
})
