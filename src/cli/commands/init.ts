import { Command } from "commander";
import { mkdir, writeFile, readFile, readdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import {
  getClipbotHome,
  getConfigPath,
  getDataDir,
  getDefaultOutputDir,
  getEnvPath,
} from "../../config/paths.js";
import { printBanner } from "../banner.js";

export const initCommand = new Command("init")
  .description("Set up ClipBot — creates ~/.clipbot/ with config, API keys, and data directories")
  .option("--anthropic-key <key>", "Anthropic API key")
  .option("--late-key <key>", "Late API key (optional)")
  .option("--niche <niche>", "Content niche")
  .option("--output-dir <dir>", "Output directory for clips")
  .option("--platforms <list>", "Comma-separated platforms (tiktok,youtube,instagram)")
  .option("--migrate", "Auto-migrate existing project data without prompting")
  .option("-y, --yes", "Skip interactive prompts, use defaults/flags only")
  .action(async (opts) => {
    const home = getClipbotHome();
    const nonInteractive = opts.yes || !process.stdin.isTTY;

    printBanner();
    console.log(chalk.bold(`  Setup Wizard\n`));
    console.log(`  Data directory: ${chalk.cyan(home)}\n`);

    let anthropicKey: string;
    let lateKey: string;
    let niche: string;
    let outputDir: string;
    let platforms: string[];

    if (nonInteractive) {
      // Non-interactive: use flags or defaults
      anthropicKey = opts.anthropicKey || process.env.ANTHROPIC_API_KEY || "";
      lateKey = opts.lateKey || process.env.LATE_API_KEY || "";
      niche = opts.niche || "";
      outputDir = opts.outputDir || getDefaultOutputDir();
      platforms = opts.platforms
        ? opts.platforms.split(",").map((s: string) => s.trim())
        : ["tiktok", "youtube", "instagram"];

      if (!anthropicKey) {
        console.error(chalk.red("Error: --anthropic-key is required (or set ANTHROPIC_API_KEY env var)"));
        process.exit(1);
      }
    } else {
      // Interactive: prompt user
      const inquirer = await import("inquirer");
      const answers = await inquirer.default.prompt([
        {
          type: "password",
          name: "anthropicKey",
          message: "Anthropic API key (ANTHROPIC_API_KEY):",
          mask: "*",
          validate: (v: string) => v.length > 0 || "Required for AI analysis",
        },
        {
          type: "password",
          name: "lateKey",
          message: "Late API key (optional, for publishing):",
          mask: "*",
        },
        {
          type: "input",
          name: "niche",
          message: "Content niche (e.g. cannabis, gaming, fitness):",
          default: "",
        },
        {
          type: "input",
          name: "outputDir",
          message: "Output directory for clips:",
          default: getDefaultOutputDir(),
        },
        {
          type: "checkbox",
          name: "platforms",
          message: "Default publish platforms:",
          choices: ["tiktok", "youtube", "instagram"],
          default: ["tiktok", "youtube", "instagram"],
        },
      ]);

      anthropicKey = answers.anthropicKey;
      lateKey = answers.lateKey;
      niche = answers.niche;
      outputDir = answers.outputDir || getDefaultOutputDir();
      platforms = answers.platforms;
    }

    // Create directories
    const dataDir = getDataDir();
    await mkdir(dataDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
    console.log(chalk.green(`Created ${dataDir}`));
    console.log(chalk.green(`Created ${outputDir}`));

    // Write config.json
    const config: Record<string, unknown> = {
      niche,
      outputDir,
      defaultPlatforms: platforms,
      defaultQuality: "1080",
      defaultMaxClips: 5,
      defaultMinScore: 7,
      defaultMaxDuration: 59,
      subtitles: true,
      backgroundFillStyle: "blurred-zoom",
      captionMode: "overlay",
    };

    const configPath = getConfigPath();
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
    console.log(chalk.green(`Wrote ${configPath}`));

    // Write .env
    const envLines = [`ANTHROPIC_API_KEY=${anthropicKey}`];
    if (lateKey) {
      envLines.push(`LATE_API_KEY=${lateKey}`);
    }
    const envPath = getEnvPath();
    await writeFile(envPath, envLines.join("\n") + "\n", "utf-8");
    console.log(chalk.green(`Wrote ${envPath}`));

    // Check for existing data to migrate
    const legacyDataDir = path.join(process.cwd(), "ui", "data");
    const legacyConfig = path.join(process.cwd(), "clipbot.config.json");

    if (existsSync(legacyDataDir) || existsSync(legacyConfig)) {
      let shouldMigrate = opts.migrate ?? false;

      if (!shouldMigrate && !nonInteractive) {
        const inquirer = await import("inquirer");
        const { migrate } = await inquirer.default.prompt([
          {
            type: "confirm",
            name: "migrate",
            message: "Found existing project data. Migrate to ~/.clipbot/?",
            default: true,
          },
        ]);
        shouldMigrate = migrate;
      }

      if (shouldMigrate) {
        // Migrate data files
        if (existsSync(legacyDataDir)) {
          try {
            const files = await readdir(legacyDataDir);
            for (const file of files) {
              if (file.endsWith(".json")) {
                const src = path.join(legacyDataDir, file);
                const dest = path.join(dataDir, file);
                if (!existsSync(dest)) {
                  await copyFile(src, dest);
                  console.log(chalk.yellow(`  Migrated ${file}`));
                }
              }
            }
          } catch {
            console.log(chalk.red("  Could not migrate data files"));
          }
        }

        // Migrate config
        if (existsSync(legacyConfig)) {
          try {
            const raw = await readFile(legacyConfig, "utf-8");
            const legacyCfg = JSON.parse(raw);
            const merged = { ...config, ...legacyCfg };
            await writeFile(configPath, JSON.stringify(merged, null, 2), "utf-8");
            console.log(chalk.yellow("  Merged clipbot.config.json into ~/.clipbot/config.json"));
          } catch {
            console.log(chalk.red("  Could not migrate config"));
          }
        }
      }
    }

    console.log(chalk.bold.green("\nClipBot initialized successfully!"));
    console.log(`\nNext steps:`);
    console.log(`  ${chalk.cyan("clipbot process <video-url>")}   — process a video`);
    console.log(`  ${chalk.cyan("clipbot ui")}                     — open the dashboard`);
    console.log(`  ${chalk.cyan("clipbot config")}                 — view current config\n`);
  });
