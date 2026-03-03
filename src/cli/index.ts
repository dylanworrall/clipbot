#!/usr/bin/env node
import { Command } from "commander";
import { processCommand } from "./commands/process.js";
import { previewCommand } from "./commands/preview.js";
import { batchCommand } from "./commands/batch.js";
import { postCommand } from "./commands/post.js";
import { accountsCommand } from "./commands/accounts.js";
import { configCommand } from "./commands/config.js";
import { initCommand } from "./commands/init.js";
import { uiCommand } from "./commands/ui.js";
import { setVerbose } from "../utils/logger.js";
import { printBanner } from "./banner.js";

const program = new Command();

program
  .name("clipbot")
  .description("Automated viral clip pipeline: Video → AI → clip → post")
  .version("1.0.0")
  .option("--verbose", "Enable debug logging")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) setVerbose(true);
  });

program.addCommand(initCommand);
program.addCommand(processCommand);
program.addCommand(previewCommand);
program.addCommand(batchCommand);
program.addCommand(postCommand);
program.addCommand(accountsCommand);
program.addCommand(configCommand);
program.addCommand(uiCommand);

// Handle no-args: show banner + help, then exit (avoids Commander's subprocess fork)
if (process.argv.length <= 2) {
  printBanner();
  program.outputHelp();
  process.exit(0);
}

program.parse();
