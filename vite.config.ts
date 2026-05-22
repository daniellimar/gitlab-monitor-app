import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
            manifest: {
                name: 'GitLab Monitoring Dashboard',
                short_name: 'GitLab Monitor',
                description: 'Plataforma de monitoramento do GitLab com análise de pipelines, repositórios, deploys e indicadores de performance em tempo real',
                theme_color: '#42b883',
                icons: [
                    {
                        src: '/pwa-logo.png',
                        sizes: '192x192',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
    },
})
