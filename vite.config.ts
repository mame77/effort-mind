import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "effort-mind — 意識を、ひとつずつ",
        short_name: "effort-mind",
        lang: "ja",
        description: "意識することを貯めて、練習の合間に振り返る",
        theme_color: "#24594c",
        background_color: "#f7f7f2",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,woff2}"] },
    }),
  ],
});
