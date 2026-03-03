import chalk from "chalk";

export const BANNER_RAW = `
${chalk.green(`   ██████╗██╗     ██╗██████╗ ██████╗  ██████╗ ████████╗`)}
${chalk.green(`  ██╔════╝██║     ██║██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝`)}
${chalk.green(`  ██║     ██║     ██║██████╔╝██████╔╝██║   ██║   ██║   `)}
${chalk.green(`  ██║     ██║     ██║██╔═══╝ ██╔══██╗██║   ██║   ██║   `)}
${chalk.green(`  ╚██████╗███████╗██║██║     ██████╔╝╚██████╔╝   ██║   `)}
${chalk.green(`   ╚═════╝╚══════╝╚═╝╚═╝     ╚═════╝  ╚═════╝    ╚═╝   `)}
${chalk.dim(`  ──────────────────────────────────────────────────────`)}
${chalk.white.bold(`   Video`)} ${chalk.dim(`→`)} ${chalk.cyan(`AI Analysis`)} ${chalk.dim(`→`)} ${chalk.yellow(`Clip`)} ${chalk.dim(`→`)} ${chalk.magenta(`Post`)}
${chalk.dim(`  ──────────────────────────────────────────────────────`)}
`;

const BANNER_MINI = `
${chalk.green.bold(`  ⚡ ClipBot`)} ${chalk.dim(`v1.0.0`)}
${chalk.dim(`  ──────────────────────`)}
`;

export function printBanner(): void {
  console.log(BANNER_RAW);
}

export function printBannerMini(): void {
  console.log(BANNER_MINI);
}
