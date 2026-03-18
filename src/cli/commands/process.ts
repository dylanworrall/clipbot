import { Command } from "commander";
import ora from "ora";
import Table from "cli-table3";
import chalk from "chalk";
import { loadConfig } from "../../config/loader.js";
import { runPipeline } from "../../pipeline/runner.js";
import { isValidVideoUrl } from "../../utils/url.js";
import { formatBytes } from "../../utils/fs.js";
import { log } from "../../utils/logger.js";
import { printBannerMini } from "../banner.js";
import type { Platform } from "../../types/config.js";

export const processCommand = new Command("process")
  .description("Download, analyze, clip, and post a video")
  .argument("<url>", "Video URL (YouTube, Twitch, Kick, etc.)")
  .option("-q, --quality <quality>", "Video download quality", "1080")
  .option("-n, --max-clips <n>", "Maximum clips to generate", "5")
  .option("-s, --min-score <n>", "Minimum virality score (1-10)", "7")
  .option("-d, --max-duration <n>", "Maximum clip duration (seconds)", "59")
  .option(
    "-p, --platforms <list>",
    "Target platforms (comma-separated)",
    "tiktok,youtube,instagram"
  )
  .option("--preview", "Analyze only, do not clip or post")
  .option("--no-post", "Generate clips but do not post")
  .option("-o, --output-dir <dir>", "Output directory")
  .option("--run-id <id>", "Override the run ID (used by UI)")
  .option("--niche <niche>", "Content niche for AI analysis")
  .option("--no-subtitles", "Disable subtitle/caption burning")
  .option("--bg-style <style>", "Background fill style: center-crop, blurred-zoom, mirror-reflection, split-fill")
  .option("--caption-style <json>", "Caption style as base64-encoded JSON")
  .option("--scoring-weights <json>", "Scoring weights as base64-encoded JSON")
  .option("--caption-mode <mode>", "Caption mode: overlay (live captions) or burn-in (baked into video)")
  .option("--config <path>", "Path to config file")
  .action(async (url: string, opts) => {
    printBannerMini();

    if (!isValidVideoUrl(url)) {
      log.error("Invalid URL. Provide a valid video link.");
      process.exit(1);
    }

    const config = await loadConfig(opts.config);
    if (opts.niche) config.niche = opts.niche;
    if (opts.subtitles === false) config.subtitles = false;
    if (opts.captionMode) config.captionMode = opts.captionMode;

    if (!config.claudeApiKey) {
      log.error("Missing API key. Set GOOGLE_GENERATIVE_AI_API_KEY in .env or environment.");
      process.exit(1);
    }

    const spinner = ora("Starting pipeline...").start();

    try {
      // Parse caption style from base64 JSON if provided
      let captionStyle;
      if (opts.captionStyle) {
        try {
          captionStyle = JSON.parse(Buffer.from(opts.captionStyle, "base64").toString("utf-8"));
        } catch {
          log.warn("Invalid --caption-style JSON, using defaults");
        }
      }

      // Parse scoring weights from base64 JSON if provided
      let scoringWeights;
      if (opts.scoringWeights) {
        try {
          scoringWeights = JSON.parse(Buffer.from(opts.scoringWeights, "base64").toString("utf-8"));
        } catch {
          log.warn("Invalid --scoring-weights JSON, using defaults");
        }
      }

      const result = await runPipeline(config, {
        url,
        runId: opts.runId,
        quality: opts.quality,
        maxClips: parseInt(opts.maxClips),
        minScore: parseInt(opts.minScore),
        maxDuration: parseInt(opts.maxDuration),
        platforms: (opts.platforms as string).split(",") as Platform[],
        previewOnly: opts.preview,
        skipPublish: opts.post === false,
        outputDir: opts.outputDir,
        backgroundFillStyle: opts.bgStyle,
        captionStyle,
        scoringWeights,
        onStep: (step) => {
          spinner.text = step;
        },
      });

      spinner.stop();

      // Display results
      if (result.moments.length === 0) {
        log.warn("No viral moments found above the score threshold.");
        return;
      }

      // Moments table
      const momentsTable = new Table({
        head: [
          chalk.cyan("#"),
          chalk.cyan("Title"),
          chalk.cyan("Time"),
          chalk.cyan("Duration"),
          chalk.cyan("Score"),
          chalk.cyan("Category"),
        ],
      });

      for (const m of result.moments) {
        const startMin = Math.floor(m.startSeconds / 60);
        const startSec = Math.round(m.startSeconds % 60);
        momentsTable.push([
          m.index,
          m.title.slice(0, 40),
          `${startMin}:${String(startSec).padStart(2, "0")}`,
          `${m.durationSeconds}s`,
          m.viralityScore >= 8
            ? chalk.green(m.viralityScore)
            : chalk.yellow(m.viralityScore),
          m.category,
        ]);
      }

      console.log("\n" + chalk.bold("Viral Moments Found:"));
      console.log(momentsTable.toString());

      // Clips table
      if (result.clips.length > 0) {
        const clipsTable = new Table({
          head: [
            chalk.cyan("#"),
            chalk.cyan("File"),
            chalk.cyan("Size"),
            chalk.cyan("Duration"),
          ],
        });

        for (const c of result.clips) {
          clipsTable.push([
            c.momentIndex,
            c.filePath.split(/[\\/]/).pop(),
            formatBytes(c.fileSizeBytes),
            `${c.durationSeconds.toFixed(1)}s`,
          ]);
        }

        console.log("\n" + chalk.bold("Clips Created:"));
        console.log(clipsTable.toString());
      }

      // Posts table
      if (result.posts.length > 0) {
        console.log("\n" + chalk.bold("Published:"));
        for (const p of result.posts) {
          for (const pl of p.platforms) {
            const icon = pl.status === "published" ? chalk.green("✔") : chalk.red("✖");
            console.log(`  ${icon} Clip ${p.clipIndex} → ${pl.platform}: ${pl.status}`);
          }
        }
      }

      console.log(
        `\n${chalk.bold("Output:")} ${result.state.id} → ${opts.outputDir ?? config.outputDir}`
      );
    } catch (err) {
      spinner.fail(
        `Pipeline failed: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  });
