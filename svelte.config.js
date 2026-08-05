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
    adapter: adapter({
      fallback: "index.html",
    }),
  },
};

export default config;
