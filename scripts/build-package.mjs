#!/usr/bin/env node

/**
 * Build script for packaging ClipBot as a distributable npm CLI.
 *
 * Steps:
 * 1. Clean dist/ and ui-standalone/
 * 2. Compile CLI TypeScript → dist/
 * 3. Build Next.js UI with standalone output
 * 4. Copy standalone output → ui-standalone/
 * 5. Copy static assets and public files
 */

import { execSync } from "node:child_process";
import { cp, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const UI_DIR = path.join(ROOT, "ui");

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

async function clean(dir) {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
  await mkdir(dir, { recursive: true, dereference: true });
}

async function main() {
  console.log("=== ClipBot Package Build ===\n");

  // 1. Clean output directories
  console.log("Step 1: Cleaning dist/ and ui-standalone/...");
  await clean(path.join(ROOT, "dist"));
  await clean(path.join(ROOT, "ui-standalone"));

  // 2. Compile CLI TypeScript
  console.log("\nStep 2: Compiling CLI (tsc)...");
  run("npx tsc");

  // 3. Build Next.js UI (standalone mode)
  console.log("\nStep 3: Building Next.js UI...");
  run("npm run build", { cwd: UI_DIR });

  // 4. Copy standalone output
  const standaloneSource = path.join(UI_DIR, ".next", "standalone");
  const standaloneDest = path.join(ROOT, "ui-standalone");

  if (!existsSync(standaloneSource)) {
    console.error("ERROR: Next.js standalone output not found at", standaloneSource);
    console.error('Make sure next.config.ts has output: "standalone"');
    process.exit(1);
  }

  console.log("\nStep 4: Copying standalone server...");
  // Clean and re-copy
  await rm(standaloneDest, { recursive: true, force: true });
  await cp(standaloneSource, standaloneDest, { recursive: true, dereference: true });

  // 5. Copy static assets (Next.js standalone doesn't include them)
  // The standalone mirrors the workspace root, so the UI server is at ui-standalone/ui/
  const uiStandalone = path.join(standaloneDest, "ui");
  console.log("\nStep 5: Copying static assets...");

  const staticSource = path.join(UI_DIR, ".next", "static");
  const staticDest = path.join(uiStandalone, ".next", "static");
  if (existsSync(staticSource)) {
    await cp(staticSource, staticDest, { recursive: true, dereference: true });
  }

  const publicSource = path.join(UI_DIR, "public");
  const publicDest = path.join(uiStandalone, "public");
  if (existsSync(publicSource)) {
    await cp(publicSource, publicDest, { recursive: true, dereference: true });
  }

  console.log("\n=== Build complete! ===");
  console.log(`  CLI:        dist/cli/index.js`);
  console.log(`  Dashboard:  ui-standalone/ui/server.js`);
  console.log(`\nTo test locally:`);
  console.log(`  npm install -g .`);
  console.log(`  clipbot init`);
  console.log(`  clipbot ui`);
}

main().catch((err) => {
  console.error("\nBuild failed:", err);
  process.exit(1);
});
