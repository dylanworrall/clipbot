import { Command } from "commander";
import ora from "ora";
import Table from "cli-table3";
import chalk from "chalk";
import { loadConfig } from "../../config/loader.js";
import { fetchTranscript, formatTranscriptForPrompt } from "../../modules/transcript.js";
import { analyzeTranscript } from "../../modules/analyzer.js";
import { isValidVideoUrl } from "../../utils/url.js";
import { log } from "../../utils/logger.js";

export const previewCommand = new Command("preview")
  .description("Analyze a video for viral moments (no download or clipping)")
  .argument("<url>", "Video URL")
  .option("-n, --max-clips <n>", "Maximum moments to find", "10")
  .option("-s, --min-score <n>", "Minimum virality score", "5")
  .option("-d, --max-duration <n>", "Maximum clip duration", "59")
  .option("--json", "Output as JSON")
  .option("--config <path>", "Path to config file")
  .action(async (url: string, opts) => {
    if (!isValidVideoUrl(url)) {
      log.error("Invalid URL. Provide a valid video link.");
      process.exit(1);
    }

    const config = await loadConfig(opts.config);

    if (!config.claudeApiKey) {
      log.error("Missing ANTHROPIC_API_KEY. Set it in .env or environment.");
      process.exit(1);
    }

    const spinner = ora("Fetching transcript...").start();

    try {
      const { segments } = await fetchTranscript(url);

      spinner.text = "Analyzing with Claude...";

      const formatted = formatTranscriptForPrompt(segments);
      const moments = await analyzeTranscript(formatted, "Video", config.claudeApiKey, {
        model: config.claudeModel,
        maxClips: parseInt(opts.maxClips),
        minScore: parseInt(opts.minScore),
        maxDuration: parseInt(opts.maxDuration),
      });

      spinner.stop();

      if (opts.json) {
        console.log(JSON.stringify(moments, null, 2));
        return;
      }

      if (moments.length === 0) {
        log.warn("No viral moments found above the score threshold.");
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan("#"),
          chalk.cyan("Title"),
          chalk.cyan("Start"),
          chalk.cyan("End"),
          chalk.cyan("Duration"),
          chalk.cyan("Score"),
          chalk.cyan("Category"),
          chalk.cyan("Hook"),
        ],
      });

      for (const m of moments) {
        const startMin = Math.floor(m.startSeconds / 60);
        const startSec = Math.round(m.startSeconds % 60);
        const endMin = Math.floor(m.endSeconds / 60);
        const endSec = Math.round(m.endSeconds % 60);

        table.push([
          m.index,
          m.title.slice(0, 30),
          `${startMin}:${String(startSec).padStart(2, "0")}`,
          `${endMin}:${String(endSec).padStart(2, "0")}`,
          `${m.durationSeconds}s`,
          m.viralityScore >= 8
            ? chalk.green(m.viralityScore)
            : m.viralityScore >= 6
              ? chalk.yellow(m.viralityScore)
              : chalk.red(m.viralityScore),
          m.category,
          m.hookText.slice(0, 25),
        ]);
      }

      console.log(`\n${chalk.bold(`Found ${moments.length} viral moments:`)}`);
      console.log(table.toString());

      // Show hashtags
      console.log(`\n${chalk.bold("Suggested Hashtags:")}`);
      for (const m of moments) {
        console.log(
          `  ${chalk.cyan(`#${m.index}`)} ${m.hashtags.map((h) => `#${h}`).join(" ")}`
        );
      }
    } catch (err) {
      spinner.fail(
        `Preview failed: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  });
