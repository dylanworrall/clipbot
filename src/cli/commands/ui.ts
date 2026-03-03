import { Command } from "commander";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import {
  getClipbotHome,
  getDataDir,
  getDefaultOutputDir,
  getPackageRoot,
  getStandaloneDir,
} from "../../config/paths.js";
import { printBanner } from "../banner.js";

export const uiCommand = new Command("ui")
  .description("Launch the ClipBot dashboard")
  .option("-p, --port <port>", "Port to run on", "3000")
  .option("--hostname <host>", "Hostname to bind to", "localhost")
  .action(async (opts) => {
    const dataDir = getDataDir();
    const outputDir = getDefaultOutputDir();

    // Ensure data directory exists
    await mkdir(dataDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    const standaloneDir = getStandaloneDir();
    const standaloneServer = path.join(standaloneDir, "server.js");

    const env = {
      ...process.env,
      CLIPBOT_HOME: getClipbotHome(),
      CLIPBOT_CLI_ROOT: getPackageRoot(),
      CLIPBOT_OUTPUT_DIR: outputDir,
      CLIPBOT_PRODUCTION: "1",
      PORT: opts.port,
      HOSTNAME: opts.hostname,
    };

    if (existsSync(standaloneServer)) {
      // Production: run the pre-built standalone Next.js server
      printBanner();
      console.log(`  ${chalk.bold(`Dashboard`)} ${chalk.dim(`→`)} ${chalk.cyan(`http://${opts.hostname}:${opts.port}`)}\n`);

      const child = spawn("node", [standaloneServer], {
        cwd: standaloneDir,
        stdio: "inherit",
        env,
      });

      child.on("error", (err) => {
        console.error(chalk.red(`Failed to start dashboard: ${err.message}`));
        process.exit(1);
      });

      child.on("exit", (code) => {
        process.exit(code ?? 0);
      });
    } else {
      // Dev fallback: run next dev from the ui/ directory
      const uiDir = path.join(getPackageRoot(), "ui");
      if (!existsSync(path.join(uiDir, "package.json"))) {
        console.error(chalk.red("No standalone build found and no ui/ directory available."));
        console.error("Run `npm run build:package` first, or run from the source repo.");
        process.exit(1);
      }

      printBanner();
      console.log(`  ${chalk.bold(`Dashboard`)} ${chalk.yellow(`[dev]`)} ${chalk.dim(`→`)} ${chalk.cyan(`http://${opts.hostname}:${opts.port}`)}\n`);

      // In dev mode, don't set CLIPBOT_PRODUCTION
      const devEnv: Record<string, string | undefined> = { ...env };
      devEnv.CLIPBOT_PRODUCTION = undefined;

      const child = spawn("npx", ["next", "dev", "-p", opts.port, "-H", opts.hostname], {
        cwd: uiDir,
        stdio: "inherit",
        shell: true,
        env: devEnv,
      });

      child.on("error", (err) => {
        console.error(chalk.red(`Failed to start dashboard: ${err.message}`));
        process.exit(1);
      });

      child.on("exit", (code) => {
        process.exit(code ?? 0);
      });
    }
  });
