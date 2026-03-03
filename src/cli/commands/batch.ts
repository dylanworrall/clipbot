import { Command } from "commander";
import { readFile } from "node:fs/promises";
import chalk from "chalk";
import { loadConfig } from "../../config/loader.js";
import { runPipeline } from "../../pipeline/runner.js";
import { isValidVideoUrl } from "../../utils/url.js";
import { log } from "../../utils/logger.js";
import type { Platform } from "../../types/config.js";

export const batchCommand = new Command("batch")
  .description("Process multiple video URLs from a file (one per line)")
  .argument("<file>", "Text file with YouTube URLs")
  .option("-n, --max-clips <n>", "Maximum clips per video", "5")
  .option("-s, --min-score <n>", "Minimum virality score", "7")
  .option("-d, --max-duration <n>", "Maximum clip duration", "59")
  .option(
    "-p, --platforms <list>",
    "Target platforms",
    "tiktok,youtube,instagram"
  )
  .option("--preview", "Generate clips but do not post")
  .option("--continue-on-error", "Skip failed videos instead of stopping")
  .option("-o, --output-dir <dir>", "Output directory")
  .option("--config <path>", "Path to config file")
  .action(async (file: string, opts) => {
    const config = await loadConfig(opts.config);

    if (!config.claudeApiKey) {
      log.error("Missing ANTHROPIC_API_KEY.");
      process.exit(1);
    }

    let content: string;
    try {
      content = await readFile(file, "utf-8");
    } catch {
      log.error(`Could not read file: ${file}`);
      process.exit(1);
    }

    const urls = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && isValidVideoUrl(line));

    if (urls.length === 0) {
      log.error("No valid video URLs found in file.");
      process.exit(1);
    }

    log.info(`Processing ${urls.length} videos...`);

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]!;
      console.log(
        `\n${chalk.bold(`[${i + 1}/${urls.length}]`)} ${url}`
      );

      try {
        await runPipeline(config, {
          url,
          maxClips: parseInt(opts.maxClips),
          minScore: parseInt(opts.minScore),
          maxDuration: parseInt(opts.maxDuration),
          platforms: (opts.platforms as string).split(",") as Platform[],
          previewOnly: opts.preview,
          outputDir: opts.outputDir,
          onStep: (step) => log.step(`${i + 1}`, step),
        });
        succeeded++;
      } catch (err) {
        failed++;
        log.error(
          `Failed: ${err instanceof Error ? err.message : String(err)}`
        );
        if (!opts.continueOnError) {
          log.error("Stopping. Use --continue-on-error to skip failures.");
          process.exit(1);
        }
      }
    }

    console.log(
      `\n${chalk.bold("Batch complete:")} ${chalk.green(`${succeeded} succeeded`)}, ${chalk.red(`${failed} failed`)}`
    );
  });
