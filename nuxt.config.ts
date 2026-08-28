// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@pinia/nuxt', '@nuxt/eslint'],
  typescript: {
    strict: true,
    typeCheck: true
  },
  css: ['~/assets/styles/main.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/styles/_variables.scss" as *;'
        }
      }
    }
  },
  app: {
    head: {
      title: 'Заметки',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  }
})
