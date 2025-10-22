// packages/cli/src/commands/add.ts
import fs from "fs-extra";
import path from "path";
import { Command } from "commander";
import chalk from "chalk";
import { getConfig } from "../utils/get-config.js";
import { getTemplate } from "../utils/templates.js";

export const add = new Command()
  .name("add")
  .argument("<component>", "component name to add")
  .description("Add a UI component")
  .action(async (component) => {
    const config = await getConfig();
    if (!config) {
      console.log(chalk.red("❌ Run `mycli init` first."));
      return;
    }

    const componentCode = getTemplate(component);
    if (!componentCode) {
      console.log(chalk.red(`❌ No template found for component: ${component}`));
      return;
    }

    const outDir = path.resolve(process.cwd(), config.componentsDir);
    await fs.ensureDir(outDir);

    const filePath = path.join(outDir, `${component}.tsx`);
    if (fs.existsSync(filePath)) {
      console.log(chalk.yellow(`⚠️ ${component}.tsx already exists.`));
      return;
    }

    await fs.writeFile(filePath, componentCode);
    console.log(chalk.green(`✅ Added ${component} component to ${config.componentsDir}`));
  });

  