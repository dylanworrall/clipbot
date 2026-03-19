/**
 * Bundle Soshi connector tools into a single CommonJS file.
 * Output: dist/tools.js — require()-able, no tsx, no temp files.
 *
 * Usage: node build-tools.mjs
 */
import { build } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(__dirname, "src/lib/ai/tools/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: resolve(__dirname, "dist/tools.js"),
  // Resolve @/ path alias
  alias: {
    "@": resolve(__dirname, "src"),
  },
  // Keep zod external — sidecar already has it
  external: ["zod"],
  // Inline everything else (store modules, utils, etc.)
  minify: false,
  sourcemap: true,
});

console.log("✔ Built dist/tools.js");
