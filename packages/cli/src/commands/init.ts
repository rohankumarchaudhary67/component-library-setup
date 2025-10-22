// packages/cli/src/commands/init.ts
import fs from "fs-extra";
import path from "path";
import { Command } from "commander";
import chalk from "chalk";

export const init = new Command()
  .name("init")
  .description("Initialize UI config")
  .action(async () => {
    const configPath = path.resolve(process.cwd(), "myui.config.json");
    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow("⚠️ Config file already exists."));
      return;
    }

    await fs.writeJSON(configPath, { componentsDir: "components/ui" }, { spaces: 2 });
    console.log(chalk.green("✅ Config created at myui.config.json"));
  });
