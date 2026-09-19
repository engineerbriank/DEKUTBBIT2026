// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: {
          id: "/",
          name: "DEKUT BBIT 2026 · Digital Student Platform",
          short_name: "BBIT 2026",
          description:
            "Notes, past papers, assignments, timetables, study groups and class updates for DEKUT BBIT students.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          theme_color: "#0b1f33",
          background_color: "#ffffff",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,png,svg,ico,webp,woff2}"],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/__l5e\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // HTML navigations: always try the network first so data stays fresh.
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-navigations",
                networkTimeoutSeconds: 5,
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // Same-origin static build assets only.
              urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
                sameOrigin && /\/(assets|_build)\//.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts" },
            },
          ],
        },
      }),
    ],
  },
});
