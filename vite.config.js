import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

export default defineConfig({
  base: "/CanvasRun/",
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  }
});
