// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Falae.dev',
      htmlAttrs: {
        lang: 'pt-BR'
      },
      meta: [
        { name: 'description', content: 'Comunidade dev para compartilhar artigos, tópicos e discussões sobre tecnologia.' }
      ]
    }
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: [
    '~/assets/css/main.css',
    'katex/dist/katex.min.css'
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.falae.dev',
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com'
    }
  }
})
