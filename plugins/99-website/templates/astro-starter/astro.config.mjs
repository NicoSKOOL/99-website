import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import site from "./src/data/site.json" with { type: "json" };

export default defineConfig({
  site: site.site_url,
  output: "static",
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "always" },
  vite: { plugins: [tailwindcss()] },
});
