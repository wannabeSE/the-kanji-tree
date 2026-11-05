// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["nuxt-auth-utils"],
  css: ["~/assets/css/main.css"],
  nitro: {
    // node:sqlite connector; the file lives in .data/db.sqlite
    experimental: { database: true },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
