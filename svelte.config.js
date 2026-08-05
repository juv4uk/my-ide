// Tauri doesn't have a Node.js server to do proper SSR
// so we use adapter-static with a fallback to index.html to put the site in SPA mode
// See: https://svelte.dev/docs/kit/single-page-apps
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // The release workflow produces a portable Web ZIP that users can open
    // directly from disk. Inline JS/CSS avoids Chromium's file:// module CORS.
    output: {
      bundleStrategy: process.env.BUILD_TARGET === "web" ? "inline" : "split",
    },
    paths: {
      relative: process.env.BUILD_TARGET === "web",
    },
    // EN: A file:// URL contains the full Windows path in its pathname. Hash
    // routing keeps that path out of SvelteKit route matching, so index.html
    // opens as the root page instead of a false 404.
    // UK: URL file:// містить повний шлях Windows у pathname. Hash-маршрутизація
    // не передає цей шлях роутеру SvelteKit, тому index.html відкривається як
    // головна сторінка, а не як хибна помилка 404.
    // DE: Eine file://-URL enthält den vollständigen Windows-Pfad im pathname.
    // Hash-Routing hält ihn aus dem SvelteKit-Routing heraus, damit index.html
    // als Startseite und nicht als falsche 404-Seite geöffnet wird.
    router: {
      type: process.env.BUILD_TARGET === "web" ? "hash" : "pathname",
    },
    adapter: adapter({
      fallback: "index.html",
    }),
  },
};

export default config;
